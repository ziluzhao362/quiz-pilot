import type { Question, QuizConfig, QuizResult } from './types';

/** ---------- 基线矩（解析，非模拟） ---------- */

export interface Moments {
  mean: Record<string, number>;
  sd: Record<string, number>;
}

export function dimIds(cfg: QuizConfig): string[] {
  return cfg.dims.map((d) => d.id);
}

export function computeMoments(questions: Question[], dims: string[]): Moments {
  const mean = Object.fromEntries(dims.map((d) => [d, 0]));
  const variance = Object.fromEntries(dims.map((d) => [d, 0]));
  for (const q of questions) {
    for (const d of dims) {
      const vals = q.options.map((o) => (o.scores[d] ?? 0) * q.weight);
      const mq = vals.reduce((a, b) => a + b, 0) / vals.length;
      mean[d] += mq;
      variance[d] += vals.reduce((a, b) => a + (b - mq) ** 2, 0) / vals.length;
    }
  }
  const sd = Object.fromEntries(dims.map((d) => [d, Math.sqrt(variance[d])]));
  return { mean, sd };
}

/** 六维加权原始分 */
export function rawSums(questions: Question[], answers: number[], dims: string[]): Record<string, number> {
  const sums = Object.fromEntries(dims.map((d) => [d, 0]));
  questions.forEach((q, i) => {
    const opt = q.options[answers[i]];
    if (!opt) return;
    for (const d of dims) sums[d] += (opt.scores[d] ?? 0) * q.weight;
  });
  return sums;
}

/** 六维显示值：V = clamp(round(50×(1+z/3)), 0, 100) */
export function displayValues(
  questions: Question[],
  answers: number[],
  dims: string[],
  moments?: Moments,
): Record<string, number> {
  const mm = moments ?? computeMoments(questions, dims);
  const sums = rawSums(questions, answers, dims);
  const out: Record<string, number> = {};
  for (const d of dims) {
    const z = (sums[d] - mm.mean[d]) / mm.sd[d];
    out[d] = Math.max(0, Math.min(100, Math.round(50 * (1 + z / 3))));
  }
  return out;
}

/** ---------- 大字报指数 ---------- */

export interface HeadlineMoments {
  meanC: number;
  sdC: number;
  /** corr(z_d, C)，风格去相关用 */
  corr: Record<string, number>;
}

/** C = Σ w_d·z_d 的解析矩 + 各维与 C 的解析相关（逐题协方差求和） */
export function headlineMoments(questions: Question[], dims: string[], weights: Record<string, number>): HeadlineMoments {
  // 每维逐题矩
  const mq: Record<string, number[]> = {};
  for (const d of dims) {
    mq[d] = questions.map((q) => {
      const vals = q.options.map((o) => (o.scores[d] ?? 0) * q.weight);
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    });
  }
  let meanC = 0;
  let varC = 0;
  const covDC: Record<string, number> = Object.fromEntries(dims.map((d) => [d, 0]));
  const varZ: Record<string, number> = Object.fromEntries(dims.map((d) => [d, 0]));
  const mm = computeMoments(questions, dims);
  questions.forEach((q, qi) => {
    // 该题选项在各维上的 z 化贡献与组合贡献
    const perOpt = q.options.map((o) => {
      const zs: Record<string, number> = {};
      for (const d of dims) zs[d] = ((o.scores[d] ?? 0) * q.weight - mq[d][qi]) / mm.sd[d];
      const c = dims.reduce((a, d) => a + weights[d] * ((o.scores[d] ?? 0) * q.weight), 0);
      return { zs, c };
    });
    const meanCq = perOpt.reduce((a, p) => a + p.c, 0) / perOpt.length;
    meanC += meanCq;
    for (const p of perOpt) varC += (p.c - meanCq) ** 2 / perOpt.length;
    for (const d of dims) {
      // 该维在该题上的（去均值）贡献 与 组合（去均值）贡献的协方差
      const sdD = mm.sd[d];
      for (const p of perOpt) {
        const zd = ((p.zs[d] ?? 0) * sdD) / sdD; // = zs[d]（已是标准分）
        covDC[d] += ((zd * (p.c - meanCq)) / perOpt.length) * sdD; // 还原到原始分尺度
        varZ[d] += (p.zs[d] ** 2) / perOpt.length;
      }
    }
  });
  const sdC = Math.sqrt(varC);
  const corr: Record<string, number> = {};
  for (const d of dims) {
    // corr(z_d, C) = cov(z_d, C) / (1 × sdC)；z_d 方差在足够多的题下 ≈1，用实际累计更稳
    const sdZ = Math.sqrt(varZ[d]);
    corr[d] = covDC[d] / (sdZ * sdC);
  }
  return { meanC, sdC, corr };
}

export function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

/** 大字报指数：H = clamp(round(50×(1+z_C/3)), 0, 100) */
export function headlineScore(
  questions: Question[],
  answers: number[],
  dims: string[],
  weights: Record<string, number>,
  hm?: HeadlineMoments,
): number {
  const m = hm ?? headlineMoments(questions, dims, weights);
  const sums = rawSums(questions, answers, dims);
  let c = 0;
  for (const d of dims) c += weights[d] * sums[d];
  const zC = (c - m.meanC) / m.sdC;
  return Math.max(0, Math.min(100, Math.round(50 * (1 + zC / 3))));
}

/** 未取整的 z_C（风格去相关用） */
export function headlineZ(
  questions: Question[],
  answers: number[],
  dims: string[],
  weights: Record<string, number>,
  hm: HeadlineMoments,
): number {
  const sums = rawSums(questions, answers, dims);
  let c = 0;
  for (const d of dims) c += weights[d] * sums[d];
  return (c - m0(hm)) / hm.sdC;
}
function m0(hm: HeadlineMoments) {
  return hm.meanC;
}

/** ---------- 分带 ---------- */

export function bandOf(cfg: QuizConfig, six: Record<string, number>, headline: number): string {
  if (cfg.customBandOf) return cfg.customBandOf(six, headline);
  for (const b of cfg.bands) {
    if (headline >= b.min && headline <= b.max) return b.id;
  }
  return cfg.bands[cfg.bands.length - 1].id;
}

/** ---------- 风格判定：对大字报组合分去相关后 argmax ---------- */

export function pickStyle(
  questions: Question[],
  answers: number[],
  dims: string[],
  styleDims: string[],
  weights: Record<string, number>,
  hm: HeadlineMoments,
  mm: Moments,
): string {
  const sums = rawSums(questions, answers, dims);
  let c = 0;
  for (const d of dims) c += weights[d] * sums[d];
  const zC = (c - hm.meanC) / hm.sdC;
  let best = styleDims[0];
  let bestAdj = -Infinity;
  for (const d of styleDims) {
    const z = (sums[d] - mm.mean[d]) / mm.sd[d];
    const adj = z - hm.corr[d] * zC;
    if (adj > bestAdj) {
      bestAdj = adj;
      best = d;
    }
  }
  return cfg_styleId(best);
}
/** style id 直接复用 dim id */
function cfg_styleId(d: string): string {
  return d;
}

/** ---------- DNA：六维显示值 top-2 ---------- */

export function topTwoDims(six: Record<string, number>, dims: string[]): { d1: string; d2: string } {
  const sorted = [...dims].sort((a, b) => six[b] - six[a] || dims.indexOf(a) - dims.indexOf(b));
  return { d1: sorted[0], d2: sorted[1] };
}

export function pairKey(a: string, b: string): string {
  return [a, b].sort().join('+');
}

/** ---------- 反差卡 ---------- */

/**
 * outer = Part 1–3 的大字报指数，inner = Part 4 的大字报指数（子集矩各自重算）。
 * 标签按 Δ = inner − outer 与两值落带组合。
 */
export function contrastLabelId(outer: number, inner: number): string {
  const delta = inner - outer;
  const mid = (x: number) => x >= 34 && x <= 66;
  if (mid(outer) && mid(inner)) return 'consistent';
  if (delta >= 16) return 'much_higher_inside';
  if (delta >= 8) return 'higher_inside';
  if (delta <= -16) return 'much_lower_inside';
  if (delta <= -8) return 'lower_inside';
  if (!mid(outer) && !mid(inner) && Math.sign(outer - 50) === Math.sign(inner - 50))
    return outer >= 50 ? 'both_high' : 'both_low';
  return 'tilted';
}

/** ---------- 分享码（v2 + 测评标识） ---------- */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** 格式：'2' + codeTag + 24×(6bit 题号 + 2bit 选项) → 共 34 字符 */
export function encodeAnswers(questionIds: string[], answers: number[], codeIds: string[], codeTag: string): string {
  let bits = '';
  questionIds.forEach((id, i) => {
    const idx = codeIds.indexOf(id);
    if (idx < 0 || idx > 63) throw new Error(`题目 ${id} 不在编码表中`);
    bits += idx.toString(2).padStart(6, '0');
    const a = answers[i];
    bits += (Number.isInteger(a) && a >= 0 && a <= 3 ? a : 0).toString(2).padStart(2, '0');
  });
  let out = '2' + codeTag;
  for (let k = 0; k < bits.length; k += 6) {
    out += ALPHABET[parseInt(bits.slice(k, k + 6).padEnd(6, '0'), 2)];
  }
  return out;
}

export function decodeAnswers(
  code: string,
  codeIds: string[],
  codeTag: string,
): { questionIds: string[]; answers: number[] } | null {
  if (!code || code[0] !== '2' || code[1] !== codeTag) return null;
  const s = code.slice(2);
  if (s.length % 4 !== 0) return null;
  const count = (3 * s.length) / 4;
  if (count !== 24) return null;
  let bits = '';
  for (const ch of s) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) return null;
    bits += idx.toString(2).padStart(6, '0');
  }
  const questionIds: string[] = [];
  const answers: number[] = [];
  for (let i = 0; i < count; i++) {
    const byte = bits.slice(8 * i, 8 * i + 8);
    const qid = codeIds[parseInt(byte.slice(0, 6), 2)];
    if (!qid) return null;
    questionIds.push(qid);
    answers.push(parseInt(byte.slice(6), 2));
  }
  return { questionIds, answers };
}

/** ---------- 完整结果 ---------- */

const hmCache = new Map<string, HeadlineMoments>();
const mmCache = new Map<string, Moments>();

export function computeResult(cfg: QuizConfig, answers: number[]): QuizResult {
  const dims = dimIds(cfg);
  let mm = mmCache.get(cfg.id);
  if (!mm) {
    mm = computeMoments(cfg.bank, dims);
    mmCache.set(cfg.id, mm);
  }
  let hm = hmCache.get(cfg.id);
  if (!hm) {
    hm = headlineMoments(cfg.bank, dims, cfg.headlineWeights);
    hmCache.set(cfg.id, hm);
  }
  const six = displayValues(cfg.bank, answers, dims, mm);
  const headline = headlineScore(cfg.bank, answers, dims, cfg.headlineWeights, hm);
  const bandId = bandOf(cfg, six, headline);
  const styleId = pickStyle(cfg.bank, answers, dims, cfg.styleDims, cfg.headlineWeights, hm, mm);
  const { d1, d2 } = topTwoDims(six, dims);

  const idx13 = cfg.bank.map((_, i) => i).filter((i) => cfg.bank[i].part <= 3);
  const idx4 = cfg.bank.map((_, i) => i).filter((i) => cfg.bank[i].part === 4);
  const q13 = idx13.map((i) => cfg.bank[i]);
  const q4 = idx4.map((i) => cfg.bank[i]);
  const outer = headlineScore(q13, idx13.map((i) => answers[i]), dims, cfg.headlineWeights);
  const inner = headlineScore(q4, idx4.map((i) => answers[i]), dims, cfg.headlineWeights);

  const band = cfg.bands.find((b) => b.id === bandId);
  return {
    headline,
    bandId,
    bandLabel: band?.label ?? bandId,
    personaId: `${bandId}_${styleId}`,
    styleId,
    six,
    dna: { d1, d2, v1: six[d1], v2: six[d2] },
    contrast: { outer, inner, labelId: contrastLabelId(outer, inner) },
  };
}

/** 统计条「X%」：本地模拟分布（正态 CDF，均值/σ 由 config 平均指数推） */
export function pctSimulated(headline: number, avg: number, sigma = 18): number {
  const z = (headline - avg) / (sigma * Math.SQRT2);
  const t = 1 / (1 + 0.3275911 * Math.abs(z));
  const erf =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-z * z);
  const cdf = 50 * (1 + (z < 0 ? -erf : erf));
  return Math.round(cdf);
}

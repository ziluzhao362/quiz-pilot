import { describe, expect, it } from 'vitest';
import { QUIZ, codeIds } from '../src/quizzes';
import type { QuizConfig } from '../src/engine/types';
import {
  computeMoments,
  computeResult,
  decodeAnswers,
  encodeAnswers,
  headlineMoments,
  pairKey,
} from '../src/engine/score';

const cfg = QUIZ;
const CONTRAST_KEYS = [
  'consistent',
  'much_higher_inside',
  'higher_inside',
  'much_lower_inside',
  'lower_inside',
  'both_high',
  'both_low',
  'tilted',
];

describe('config 结构校验', () => {
  it('题库 24 题 × 4 选项，part 均衡，权重合法', () => {
    expect(cfg.bank.length).toBe(24);
    for (const p of [1, 2, 3, 4]) {
      expect(cfg.bank.filter((q) => q.part === p).length).toBe(6);
    }
    for (const q of cfg.bank) {
      expect(q.options.length).toBe(4);
      expect(q.weight).toBeGreaterThanOrEqual(1);
      expect(q.weight).toBeLessThanOrEqual(1.6);
      for (const o of q.options) expect(o.text.trim().length).toBeGreaterThan(0);
    }
  });

  it('六维定义 + 4 风格维 + 权重全覆盖', () => {
    expect(cfg.dims.length).toBe(6);
    expect(new Set(cfg.dims.map((d) => d.id)).size).toBe(6);
    expect(cfg.styleDims.length).toBe(4);
    for (const d of cfg.dims) {
      expect(cfg.headlineWeights[d.id]).toBeDefined();
      expect(cfg.headlineWeights[d.id]).not.toBe(0);
      const count = cfg.bank.filter((q) => q.options.some((o) => (o.scores[d.id] ?? 0) > 0)).length;
      expect(count, `维度 ${d.id} 覆盖题数`).toBeGreaterThanOrEqual(4);
    }
  });

  it('类型网格全覆盖（band × style）', () => {
    for (const b of cfg.bands) {
      for (const s of cfg.styleDims) {
        const p = cfg.personas[`${b.id}_${s}`];
        expect(p, `缺 ${b.id}_${s}`).toBeDefined();
        expect(p.hashtags.length).toBe(3);
      }
    }
  });

  it('副型 15 对 + 反差标签 8 类 + premium 14 章', () => {
    const ids = cfg.dims.map((d) => d.id);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        expect(cfg.subtypes[pairKey(ids[i], ids[j])], `缺副型 ${ids[i]}+${ids[j]}`).toBeDefined();
      }
    }
    for (const k of CONTRAST_KEYS) {
      expect(cfg.contrast.labels[k], `缺反差标签 ${k}`).toBeDefined();
    }
    expect(cfg.premium.chapters.length).toBe(14);
    expect(cfg.targets.length).toBeGreaterThanOrEqual(4);
    expect(cfg.calcPhrases.length).toBeGreaterThanOrEqual(5);
    expect(cfg.codeTag.length).toBe(1);
  });
});

describe('引擎行为', () => {
  it('极端作答确定性 + 结果字段合法', () => {
    for (const a of [0, 1, 2, 3]) {
      const answers = new Array(24).fill(a);
      const r1 = computeResult(cfg, answers);
      const r2 = computeResult(cfg, answers);
      expect(r1.headline).toBe(r2.headline);
      expect(r1.headline).toBeGreaterThanOrEqual(0);
      expect(r1.headline).toBeLessThanOrEqual(100);
      expect(cfg.personas[r1.personaId], `落在未定义类型 ${r1.personaId}`).toBeDefined();
      expect(cfg.contrast.labels[r1.contrast.labelId]).toBeDefined();
      expect(r1.dna.v1).toBeGreaterThanOrEqual(r1.dna.v2);
      for (const d of cfg.dims) {
        expect(r1.six[d.id]).toBeGreaterThanOrEqual(0);
        expect(r1.six[d.id]).toBeLessThanOrEqual(100);
      }
    }
  });

  it('编码往返 + 错误 tag/脏码拒绝', () => {
    const ids = codeIds(cfg);
    const answers = Array.from({ length: 24 }, (_, i) => (i * 5 + 1) % 4);
    const code = encodeAnswers(ids, answers, ids, cfg.codeTag);
    expect(code.length).toBe(34);
    expect(code.startsWith('2' + cfg.codeTag)).toBe(true);
    const dec = decodeAnswers(code, ids, cfg.codeTag)!;
    expect(dec.answers).toEqual(answers);
    expect(decodeAnswers('1' + code.slice(1), ids, cfg.codeTag)).toBeNull();
    expect(decodeAnswers(code.slice(0, -1), ids, cfg.codeTag)).toBeNull();
    const wrongTag = cfg.codeTag === 'n' ? 'z' : 'n';
    expect(decodeAnswers(code, ids, wrongTag)).toBeNull(); // 本测评的码带本 tag，用别的 tag 解必须失败
  });

  it('极端作答之间 headline 有区分度', () => {
    const gaps = [0, 1, 2, 3].map((a) => computeResult(cfg, new Array(24).fill(a)).headline);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeGreaterThanOrEqual(20);
  });

  it('解析矩稳定（同输入同输出）', () => {
    const dims = cfg.dims.map((d) => d.id);
    const a = headlineMoments(cfg.bank, dims, cfg.headlineWeights);
    const b = headlineMoments(cfg.bank, dims, cfg.headlineWeights);
    expect(a.meanC).toBe(b.meanC);
    expect(a.sdC).toBe(b.sdC);
    expect(computeMoments(cfg.bank, dims)).toEqual(computeMoments(cfg.bank, dims));
  });
});

/**
 * Quiz Lab 泛化测评引擎 —— 配置驱动。
 * 架构沿用 loveage-rebuild 的逆向规格（z 分数标准化 / tanh 族曲线 / 分带 / 风格去相关 / v2 分享码），
 * 但每个测评的维度、题库、大字报公式、分带阈值、类型网格全部由 config 注入。
 *
 * 与 loveage 的差异（自有设计，无 oracle 约束）：
 *  - 大字报为 0–100 指数：H = clamp(round(50×(1+z_C/3)), 0, 100)，C 为六维 z 的加权和，
 *    所有基线矩均为解析计算（C 对原始加权分是线性的，逐题矩求和即得精确 μ/σ，无模拟）。
 *  - 风格判定：adjusted_d = z_d − corr(z_d, C)·z_C（全解析去相关，取 4 个风格维的 argmax）。
 */

export interface DimDef {
  id: string;
  label: string; // 六维展示名
  indexLabel?: string; // 四指数展示名（若为风格维）
  desc: string; // 一句话解释
}

export interface QuestionOption {
  text: string;
  scores: Partial<Record<string, number>>;
}

export interface Question {
  id: string;
  part: 1 | 2 | 3 | 4;
  type: 'conversation' | 'instinct' | 'event';
  weight: number;
  scenario: string;
  prompt: string;
  options: QuestionOption[];
}

export interface BandDef {
  id: string;
  label: string;
  /** 大字报指数落带阈值：score >= min && score <= max */
  min: number;
  max: number;
}

export interface PersonaDef {
  name: string;
  tagline: string;
  hashtags: [string, string, string];
  oneLiner: string;
  oneLinerNote: string;
}

export interface TargetDef {
  id: string;
  label: string;
  emoji: string;
  chatName: string;
}

export interface ThemeDef {
  /** tailwind 安全类名所需的 CSS 变量值 */
  bg: string;
  accent: string;
  accentDeep: string;
  accentSoft: string;
}

export interface QuizConfig {
  id: string;
  slug: string; // 路由 /neihao 等
  codeTag: string; // 分享码第 2 位标识，1 字符
  title: string;
  tagline: string;
  headlineLabel: string; // 例：内耗指数
  headlineUnit: string; // 例：点
  headlineDesc: (score: number, bandLabel: string) => string;
  dims: DimDef[]; // 恰好 6 个
  styleDims: string[]; // 恰好 4 个 dim id
  /** 大字报组合权重（六维全覆盖，键为 dim id） */
  headlineWeights: Record<string, number>;
  bands: BandDef[]; // 恰好 3 档（依恋为 4 型，用 customBandOf）
  /** 依恋等测评可自定义分带（用六维值而非大字报阈值） */
  customBandOf?: (six: Record<string, number>, headline: number) => string;
  styleOf?: never; // 固定用去相关 argmax
  bank: Question[]; // 恰好 24 题
  personas: Record<string, PersonaDef>; // key = `${bandId}_${styleId}`
  bandWord: Record<string, string>; // bandId → 带名（用于类型命名展示）
  styleWord: Record<string, string>; // styleId → 风格名
  subtypes: Record<string, { name: string; desc: string }>; // 维度对 key（排序后 join('+')）
  contrast: {
    title: string;
    outerLabel: string; // 例：别人眼中的你
    outerSub: string;
    innerLabel: string; // 例：深夜独处时的你
    innerSub: string;
    labels: Record<string, { label: string; desc: string }>; // key 见 contrastLabel()
  };
  premium: { title: string; subtitle: string; chapters: string[]; price: string };
  stats: { completions: number; avgIndex: number };
  targets: TargetDef[];
  targetPrompt: string;
  calcPhrases: string[];
  theme: ThemeDef;
  startEmoji: string;
}

export interface QuizResult {
  headline: number; // 0-100
  bandId: string;
  bandLabel: string;
  personaId: string;
  styleId: string;
  six: Record<string, number>;
  dna: { d1: string; d2: string; v1: number; v2: number };
  contrast: { outer: number; inner: number; labelId: string };
}

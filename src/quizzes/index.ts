import type { QuizConfig } from '../engine/types';
import { NEIHAO } from './neihao';

export const QUIZ: QuizConfig = NEIHAO;

export function codeIds(cfg: QuizConfig): string[] {
  return cfg.bank.map((q) => q.id);
}

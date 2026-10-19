import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { QUIZ, codeIds } from '@/quizzes';
import { encodeAnswers } from '@/engine/score';
import type { Question, QuizConfig } from '@/engine/types';

const PART_META: Record<number, { title: string; subtitle: string; emoji: string }> = {
  1: { title: '热热身', subtitle: '先从最近的你开始。', emoji: '🌤️' },
  2: { title: '日常状态', subtitle: '进入你熟悉的场景。', emoji: '🏠' },
  3: { title: '突发时刻', subtitle: '事情不照计划走的时候。', emoji: '⛈️' },
  4: { title: '最深处的你', subtitle: '这一段最关键，慢慢选。', emoji: '🌙' },
};

const OPTION_COLORS = ['#E15A7A', '#A8761A', '#2E7D5B', '#6A5FA8'];

function QuestionCard({
  q,
  chatName,
  selected,
  onSelect,
  accent,
}: {
  q: Question;
  chatName: string;
  selected: number | undefined;
  onSelect: (i: number) => void;
  accent: string;
}) {
  const isChat = q.type === 'conversation';
  return (
    <div key={q.id}>
      {isChat ? (
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-full border-2 border-[#F0D9DE] bg-white text-[15px]">
              💬
            </span>
            <span className="text-[13px] font-extrabold text-[#8C7080]">{chatName}</span>
          </div>
          <div className="relative ml-2 mt-2.5 max-w-[92%]">
            <span className="absolute -left-[7px] top-[20px] size-3.5 rotate-45 rounded-[3px] border-b-2 border-l-2 border-[#F0D9DE] bg-white" />
            <div className="relative z-[1] rounded-[1.4rem] border-2 border-[#F0D9DE] bg-white px-4 py-3 text-[1.05rem] leading-[1.7] text-[#4A3540] shadow-[3px_4px_0_#F0D9DE]">
              {q.scenario}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-[1.3rem] font-extrabold leading-[1.55] tracking-tight text-[#4A3540]">
          {q.scenario}
        </p>
      )}
      <p className={`text-[14px] font-extrabold text-[#B49BA6] ${isChat ? 'mt-5' : 'mt-4'}`}>
        {q.prompt}
      </p>
      <div className="mt-3 space-y-3">
        {q.options.map((o, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-pressed={selected === i}
            className="w-full rounded-[1.25rem] border-2 border-[#F0D9DE] bg-white px-4 py-3.5 text-left text-[15px] font-bold leading-relaxed text-[#4A3540] shadow-[0_4px_0_#F0D9DE] transition active:translate-y-[4px] active:shadow-none"
            style={selected === i ? { borderColor: accent, background: accent + '18' } : undefined}
          >
            <span
              className="mr-3 inline-grid size-6 shrink-0 place-items-center rounded-full border-2 align-middle text-[12px] font-extrabold"
              style={
                selected === i
                  ? { borderColor: accent, background: accent, color: '#fff' }
                  : { borderColor: OPTION_COLORS[i], color: OPTION_COLORS[i] }
              }
            >
              {'ABCD'[i]}
            </span>
            {o.text}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function QuizFlow() {
  const cfg: QuizConfig = QUIZ;
  const nav = useNavigate();
  const [params] = useSearchParams();
  const nickname = params.get('n') ?? '';
  const target = params.get('r') ?? '';

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [stage, setStage] = useState<'part' | 'question' | 'calculating'>('part');
  const [calcStep, setCalcStep] = useState(0);
  const lock = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => clearTimeout(lock.current ?? undefined), []);

  useEffect(() => {
    if (stage !== 'calculating' || !cfg) return;
    if (calcStep >= cfg.calcPhrases.length) {
      const code = encodeAnswers(
        cfg.bank.map((q) => q.id),
        answers,
        codeIds(cfg),
        cfg.codeTag,
      );
      const p = new URLSearchParams();
      p.set('a', code);
      if (nickname) p.set('n', nickname);
      if (target) p.set('r', target);
      const t = setTimeout(() => nav(`/result?${p.toString()}`, { replace: true }), 520);
      return () => clearTimeout(t);
    }
    const t = setTimeout(
      () => setCalcStep((s) => s + 1),
      calcStep === cfg.calcPhrases.length - 1 ? 880 : 620,
    );
    return () => clearTimeout(t);
  }, [stage, calcStep, cfg, answers, nickname, target, nav]);

  const t = cfg.theme;
  const q = cfg.bank[index];
  const TOTAL = cfg.bank.length;
  const chatName = cfg.targets.find((x) => x.id === target)?.chatName ?? '对方';

  const select = (choice: number) => {
    if (lock.current) return;
    const next = [...answers];
    next[index] = choice;
    setAnswers(next);
    lock.current = setTimeout(() => {
      lock.current = null;
      if (index + 1 >= TOTAL) {
        setStage('calculating');
        return;
      }
      const nextQ = cfg.bank[index + 1];
      setIndex(index + 1);
      if (nextQ.part !== q.part) setStage('part');
    }, 230);
  };

  if (stage === 'calculating') {
    return (
      <div
        className="flex min-h-dvh flex-col items-center justify-center px-6 text-center"
        style={{ background: t.bg }}
      >
        <div className="text-[72px]">{cfg.startEmoji}</div>
        <div className="mt-8 min-h-[9rem] w-full max-w-[320px] space-y-2">
          {cfg.calcPhrases.slice(0, calcStep).map((p, i) => (
            <p
              key={p}
              className={`transition-all duration-500 ${
                i === cfg.calcPhrases.length - 1
                  ? 'text-[1.15rem] font-extrabold text-[#4A3540]'
                  : i === calcStep - 1
                    ? 'text-[15px] font-bold text-[#4A3540]'
                    : 'text-[15px] text-[#B49BA6] opacity-45'
              }`}
            >
              {p}
            </p>
          ))}
        </div>
        <div className="mt-2 flex gap-1.5">
          {cfg.calcPhrases.map((_, i) => (
            <span key={i} className="text-[11px]" style={{ color: i < calcStep ? t.accent : '#F0D9DE' }}>
              ♥
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (stage === 'part') {
    const meta = PART_META[q.part];
    return (
      <div
        className="flex min-h-dvh flex-col items-center justify-center px-8 text-center"
        style={{ background: t.bg }}
      >
        <div className="text-[64px]">{meta.emoji}</div>
        <p
          className="mt-6 text-[13px] font-extrabold tracking-[0.3em]"
          style={{ color: t.accent }}
        >
          PART {q.part}
        </p>
        <h2 className="mt-3 text-[2rem] font-extrabold tracking-tight text-[#4A3540]">
          {meta.title}
        </h2>
        <p className="mt-3 text-[15px] text-[#8C7080]">{meta.subtitle}</p>
        <button
          type="button"
          onClick={() => setStage('question')}
          className="mt-9 rounded-[1.35rem] px-12 py-4 font-extrabold text-white transition active:translate-y-[5px]"
          style={{ background: t.accent, boxShadow: `0 5px 0 ${t.accentDeep}` }}
        >
          继续
        </button>
      </div>
    );
  }

  const progress = Math.round(((index + 1) / TOTAL) * 100);
  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col justify-center px-5 py-10"
      style={{ background: t.bg }}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="上一题"
          onClick={() => {
            if (index === 0) return nav(`/`);
            setIndex(index - 1);
            setStage('question');
          }}
          className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-[#F0D9DE] bg-white text-[#8C7080] shadow-[0_3px_0_#F0D9DE] transition active:translate-y-[3px] active:shadow-none"
        >
          ←
        </button>
        <div className="flex flex-1 items-center gap-2.5">
          <div className="relative h-3.5 flex-1 overflow-hidden rounded-full border-2 border-[#F0D9DE] bg-white">
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%`, background: t.accent }}
            />
          </div>
          <span className="text-[13px] font-extrabold tabular-nums text-[#8C7080]">
            {index + 1}/{TOTAL}
          </span>
        </div>
      </div>
      <div className="mt-9">
        <QuestionCard q={q} chatName={chatName} selected={answers[index]} onSelect={select} accent={t.accent} />
      </div>
    </main>
  );
}

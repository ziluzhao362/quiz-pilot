import { useState } from 'react';
import { useNavigate } from 'react-router';
import { QUIZ } from '@/quizzes';

/** 测评落地页：昵称 + 场景选择 + 开始 */
export default function QuizLanding() {
  const cfg = QUIZ;
  const nav = useNavigate();
  const [nickname, setNickname] = useState('');
  const [target, setTarget] = useState(cfg?.targets[0].id ?? '');

  const t = cfg.theme;

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col justify-center px-5 py-10"
      style={{ background: t.bg }}
    >
      <div className="text-center">
        <div className="text-[64px] leading-none">{cfg.startEmoji}</div>
        <h1 className="mt-5 text-[1.9rem] font-extrabold tracking-tight text-[#4A3540]">
          {cfg.title}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#8C7080]">{cfg.tagline}</p>
      </div>

      <div className="mt-8 rounded-[1.75rem] border-2 border-[#F0D9DE] bg-white p-5 shadow-[0_5px_0_#F0D9DE]">
        <label className="text-[13px] font-extrabold text-[#B49BA6]">昵称（可跳过）</label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value.slice(0, 12))}
          placeholder="例如：小熊"
          maxLength={12}
          className="mt-2 w-full rounded-[1.1rem] border-2 border-[#F0D9DE] bg-white px-4 py-3.5 text-[1.05rem] outline-none transition focus:border-[#E15A7A]"
        />
        <p className="mt-5 text-[13px] font-extrabold text-[#B49BA6]">{cfg.targetPrompt}</p>
        <div className="mt-2 grid grid-cols-2 gap-2.5">
          {cfg.targets.map((tg) => (
            <button
              key={tg.id}
              type="button"
              onClick={() => setTarget(tg.id)}
              className="flex items-center gap-2 rounded-[1.1rem] border-2 px-3.5 py-3 text-left text-[14.5px] font-extrabold transition active:translate-y-[2px]"
              style={{
                borderColor: target === tg.id ? t.accent : '#F0D9DE',
                background: target === tg.id ? t.accentSoft : '#fff',
                color: target === tg.id ? t.accentDeep : '#8C7080',
              }}
            >
              <span className="text-[1.15rem]">{tg.emoji}</span>
              {tg.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => nav(`/quiz?n=${encodeURIComponent(nickname)}&r=${target}`)}
          className="mt-6 w-full rounded-[1.35rem] py-4 text-[1.05rem] font-extrabold text-white transition active:translate-y-[5px]"
          style={{ background: t.accent, boxShadow: `0 5px 0 ${t.accentDeep}` }}
        >
          开始测验 →
        </button>
      </div>
      <p className="mt-6 text-center text-[12px] text-[#B49BA6]">
        心理娱乐测验，结果仅供参考
      </p>
    </main>
  );
}

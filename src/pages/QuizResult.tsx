import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { QUIZ, codeIds } from '@/quizzes';
import { computeResult, decodeAnswers, pairKey, pctSimulated } from '@/engine/score';
import type { QuizConfig, QuizResult } from '@/engine/types';

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setValue(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[1.75rem] border-2 border-[#F0D9DE] bg-white p-5 shadow-[0_5px_0_#F0D9DE] ${className}`}>
      {children}
    </section>
  );
}

function DimBar({
  label,
  value,
  accent,
  color,
}: {
  label: string;
  value: number;
  accent?: boolean;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`w-20 shrink-0 text-[13px] font-extrabold ${accent ? '' : 'text-[#8C7080]'}`} style={accent ? { color } : undefined}>
        {label}
      </span>
      <div className="relative h-3 flex-1 overflow-hidden rounded-full border-2 border-[#F0D9DE] bg-white">
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, background: accent ? color : '#DDD6F3' }}
        />
      </div>
      <span className="w-8 text-right text-[13px] font-extrabold tabular-nums text-[#4A3540]">{value}</span>
    </div>
  );
}

function ResultBody({ cfg, result, nickname }: { cfg: QuizConfig; result: QuizResult; nickname: string }) {
  const t = cfg.theme;
  const shown = useCountUp(result.headline);
  const persona = cfg.personas[result.personaId];
  const subtype = cfg.subtypes[pairKey(result.dna.d1, result.dna.d2)];
  const contrast = cfg.contrast.labels[result.contrast.labelId];
  const pct = pctSimulated(result.headline, cfg.stats.avgIndex);
  const dimLabel = Object.fromEntries(cfg.dims.map((d) => [d.id, d.label]));
  const styleDimSet = new Set(cfg.styleDims);

  if (!persona) return <p className="p-10 text-center">结果数据异常：{result.personaId}</p>;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[560px] px-5 py-10" style={{ background: t.bg }}>
      {/* 大字报 */}
      <div className="pt-4 text-center">
        <p className="text-[14px] font-extrabold text-[#B49BA6]">
          {nickname ? `${nickname} 的` : '你的'}{cfg.headlineLabel}
        </p>
        <p className="mt-1 text-[6rem] font-extrabold leading-none tabular-nums text-[#4A3540]">
          {shown}
          <span className="text-[1.6rem]">{cfg.headlineUnit}</span>
        </p>
        <p
          className="mt-3 inline-block rounded-full border-2 px-4 py-1 text-[13px] font-extrabold"
          style={{ borderColor: t.accent + '73', background: t.accentSoft, color: t.accentDeep }}
        >
          {result.bandLabel}
        </p>
        <h1 className="mt-4 text-[1.9rem] font-extrabold tracking-tight text-[#4A3540]">
          {persona.name}
        </h1>
        <p className="mt-1.5 text-[14px] font-extrabold text-[#8C7080]">副型｜{subtype?.name}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {persona.hashtags.map((h) => (
            <span
              key={h}
              className="rounded-full border-2 px-3 py-1 text-[12px] font-extrabold"
              style={{ borderColor: '#F0D9DE', background: '#FFF8E8', color: '#A8761A' }}
            >
              {h}
            </span>
          ))}
        </div>
        <p className="mt-4 text-[14px] leading-relaxed text-[#8C7080]">{persona.tagline}</p>
        <p className="mt-2 text-[13px] text-[#B49BA6]">
          {cfg.headlineDesc(result.headline, result.bandLabel)}
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <Card className="text-center">
          <p className="text-[13px] font-extrabold text-[#B49BA6]">最像你的一句话</p>
          <p className="mt-2 text-[1.3rem] font-extrabold text-[#4A3540]">{persona.oneLiner}</p>
          <p className="mt-1 text-[13px] text-[#8C7080]">翻译：{persona.oneLinerNote}</p>
        </Card>

        {/* DNA 双维卡 */}
        <Card>
          <p className="text-center text-[13px] font-extrabold text-[#B49BA6]">你的主导组合</p>
          <div className="mt-3 flex items-center justify-center gap-3">
            {[
              { dim: result.dna.d1, v: result.dna.v1 },
              { dim: result.dna.d2, v: result.dna.v2 },
            ].map(({ dim, v }, i) => (
              <div key={dim} className="flex items-center gap-3">
                {i === 1 && <span className="text-[1.2rem] font-extrabold text-[#B49BA6]">×</span>}
                <div
                  className="rounded-[1.25rem] border-2 px-4 py-3 text-center"
                  style={{ borderColor: t.accent + '73', background: t.accentSoft }}
                >
                  <p className="text-[12.5px] font-extrabold text-[#8C7080]">{dimLabel[dim]}</p>
                  <p className="text-[1.8rem] font-extrabold tabular-nums" style={{ color: t.accentDeep }}>
                    {v}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[15px] font-extrabold text-[#4A3540]">{subtype?.name}</p>
          <p className="mt-1 text-center text-[13px] leading-relaxed text-[#8C7080]">{subtype?.desc}</p>
        </Card>

        {/* 反差卡 */}
        <Card>
          <p className="text-center text-[13px] font-extrabold text-[#B49BA6]">{cfg.contrast.title}</p>
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="rounded-[1.25rem] border-2 border-[#F0D9DE] bg-white p-3 text-center">
              <p className="text-[12px] font-extrabold text-[#B49BA6]">{cfg.contrast.outerLabel}</p>
              <p className="mt-1 text-[1.7rem] font-extrabold tabular-nums text-[#4A3540]">
                {result.contrast.outer}
              </p>
              <p className="text-[11px] text-[#B49BA6]">{cfg.contrast.outerSub}</p>
            </div>
            <span className="text-[13px] font-extrabold text-[#B49BA6]">VS</span>
            <div
              className="rounded-[1.25rem] border-2 p-3 text-center"
              style={{ borderColor: t.accent + '73', background: t.accentSoft }}
            >
              <p className="text-[12px] font-extrabold" style={{ color: t.accentDeep }}>
                {cfg.contrast.innerLabel}
              </p>
              <p className="mt-1 text-[1.7rem] font-extrabold tabular-nums" style={{ color: t.accentDeep }}>
                {result.contrast.inner}
              </p>
              <p className="text-[11px]" style={{ color: t.accentDeep + 'B3' }}>
                {cfg.contrast.innerSub}
              </p>
            </div>
          </div>
          <p className="mt-3 text-center text-[15px] font-extrabold text-[#4A3540]">{contrast?.label}</p>
          <p className="mt-1 text-center text-[13px] leading-relaxed text-[#8C7080]">{contrast?.desc}</p>
        </Card>

        {/* 统计条（本地模拟数据） */}
        <Card className="text-center">
          <p className="text-[13.5px] leading-relaxed text-[#8C7080]">
            目前 <b className="tabular-nums text-[#4A3540]">{cfg.stats.completions.toLocaleString()}</b> 人完成测验，
            平均{cfg.headlineLabel} <b className="text-[#4A3540]">{cfg.stats.avgIndex}</b> {cfg.headlineUnit}。
            <br />
            你的指数高于 <b className="text-[1.15rem] tabular-nums" style={{ color: t.accentDeep }}>{pct}%</b> 的模拟用户。
          </p>
          <p className="mt-2 text-[11px] text-[#B49BA6]">※ 以上为本地模拟数据，非真实统计</p>
        </Card>

        {/* 风格指数（4 个风格维） */}
        <Card>
          <p className="text-[13px] font-extrabold text-[#B49BA6]">你的风格指数</p>
          <div className="mt-3 space-y-2.5">
            {cfg.styleDims.map((d) => {
              const def = cfg.dims.find((x) => x.id === d)!;
              const isStyle = d === result.styleId;
              return (
                <div key={d}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <p className="text-[13px] font-extrabold text-[#4A3540]">
                      {def.indexLabel ?? def.label}
                      {isStyle && (
                        <span
                          className="ml-2 rounded-full px-2 py-0.5 text-[10.5px] font-extrabold text-white"
                          style={{ background: t.accent }}
                        >
                          你的型
                        </span>
                      )}
                    </p>
                    <p className="text-[12px] text-[#B49BA6]">{def.desc}</p>
                  </div>
                  <DimBar label="" value={result.six[d]} accent={isStyle} color={t.accent} />
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed text-[#B49BA6]">
            指数是跟「随机作答」基准比出来的相对位置，50 代表刚好在中间。标着「你的型」的那一项决定你的相处风格——它不一定是数字最高的，因为比较之前已先扣掉指数的共同成分。
          </p>
        </Card>

        {/* 六维 */}
        <Card>
          <p className="text-[13px] font-extrabold text-[#B49BA6]">六维画像</p>
          <div className="mt-3 space-y-2.5">
            {cfg.dims.map((d) => (
              <DimBar
                key={d.id}
                label={d.label}
                value={result.six[d.id]}
                accent={styleDimSet.has(d.id) && d.id === result.styleId}
                color={t.accent}
              />
            ))}
          </div>
        </Card>

        {/* premium 占位 */}
        <Card className="border-dashed">
          <p className="text-center text-[11.5px] font-extrabold tracking-[0.2em] text-[#B49BA6]">
            PREMIUM（演示占位，无实际付费功能）
          </p>
          <p className="mt-2 text-center text-[1.15rem] font-extrabold text-[#4A3540]">{cfg.premium.title}</p>
          <p className="mt-1 text-center text-[13px] text-[#8C7080]">{cfg.premium.subtitle}</p>
          <ul className="mt-4 space-y-2">
            {cfg.premium.chapters.slice(0, 5).map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-[#8C7080]">
                <span style={{ color: t.accent }}>♥</span>
                {c}
              </li>
            ))}
            <li className="text-[12px] text-[#B49BA6]">…共 {cfg.premium.chapters.length} 章</li>
          </ul>
          <button
            type="button"
            disabled
            className="mt-4 w-full cursor-not-allowed rounded-[1.35rem] border-2 border-[#F0D9DE] bg-white py-3.5 font-extrabold text-[#B49BA6]"
          >
            解锁完整版 {cfg.premium.price}（演示占位）
          </button>
        </Card>

        <ResultActions cfg={cfg} />
      </div>
    </main>
  );
}

function ResultActions({ cfg }: { cfg: QuizConfig }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid grid-cols-2 gap-3 pb-6">
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(window.location.href).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        className="rounded-[1.35rem] border-2 border-[#F0D9DE] bg-white py-3.5 font-extrabold text-[#8C7080] shadow-[0_5px_0_#F0D9DE] transition active:translate-y-[5px] active:shadow-none"
      >
        {copied ? '已复制 ✓' : '复制结果链接'}
      </button>
      <Link
        to={`/`}
        className="rounded-[1.35rem] py-3.5 text-center font-extrabold text-white transition active:translate-y-[5px]"
        style={{ background: cfg.theme.accent, boxShadow: `0 5px 0 ${cfg.theme.accentDeep}` }}
      >
        再测一次
      </Link>
    </div>
  );
}

export default function QuizResultPage() {
  const cfg = QUIZ;
  const [params] = useSearchParams();
  const code = params.get('a') ?? '';
  const nickname = params.get('n') ?? '';

  const result = useMemo(() => {
    if (!cfg) return null;
    const dec = decodeAnswers(code, codeIds(cfg), cfg.codeTag);
    if (!dec) return null;
    return computeResult(cfg, dec.answers);
  }, [cfg, code]);

  if (!result) {
    return (
      <main
        className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col items-center justify-center px-6 text-center"
        style={{ background: cfg.theme.bg }}
      >
        <div className="text-[56px]">🫧</div>
        <h1 className="mt-4 text-[1.4rem] font-extrabold text-[#4A3540]">这条结果链接无效</h1>
        <p className="mt-2 text-[14px] text-[#8C7080]">作答码不完整，或它属于另一个测评。</p>
        <Link
          to={`/`}
          className="mt-6 rounded-[1.35rem] px-10 py-3.5 font-extrabold text-white"
          style={{ background: cfg.theme.accent }}
        >
          重新测一次
        </Link>
      </main>
    );
  }
  return <ResultBody cfg={cfg} result={result} nickname={nickname} />;
}

import { useEffect, useRef, useState } from "react";
import { BetPanel } from "@/components/BetPanel";
import { GameLayout } from "@/components/GameLayout";
import { NumberField } from "@/components/NumberField";
import { useWallet } from "@/lib/wallet";
import { sfx } from "@/lib/sound";

// Fair curve with a small instant-bust chance, then P(crash >= m) ≈ 1.005 / m.
// The old version could never bust below 1.02×, which made 1.01× a free win.
const EDGE = 1.005;
const INSTANT_BUST = 0.01;

const rollCrash = () => {
  const u = Math.random();
  if (u < INSTANT_BUST) return 1;
  const raw = EDGE / Math.max(1e-9, 1 - u);
  return Math.max(1, Math.floor(raw * 100) / 100);
};


export function Crash() {
  const { bet, settle } = useWallet();
  const [stake, setStake] = useState(5);
  const [auto, setAuto] = useState(2);
  const [mult, setMult] = useState(1);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<null | { won: boolean; at: number; payout: number }>(null);
  const [history, setHistory] = useState<number[]>([]);

  const raf = useRef<number | null>(null);
  const crashAt = useRef(1);
  const cashed = useRef(false);
  const lastTick = useRef(0);

  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    },
    [],
  );

  const stop = (won: boolean, at: number, payout: number) => {
    if (raf.current) cancelAnimationFrame(raf.current);
    setRunning(false);
    setResult({ won, at, payout });
    setHistory((h) => [crashAt.current, ...h].slice(0, 12));
    if (won) sfx.win();
    else sfx.explode();
    settle(payout);
  };

  const cashOut = () => {
    if (!running || cashed.current) return;
    cashed.current = true;
    sfx.coin();
    stop(true, mult, +(stake * mult).toFixed(2));
  };

  const play = () => {
    if (running || !bet(stake)) return;
    crashAt.current = rollCrash();
    cashed.current = false;
    setResult(null);
    setMult(1);
    setRunning(true);
    sfx.whoosh();

    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const m = +Math.pow(Math.E, 0.085 * t * (1 + t * 0.08)).toFixed(2);
      if (now - lastTick.current > 110) {
        lastTick.current = now;
        sfx.tick();
      }
      if (m >= crashAt.current) {
        setMult(crashAt.current);
        stop(false, crashAt.current, 0);
        return;
      }
      setMult(m);
      if (auto > 1 && m >= auto && !cashed.current) {
        cashed.current = true;
        setMult(auto);
        sfx.coin();
        stop(true, auto, +(stake * auto).toFixed(2));
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  const height = Math.min(96, Math.log(mult) * 42);

  return (
    <GameLayout
      title="Crash"
      tagline="Ride the curve, bail before the bust."
      icon="crash"
      board={
        <div className="flex h-full flex-col">
          <div className="relative flex-1 overflow-hidden rounded-xl border border-border bg-background/40">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--border)_60%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_60%,transparent)_1px,transparent_1px)] bg-[size:40px_40px] opacity-40" />
            <div
              className="absolute bottom-0 left-0 w-full origin-bottom-left transition-none"
              style={{
                height: `${height}%`,
                background:
                  "linear-gradient(to top, color-mix(in oklab, var(--primary) 32%, transparent), transparent)",
                clipPath: "polygon(0 100%, 100% 0, 100% 100%)",
              }}
            />
            <div className="absolute inset-0 grid place-items-center">
              <div
                className={`num text-5xl font-black sm:text-7xl ${
                  result ? (result.won ? "text-win" : "text-lose animate-shake") : "text-foreground"
                }`}
              >
                {mult.toFixed(2)}×
              </div>
            </div>
            {result ? (
              <div className="absolute inset-x-0 bottom-4 text-center text-sm text-muted-foreground">
                {result.won
                  ? `Cashed at ${result.at.toFixed(2)}× · +${result.payout.toFixed(2)}`
                  : `Busted at ${result.at.toFixed(2)}×`}
              </div>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {history.map((h, i) => (
              <span
                key={i}
                className={`num rounded-md px-2 py-1 text-xs ${
                  h >= 2 ? "bg-primary/20 text-win" : "bg-surface-2 text-muted-foreground"
                }`}
              >
                {h.toFixed(2)}×
              </span>
            ))}
          </div>
        </div>
      }
      panel={
        <BetPanel
          stake={stake}
          setStake={setStake}
          disabled={running}
          onPlay={running ? undefined : play}
          playLabel="Launch"
        >
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Auto cash-out
            </span>
            <NumberField
              value={auto}
              onCommit={setAuto}
              min={1.01}
              max={1000}
              step={0.1}
              disabled={running}
              suffix="×"
              ariaLabel="Auto cash out multiplier"
            />
          </div>
          {running ? (
            <button type="button" onClick={cashOut} className="btn-base btn-play w-full py-3">
              Cash out {(stake * mult).toFixed(2)}
            </button>
          ) : null}
        </BetPanel>
      }
    />
  );
}

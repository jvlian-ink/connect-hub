import { useRef, useState } from "react";
import { BetPanel } from "@/components/BetPanel";
import { GameLayout } from "@/components/GameLayout";
import { useWallet } from "@/lib/wallet";
import { sfx } from "@/lib/sound";

type RiskKey = "easy" | "medium" | "hard";

const CONFIG: Record<RiskKey, { risk: number; step: number; lanes: number }> = {
  easy: { risk: 0.16, step: 1.2, lanes: 10 },
  medium: { risk: 0.26, step: 1.38, lanes: 8 },
  hard: { risk: 0.38, step: 1.66, lanes: 6 },
};

export function Chicken() {
  const { bet, settle } = useWallet();
  const [stake, setStake] = useState(5);
  const [risk, setRisk] = useState<RiskKey>("medium");
  const [lane, setLane] = useState(0);
  const [live, setLive] = useState(false);
  const [dead, setDead] = useState(false);
  const busy = useRef(false);

  const cfg = CONFIG[risk];
  const mult = +Math.pow(cfg.step, lane).toFixed(2);
  const nextMult = +Math.pow(cfg.step, lane + 1).toFixed(2);

  const start = () => {
    if (live || !bet(stake)) return;
    setLane(0);
    setDead(false);
    setLive(true);
    sfx.chip();
  };

  const step = () => {
    if (!live || busy.current) return;
    busy.current = true;
    sfx.hop(lane);
    setTimeout(() => {
      if (Math.random() < cfg.risk) {
        setLive(false);
        setDead(true);
        sfx.explode();
        settle(0);
      } else {
        const next = lane + 1;
        setLane(next);
        sfx.coin();
        if (next >= cfg.lanes) {
          setLive(false);
          setDead(true);
          sfx.jackpot();
          settle(+(stake * Math.pow(cfg.step, next)).toFixed(2));
        }
      }
      busy.current = false;
    }, 220);
  };

  const cashOut = () => {
    if (!live || lane === 0) return;
    setLive(false);
    setDead(true);
    sfx.win();
    settle(+(stake * mult).toFixed(2));
  };

  return (
    <GameLayout
      title="Chicken"
      tagline="Cross the road one lane at a time."
      icon="chicken"
      board={
        <div className={`space-y-2 ${dead && lane < cfg.lanes ? "animate-shake" : ""}`}>
          {Array.from({ length: cfg.lanes }).map((_, i) => {
            const idx = cfg.lanes - 1 - i;
            const passed = lane > idx;
            const here = lane === idx;
            return (
              <div
                key={idx}
                className={`relative flex h-11 items-center justify-between rounded-lg px-3 transition-colors ${
                  passed ? "bg-primary/15" : "bg-surface-2"
                }`}
              >
                <span className="num text-xs text-muted-foreground">Lane {idx + 1}</span>
                <span className="num text-sm font-semibold text-gold">
                  {Math.pow(cfg.step, idx + 1).toFixed(2)}×
                </span>
                {here && live ? (
                  <span className="animate-pulse-glow absolute left-1/2 -translate-x-1/2 text-2xl">
                    🐔
                  </span>
                ) : null}
                {here && dead ? (
                  <span className="absolute left-1/2 -translate-x-1/2 text-2xl">💥</span>
                ) : null}
              </div>
            );
          })}
          <div className="flex h-11 items-center justify-center rounded-lg bg-surface text-xs uppercase tracking-widest text-muted-foreground">
            {lane === 0 && !dead ? "start" : "sidewalk"}
          </div>
        </div>
      }
      panel={
        <BetPanel
          stake={stake}
          setStake={setStake}
          disabled={live}
          onPlay={live ? undefined : start}
          playLabel="Send the chicken"
        >
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Traffic</span>
            <div className="grid grid-cols-3 gap-2">
              {(["easy", "medium", "hard"] as RiskKey[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={live}
                  onClick={() => {
                    sfx.click();
                    setRisk(r);
                  }}
                  className={`btn-base py-2 text-xs capitalize ${
                    risk === r ? "btn-play" : "btn-ghost-soft"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {live ? (
            <div className="grid gap-2">
              <button type="button" onClick={step} className="btn-base btn-play w-full py-3">
                Cross lane → {nextMult.toFixed(2)}×
              </button>
              <button
                type="button"
                disabled={lane === 0}
                onClick={cashOut}
                className="btn-base btn-ghost-soft w-full py-3"
              >
                Cash out {(stake * mult).toFixed(2)}
              </button>
            </div>
          ) : null}
        </BetPanel>
      }
    />
  );
}

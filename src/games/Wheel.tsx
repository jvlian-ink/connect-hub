import { useState } from "react";
import { BetPanel } from "@/components/BetPanel";
import { GameLayout } from "@/components/GameLayout";
import { useWallet } from "@/lib/wallet";
import { sfx } from "@/lib/sound";

const SLICES = [0, 0.5, 0.8, 1, 1.2, 1.6, 2, 3, 5, 12];

export function Wheel() {
  const { bet, settle } = useWallet();
  const [stake, setStake] = useState(5);
  const [result, setResult] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);

  const play = () => {
    if (spinning || !bet(stake)) return;
    const index = Math.floor(Math.random() * SLICES.length);
    const m = SLICES[index] ?? 0;
    setSpinning(true);
    setResult(null);
    setRotation((r) => r + 1800 + (360 - index * 36 - 18));
    sfx.whoosh();
    setTimeout(() => {
      setResult(m);
      setSpinning(false);
      if (m >= 3) sfx.jackpot();
      else if (m >= 1) sfx.win();
      else sfx.lose();
      settle(+(stake * m).toFixed(2));
    }, 2600);
  };

  return (
    <GameLayout
      title="Lucky Wheel"
      tagline="Spin for multipliers, chase the jackpot."
      icon="wheel"
      board={
        <div className="flex h-full flex-col items-center justify-center gap-5">
          <div className="relative h-64 w-64">
            <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 text-3xl text-primary">
              ▼
            </span>
            <div className="absolute inset-0 rounded-full border border-primary/40 bg-primary/20 blur-xl" />
            <div
              className="absolute inset-1 overflow-hidden rounded-full border-[12px] border-background shadow-[var(--shadow-glow)]"
              style={{
                background:
                  "conic-gradient(var(--primary) 0deg 36deg, var(--surface-2) 36deg 72deg, var(--accent) 72deg 108deg, var(--surface) 108deg 144deg, var(--primary) 144deg 180deg, var(--steel) 180deg 216deg, var(--accent) 216deg 252deg, var(--surface-2) 252deg 288deg, var(--primary) 288deg 324deg, var(--surface) 324deg 360deg)",
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? "transform 2.6s cubic-bezier(.08,.72,.12,1)" : "none",
              }}
            >
              {SLICES.map((m, i) => (
                <span
                  key={m + i}
                  className="absolute left-1/2 top-1/2 num text-xs font-black"
                  style={{
                    transform: `rotate(${i * 36 + 18}deg) translateY(-98px) rotate(${-i * 36 - 18}deg)`,
                  }}
                >
                  {m}×
                </span>
              ))}
            </div>
            <div className="absolute inset-[70px] grid place-items-center rounded-full border border-border bg-background num text-2xl font-black">
              {spinning ? "…" : result === null ? "SPIN" : `${result}×`}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            The pointer lands on the multiplier at the top.
          </p>
        </div>
      }
      panel={
        <BetPanel
          stake={stake}
          setStake={setStake}
          disabled={spinning}
          onPlay={play}
          playLabel="Spin wheel"
        >
          <p className="text-xs text-muted-foreground">
            Every slice is live. The outer jackpot is waiting.
          </p>
        </BetPanel>
      }
    />
  );
}

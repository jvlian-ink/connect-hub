import { useState } from "react";
import { BetPanel } from "@/components/BetPanel";
import { GameLayout } from "@/components/GameLayout";
import { NumberField } from "@/components/NumberField";
import { useWallet } from "@/lib/wallet";
import { sfx } from "@/lib/sound";

// Slightly player-favourable: P(roll >= target) = 1.015 / target
const EDGE = 1.015;

export function Limbo() {
  const { bet, settle } = useWallet();
  const [stake, setStake] = useState(5);
  const [target, setTarget] = useState(2);
  const [roll, setRoll] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [history, setHistory] = useState<{ v: number; won: boolean }[]>([]);

  const chance = Math.min(99, (EDGE / Math.max(1.01, target)) * 100);

  const play = () => {
    if (spinning || !bet(stake)) return;
    setSpinning(true);
    setRoll(null);
    sfx.whoosh();

    const u = Math.random();
    const value = Math.max(1, +(EDGE / Math.max(1e-9, 1 - u)).toFixed(2));
    let steps = 0;
    const spin = setInterval(() => {
      steps++;
      setRoll(+(1 + Math.random() * Math.max(2, target * 1.6)).toFixed(2));
      sfx.tick();
      if (steps > 14) {
        clearInterval(spin);
        const won = value >= target;
        setRoll(value);
        setSpinning(false);
        setHistory((h) => [{ v: value, won }, ...h].slice(0, 12));
        if (won) sfx.win();
        else sfx.lose();
        settle(won ? +(stake * target).toFixed(2) : 0);
      }
    }, 55);
  };

  const last = history[0];

  return (
    <GameLayout
      title="Limbo"
      tagline="Name a target. Beat the roll."
      icon="limbo"
      board={
        <div className="flex h-full flex-col items-center justify-center gap-6">
          <div
            className={`num text-6xl font-black tabular-nums sm:text-8xl ${
              spinning
                ? "text-muted-foreground"
                : last
                  ? last.won
                    ? "text-win"
                    : "text-lose"
                  : "text-foreground"
            }`}
          >
            {(roll ?? 1).toFixed(2)}×
          </div>
          <div className="text-sm text-muted-foreground">
            Target <span className="num text-foreground">{target.toFixed(2)}×</span> · win chance{" "}
            <span className="num text-foreground">{chance.toFixed(2)}%</span>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {history.map((h, i) => (
              <span
                key={i}
                className={`num rounded-md px-2 py-1 text-xs ${
                  h.won ? "bg-primary/20 text-win" : "bg-surface-2 text-muted-foreground"
                }`}
              >
                {h.v.toFixed(2)}×
              </span>
            ))}
          </div>
        </div>
      }
      panel={
        <BetPanel
          stake={stake}
          setStake={setStake}
          disabled={spinning}
          onPlay={play}
          playLabel="Roll"
        >
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Target multiplier
            </span>
            <NumberField
              value={target}
              onCommit={setTarget}
              min={1.01}
              max={10000}
              step={0.1}
              disabled={spinning}
              suffix="×"
              ariaLabel="Target multiplier"
            />
            <div className="grid grid-cols-4 gap-2">
              {[1.5, 2, 5, 10].map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={spinning}
                  onClick={() => {
                    sfx.click();
                    setTarget(t);
                  }}
                  className="btn-base btn-ghost-soft py-2 text-xs"
                >
                  {t}×
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Payout <span className="num text-foreground">{(stake * target).toFixed(2)}</span> on a
            hit.
          </p>
        </BetPanel>
      }
    />
  );
}

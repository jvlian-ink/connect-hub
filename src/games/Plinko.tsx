import { useRef, useState } from "react";
import { BetPanel } from "@/components/BetPanel";
import { GameLayout } from "@/components/GameLayout";
import { useWallet } from "@/lib/wallet";
import { sfx } from "@/lib/sound";

type RiskKey = "low" | "medium" | "high";

// Slightly player-favourable paytables (edge-of-board pays are a touch fatter).
const TABLES: Record<RiskKey, number[]> = {
  low: [6.1, 2.15, 1.35, 1.12, 0.95, 0.62, 0.95, 1.12, 1.35, 2.15, 6.1],
  medium: [16.5, 4.2, 1.85, 1.15, 0.72, 0.42, 0.72, 1.15, 1.85, 4.2, 16.5],
  high: [45, 9.5, 2.8, 1.05, 0.42, 0.22, 0.42, 1.05, 2.8, 9.5, 45],
};

const ROWS = 10;
// Slight outward bias on each peg — nudges balls toward the fatter edges.
const BIAS = 0.012;

export function Plinko() {
  const { bet, settle } = useWallet();
  const [stake, setStake] = useState(5);
  const [risk, setRisk] = useState<RiskKey>("medium");
  const [ball, setBall] = useState<null | { row: number; col: number }>(null);
  const [landed, setLanded] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const busy = useRef(false);

  const table = TABLES[risk];

  const drop = () => {
    if (busy.current || !bet(stake)) return;
    busy.current = true;
    setLanded(null);
    sfx.whoosh();

    let col = 0;
    let row = 0;
    setBall({ row: 0, col: 0 });

    const step = setInterval(() => {
      const mid = row / 2;
      const outward = col >= mid ? BIAS : -BIAS;
      const right = Math.random() < 0.5 + outward;
      if (right) col += 1;
      row += 1;
      setBall({ row, col });
      sfx.peg();
      if (row >= ROWS) {
        clearInterval(step);
        const mult = table[Math.min(table.length - 1, col)] ?? 0;
        const payout = +(stake * mult).toFixed(2);
        setLanded(col);
        setHistory((h) => [mult, ...h].slice(0, 12));
        if (mult >= 4) sfx.jackpot();
        else if (mult >= 1) sfx.win();
        else sfx.lose();
        settle(payout);
        busy.current = false;
      }
    }, 95);
  };

  return (
    <GameLayout
      title="Plinko"
      tagline="Drop the ball, pray for the edges."
      icon="plinko"
      board={
        <div className="flex h-full flex-col items-center justify-between gap-4">
          <div className="relative w-full max-w-md flex-1">
            {Array.from({ length: ROWS }, (_, r) => (
              <div key={r} className="flex justify-center gap-3 py-1.5 sm:gap-4">
                {Array.from({ length: r + 1 }, (_, c) => {
                  const here = ball && ball.row === r && ball.col === c;
                  return (
                    <span
                      key={c}
                      className={`h-2 w-2 rounded-full transition ${
                        here ? "scale-[2.4] bg-primary shadow-[var(--shadow-glow)]" : "bg-steel/50"
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex w-full max-w-md gap-1">
            {table.map((m, i) => (
              <div
                key={i}
                className={`num flex-1 rounded-md py-1.5 text-center text-[10px] font-semibold transition sm:text-xs ${
                  landed === i
                    ? "animate-tile-in chip-blood"
                    : m >= 4
                      ? "bg-primary/25 text-win"
                      : m >= 1
                        ? "bg-surface-2 text-foreground"
                        : "bg-surface text-muted-foreground"
                }`}
              >
                {m}×
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {history.map((h, i) => (
              <span
                key={i}
                className={`num rounded-md px-2 py-1 text-xs ${
                  h >= 1 ? "bg-primary/20 text-win" : "bg-surface-2 text-muted-foreground"
                }`}
              >
                {h}×
              </span>
            ))}
          </div>
        </div>
      }
      panel={
        <BetPanel stake={stake} setStake={setStake} onPlay={drop} playLabel="Drop ball">
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Risk</span>
            <div className="grid grid-cols-3 gap-2">
              {(["low", "medium", "high"] as RiskKey[]).map((r) => (
                <button
                  key={r}
                  type="button"
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
        </BetPanel>
      }
    />
  );
}

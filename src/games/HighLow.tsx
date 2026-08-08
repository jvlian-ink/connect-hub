import { useRef, useState } from "react";
import { BetPanel } from "@/components/BetPanel";
import { GameLayout } from "@/components/GameLayout";
import { useWallet } from "@/lib/wallet";
import { sfx } from "@/lib/sound";

// A hair over a coin flip, in your favour: 52.5% correct, 1.92× payout.
const WIN_CHANCE = 0.525;
const PAYOUT = 1.92;

const roll = () => +(1 + Math.random() * 9).toFixed(2);

export function HighLow() {
  const { bet, settle } = useWallet();
  const [stake, setStake] = useState(5);
  const [current, setCurrent] = useState(roll);
  const [next, setNext] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [outcome, setOutcome] = useState<null | boolean>(null);
  const [history, setHistory] = useState<{ v: number; won: boolean }[]>([]);
  const busy = useRef(false);

  const guess = (dir: "up" | "down") => {
    if (busy.current || !bet(stake)) return;
    busy.current = true;
    setSpinning(true);
    setOutcome(null);
    setNext(null);
    sfx.whoosh();

    const win = Math.random() < WIN_CHANCE;
    // Build a value that matches the pre-decided outcome.
    let value: number;
    const higher = dir === "up" ? win : !win;
    if (higher) {
      const room = Math.max(0.05, 10 - current);
      value = +(current + Math.random() * room + 0.01).toFixed(2);
    } else {
      const room = Math.max(0.05, current - 1);
      value = +(current - Math.random() * room - 0.01).toFixed(2);
    }
    value = Math.min(10, Math.max(1, value));

    let steps = 0;
    const spin = setInterval(() => {
      steps++;
      setNext(roll());
      sfx.tick();
      if (steps > 12) {
        clearInterval(spin);
        setNext(value);
        setSpinning(false);
        setOutcome(win);
        setHistory((h) => [{ v: value, won: win }, ...h].slice(0, 12));
        if (win) sfx.win();
        else sfx.lose();
        settle(win ? +(stake * PAYOUT).toFixed(2) : 0);
        setTimeout(() => {
          setCurrent(value);
          setNext(null);
          setOutcome(null);
        }, 1300);
        busy.current = false;
      }
    }, 60);
  };

  return (
    <GameLayout
      title="Higher / Lower"
      tagline="Will the next multiplier climb or fall?"
      icon="highlow"
      board={
        <div className="flex h-full flex-col items-center justify-center gap-8">
          <div className="flex items-center gap-6 sm:gap-12">
            <div className="text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Current</div>
              <div className="num text-5xl font-black sm:text-6xl">{current.toFixed(2)}×</div>
            </div>
            <div className="text-3xl text-muted-foreground">→</div>
            <div className="text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Next</div>
              <div
                className={`num text-5xl font-black sm:text-6xl ${
                  spinning
                    ? "text-muted-foreground"
                    : outcome === null
                      ? "text-foreground"
                      : outcome
                        ? "text-win"
                        : "text-lose"
                }`}
              >
                {next === null ? "—" : `${next.toFixed(2)}×`}
              </div>
            </div>
          </div>

          <div className="grid w-full max-w-sm grid-cols-2 gap-3">
            <button
              type="button"
              disabled={spinning}
              onClick={() => guess("up")}
              className="btn-base btn-play py-5 text-lg"
            >
              ▲ Higher
            </button>
            <button
              type="button"
              disabled={spinning}
              onClick={() => guess("down")}
              className="btn-base btn-ghost-soft py-5 text-lg"
            >
              ▼ Lower
            </button>
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
        <BetPanel stake={stake} setStake={setStake} disabled={spinning}>
          <p className="text-xs text-muted-foreground">
            Correct calls pay <span className="num text-foreground">{PAYOUT}×</span> your stake. Use
            the Higher / Lower buttons on the board to lock a call in.
          </p>
        </BetPanel>
      }
    />
  );
}

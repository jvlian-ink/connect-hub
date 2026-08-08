import { useState } from "react";
import { BetPanel } from "@/components/BetPanel";
import { GameLayout } from "@/components/GameLayout";
import { useWallet } from "@/lib/wallet";
import { sfx } from "@/lib/sound";
const FLOORS = 8;
export function Towers() {
  const { bet, settle } = useWallet();
  const [stake, setStake] = useState(5);
  const [floor, setFloor] = useState(0);
  const [live, setLive] = useState(false);
  const [lost, setLost] = useState(false);
  const multiplier = +Math.pow(1.43, floor).toFixed(2);
  const start = () => {
    if (!bet(stake)) return;
    setFloor(0);
    setLost(false);
    setLive(true);
    sfx.chip();
  };
  const choose = (door: number) => {
    if (!live) return;
    const safe = Math.floor(Math.random() * 3);
    if (door !== safe) {
      setLost(true);
      setLive(false);
      sfx.explode();
      settle(0);
      return;
    }
    const next = floor + 1;
    setFloor(next);
    sfx.gem(next);
    if (next === FLOORS) {
      setLive(false);
      sfx.jackpot();
      settle(+(stake * Math.pow(1.43, next)).toFixed(2));
    }
  };
  const cash = () => {
    if (!live || !floor) return;
    setLive(false);
    sfx.win();
    settle(+(stake * multiplier).toFixed(2));
  };
  return (
    <GameLayout
      title="Sky Towers"
      tagline="Climb the floors, avoid the wrong door."
      icon="towers"
      board={
        <div className="flex h-full flex-col justify-center gap-2">
          {Array.from({ length: FLOORS }, (_, i) => FLOORS - i).map((n) => (
            <div
              key={n}
              className={`grid grid-cols-3 gap-2 rounded-lg p-2 ${floor >= n ? "bg-primary/15" : "bg-surface/60"}`}
            >
              {[0, 1, 2].map((d) => (
                <button
                  type="button"
                  key={d}
                  disabled={!live || n !== floor + 1}
                  onClick={() => choose(d)}
                  className={`h-10 rounded border ${lost && n === floor + 1 ? "border-lose bg-lose/20" : "border-border bg-surface-2 hover:border-primary"}`}
                >
                  {n === floor + 1 && live ? "?" : floor >= n ? "✦" : ""}
                </button>
              ))}
            </div>
          ))}
        </div>
      }
      panel={
        <BetPanel
          stake={stake}
          setStake={setStake}
          disabled={live}
          onPlay={live ? undefined : start}
          playLabel="Enter tower"
        >
          <p className="text-xs text-muted-foreground">
            Floor{" "}
            <span className="num text-foreground">
              {floor}/{FLOORS}
            </span>{" "}
            · Current <span className="num text-foreground">{multiplier}×</span>
          </p>
          {live && (
            <div className="grid gap-2">
              <p className="text-xs text-muted-foreground">
                One of three doors is safe. Pick on the board.
              </p>
              <button
                type="button"
                disabled={!floor}
                onClick={cash}
                className="btn-base btn-play w-full py-3"
              >
                Cash out {(stake * multiplier).toFixed(2)}
              </button>
            </div>
          )}
        </BetPanel>
      }
    />
  );
}

import { useMemo, useState } from "react";
import { BetPanel } from "@/components/BetPanel";
import { GameLayout } from "@/components/GameLayout";
import { useWallet } from "@/lib/wallet";
import { sfx } from "@/lib/sound";

const TILES = 25;
// Slightly player-favourable payout factor.
const EDGE = 1.005;

function multiplierFor(mines: number, picks: number) {
  let m = EDGE;
  for (let i = 0; i < picks; i++) {
    m *= (TILES - i) / (TILES - mines - i);
  }
  return +m.toFixed(4);
}

export function Mines() {
  const { bet, settle } = useWallet();
  const [stake, setStake] = useState(5);
  const [mines, setMines] = useState(3);
  const [bombs, setBombs] = useState<Set<number>>(new Set());
  const [opened, setOpened] = useState<number[]>([]);
  const [live, setLive] = useState(false);
  const [dead, setDead] = useState(false);
  const [hitTile, setHitTile] = useState<number | null>(null);

  const picks = opened.length;
  const current = useMemo(() => (picks ? multiplierFor(mines, picks) : 1), [mines, picks]);
  const next = useMemo(() => multiplierFor(mines, picks + 1), [mines, picks]);

  const start = () => {
    if (live || !bet(stake)) return;
    const set = new Set<number>();
    while (set.size < mines) set.add(Math.floor(Math.random() * TILES));
    setBombs(set);
    setOpened([]);
    setDead(false);
    setHitTile(null);
    setLive(true);
    sfx.chip();
  };

  const cashOut = () => {
    if (!live || !picks) return;
    setLive(false);
    setDead(true);
    sfx.win();
    settle(+(stake * current).toFixed(2));
  };

  const dig = (i: number) => {
    if (!live || opened.includes(i)) return;
    if (bombs.has(i)) {
      setHitTile(i);
      setLive(false);
      setDead(true);
      sfx.explode();
      settle(0);
      return;
    }
    const nextOpened = [...opened, i];
    setOpened(nextOpened);
    sfx.gem(nextOpened.length);
    if (nextOpened.length === TILES - mines) {
      setLive(false);
      setDead(true);
      sfx.jackpot();
      settle(+(stake * multiplierFor(mines, nextOpened.length)).toFixed(2));
    }
  };

  return (
    <GameLayout
      title="Mines"
      tagline="Pick your own bomb count. Dig carefully."
      icon="mines"
      board={
        <div className="flex h-full flex-col items-center justify-center gap-5">
          <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
            {Array.from({ length: TILES }, (_, i) => {
              const isOpen = opened.includes(i);
              const showBomb = dead && bombs.has(i);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!live || isOpen}
                  onClick={() => dig(i)}
                  className={`grid h-13 w-13 place-items-center rounded-xl border text-xl transition sm:h-16 sm:w-16 ${
                    isOpen
                      ? "animate-tile-in border-primary/50 bg-primary/15"
                      : showBomb
                        ? `border-lose/60 bg-lose/25 ${hitTile === i ? "animate-shake" : ""}`
                        : "border-border bg-surface-2 hover:border-primary/50 disabled:opacity-70"
                  }`}
                >
                  {isOpen ? "💎" : showBomb ? "💥" : ""}
                </button>
              );
            })}
          </div>
          <div className="num text-lg">
            {picks ? (
              <span className="text-win">{current.toFixed(2)}×</span>
            ) : (
              <span className="text-muted-foreground">Place a bet to arm the field</span>
            )}
          </div>
        </div>
      }
      panel={
        <BetPanel
          stake={stake}
          setStake={setStake}
          disabled={live}
          onPlay={live ? undefined : start}
          playLabel="Arm field"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
              <span>Bombs</span>
              <span className="num text-foreground">{mines}</span>
            </div>
            <input
              type="range"
              min={1}
              max={24}
              step={1}
              value={mines}
              disabled={live}
              onChange={(e) => {
                setMines(Number(e.target.value));
                sfx.tick();
              }}
              className="w-full accent-[var(--primary)]"
              aria-label="Number of bombs"
            />
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 3, 5, 10, 24].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={live}
                  onClick={() => {
                    sfx.click();
                    setMines(n);
                  }}
                  className={`btn-base py-2 text-xs ${
                    mines === n ? "btn-play" : "btn-ghost-soft"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Next tile pays{" "}
              <span className="num text-foreground">{next.toFixed(2)}×</span>
            </p>
          </div>

          {live && picks > 0 ? (
            <button type="button" onClick={cashOut} className="btn-base btn-play w-full py-3">
              Cash out {(stake * current).toFixed(2)}
            </button>
          ) : null}
        </BetPanel>
      }
    />
  );
}

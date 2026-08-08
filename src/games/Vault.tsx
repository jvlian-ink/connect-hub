import { useState } from "react";
import { BetPanel } from "@/components/BetPanel";
import { GameLayout } from "@/components/GameLayout";
import { useWallet } from "@/lib/wallet";
import { sfx } from "@/lib/sound";
const CELLS = 12;
export function Vault() {
  const { bet, settle } = useWallet();
  const [stake, setStake] = useState(5);
  const [traps, setTraps] = useState<Set<number>>(new Set());
  const [opened, setOpened] = useState<number[]>([]);
  const [live, setLive] = useState(false);
  const [dead, setDead] = useState(false);
  const mult = +(1 + opened.length * 0.38).toFixed(2);
  const start = () => {
    if (!bet(stake)) return;
    const next = new Set<number>();
    while (next.size < 3) next.add(Math.floor(Math.random() * CELLS));
    setTraps(next);
    setOpened([]);
    setDead(false);
    setLive(true);
    sfx.chip();
  };
  const open = (i: number) => {
    if (!live || opened.includes(i)) return;
    if (traps.has(i)) {
      setDead(true);
      setLive(false);
      sfx.explode();
      settle(0);
    } else {
      const next = [...opened, i];
      setOpened(next);
      sfx.gem(next.length);
      if (next.length === CELLS - 3) {
        setLive(false);
        setDead(true);
        sfx.jackpot();
        settle(+(stake * (1 + next.length * 0.38)).toFixed(2));
      }
    }
  };
  const cash = () => {
    if (!live || !opened.length) return;
    setLive(false);
    setDead(true);
    sfx.win();
    settle(+(stake * mult).toFixed(2));
  };
  return (
    <GameLayout
      title="Treasure Vault"
      tagline="Open chambers, collect gems, cash out."
      icon="vault"
      board={
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: CELLS }, (_, i) => {
            const gem = opened.includes(i),
              trap = dead && traps.has(i);
            return (
              <button
                type="button"
                key={i}
                disabled={!live || gem}
                onClick={() => open(i)}
                className={`grid h-20 place-items-center rounded-xl border text-2xl ${gem ? "border-primary bg-primary/15" : trap ? "border-lose bg-lose/20" : "border-border bg-surface-2 hover:border-primary"}`}
              >
                {gem ? "✦" : trap ? "✕" : ""}
              </button>
            );
          })}
        </div>
      }
      panel={
        <BetPanel
          stake={stake}
          setStake={setStake}
          disabled={live}
          onPlay={live ? undefined : start}
          playLabel="Unlock vault"
        >
          <p className="text-xs text-muted-foreground">
            Three traps. {opened.length} gems found ·{" "}
            <span className="num text-foreground">{mult}×</span>
          </p>
          {live && (
            <button type="button" onClick={cash} className="btn-base btn-play w-full py-3">
              Cash out {(stake * mult).toFixed(2)}
            </button>
          )}
        </BetPanel>
      }
    />
  );
}

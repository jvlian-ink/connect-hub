import { useState } from "react";
import { BetPanel } from "@/components/BetPanel";
import { GameLayout } from "@/components/GameLayout";
import { useWallet } from "@/lib/wallet";
import { sfx } from "@/lib/sound";

const ICONS = [
  "STAR",
  "GEM",
  "CROWN",
  "CASH",
  "SEVEN",
  "MOON",
  "COMET",
  "SUN",
  "HEART",
  "SPADE",
  "CLOVER",
  "BOLT",
];

function makeTicket(forceWin: boolean) {
  const ticket = [...ICONS].sort(() => Math.random() - 0.5).slice(0, 9);
  const roll = forceWin ? 0.2 : Math.random();
  if (roll < 0.015) {
    ticket[7] = ticket[0]!;
    ticket[8] = ticket[0]!;
    return { ticket, payout: 10, hits: 3 };
  }
  if (roll < 0.215) {
    ticket[8] = ticket[0]!;
    return { ticket, payout: 1.5, hits: 2 };
  }
  return { ticket, payout: 0, hits: 0 };
}

export function Scratch() {
  const { bet, settle } = useWallet();
  const [stake, setStake] = useState(5);
  const [tiles, setTiles] = useState<string[]>([]);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [payout, setPayout] = useState(0);
  const [hits, setHits] = useState(0);
  const [live, setLive] = useState(false);
  const [result, setResult] = useState("");
  const [lossStreak, setLossStreak] = useState(0);

  const start = () => {
    if (!bet(stake)) return;
    const next = makeTicket(lossStreak >= 19);
    setTiles(next.ticket);
    setPayout(next.payout);
    setHits(next.hits);
    setRevealed([]);
    setResult("Scratch every tile to reveal your ticket.");
    setLive(true);
    sfx.chip();
  };

  const reveal = (index: number) => {
    if (!live || revealed.includes(index)) return;
    const next = [...revealed, index];
    setRevealed(next);
    sfx.reveal();
    if (next.length !== 9) return;

    setLive(false);
    setLossStreak((current) => (payout ? 0 : current + 1));
    setResult(payout ? `${hits} matching symbols: ${payout}x payout!` : "No match on this ticket.");
    if (payout >= 10) sfx.jackpot();
    else if (payout) sfx.win();
    else sfx.lose();
    settle(+(stake * payout).toFixed(2));
  };

  return (
    <GameLayout
      title="Scratch Blitz"
      tagline="Reveal nine tiles and hunt matching symbols."
      icon="scratch"
      board={
        <div className="flex h-full flex-col items-center justify-center gap-5">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 9 }, (_, index) => (
              <button
                type="button"
                key={index}
                disabled={!live || revealed.includes(index)}
                onClick={() => reveal(index)}
                className={`grid h-24 w-24 place-items-center rounded-xl border text-center text-[11px] font-bold ${revealed.includes(index) ? "border-primary bg-primary/15" : "border-border bg-surface-2 hover:border-primary"}`}
              >
                {revealed.includes(index) ? tiles[index] : "SCRATCH"}
              </button>
            ))}
          </div>
          <p className="font-display text-lg">{result || "Press play to reveal a ticket."}</p>
        </div>
      }
      panel={
        <BetPanel
          stake={stake}
          setStake={setStake}
          disabled={live}
          onPlay={live ? undefined : start}
          playLabel="Buy ticket"
        >
          <p className="text-xs text-muted-foreground">
            About 20% return 1.5x and 1.5% hit the 10x jackpot. After 19 misses, the next ticket
            guarantees a match.
          </p>
        </BetPanel>
      }
    />
  );
}

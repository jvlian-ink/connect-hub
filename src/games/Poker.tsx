import { useState } from "react";
import { BetPanel } from "@/components/BetPanel";
import { GameLayout } from "@/components/GameLayout";
import { freshDeck, isRed, label, type Card } from "@/lib/cards";
import { useWallet } from "@/lib/wallet";
import { sfx } from "@/lib/sound";

// Generous-but-grindy paytable (total return on the stake).
const PAYTABLE: { name: string; pays: number }[] = [
  { name: "Royal Flush", pays: 260 },
  { name: "Straight Flush", pays: 62 },
  { name: "Four of a Kind", pays: 27 },
  { name: "Full House", pays: 9.5 },
  { name: "Flush", pays: 6.5 },
  { name: "Straight", pays: 4.5 },
  { name: "Three of a Kind", pays: 3.1 },
  { name: "Two Pair", pays: 2.1 },
  { name: "Jacks or Better", pays: 1.25 },
  { name: "No Pay", pays: 0 },
];

function evaluate(cards: Card[]) {
  const ranks = cards.map((c) => c.rank).sort((a, b) => a - b);
  const suits = new Set(cards.map((c) => c.suit));
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const groups = [...counts.values()].sort((a, b) => b - a);

  const flush = suits.size === 1;
  const uniq = [...new Set(ranks)];
  let straight = false;
  let highStraight = false;
  if (uniq.length === 5) {
    if ((uniq[4] ?? 0) - (uniq[0] ?? 0) === 4) straight = true;
    if (uniq.join(",") === "1,10,11,12,13") {
      straight = true;
      highStraight = true;
    }
  }

  if (flush && straight && highStraight) return PAYTABLE[0]!;
  if (flush && straight) return PAYTABLE[1]!;
  if (groups[0] === 4) return PAYTABLE[2]!;
  if (groups[0] === 3 && groups[1] === 2) return PAYTABLE[3]!;
  if (flush) return PAYTABLE[4]!;
  if (straight) return PAYTABLE[5]!;
  if (groups[0] === 3) return PAYTABLE[6]!;
  if (groups[0] === 2 && groups[1] === 2) return PAYTABLE[7]!;
  if (groups[0] === 2) {
    const pairRank = [...counts.entries()].find(([, n]) => n === 2)?.[0] ?? 0;
    if (pairRank === 1 || pairRank >= 11) return PAYTABLE[8]!;
  }
  return PAYTABLE[9]!;
}

type Phase = "idle" | "draw" | "done";

export function Poker() {
  const { bet, settle } = useWallet();
  const [stake, setStake] = useState(5);
  const [deck, setDeck] = useState<Card[]>([]);
  const [hand, setHand] = useState<Card[]>([]);
  const [held, setHeld] = useState<boolean[]>([false, false, false, false, false]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<string>("Deal to begin.");

  const deal = () => {
    if (phase === "draw" || !bet(stake)) return;
    const d = freshDeck();
    const h = Array.from({ length: 5 }, () => d.pop()!);
    setDeck(d);
    setHand(h);
    setHeld([false, false, false, false, false]);
    setPhase("draw");
    setResult("Hold what you like, then draw.");
    h.forEach((_, i) => setTimeout(() => sfx.card(), i * 90));
  };

  const draw = () => {
    if (phase !== "draw") return;
    const d = [...deck];
    const next = hand.map((c, i) => (held[i] ? c : d.pop()!));
    setDeck(d);
    setHand(next);
    setPhase("done");
    hand.forEach((_, i) => {
      if (!held[i]) setTimeout(() => sfx.card(), i * 80);
    });
    const outcome = evaluate(next);
    setResult(outcome.pays > 0 ? `${outcome.name} · ${outcome.pays}×` : "No pay. Deal again.");
    if (outcome.pays >= 9) sfx.jackpot();
    else if (outcome.pays > 0) sfx.win();
    else sfx.lose();
    settle(+(stake * outcome.pays).toFixed(2));
  };

  return (
    <GameLayout
      title="Poker Draw"
      tagline="Five cards, one draw, paytable payouts."
      icon="poker"
      board={
        <div className="flex h-full flex-col justify-between gap-6">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {hand.length === 0
              ? Array.from({ length: 5 }, (_, i) => (
                  <div
                    key={i}
                    className="grid h-28 w-19 place-items-center rounded-xl border border-dashed border-border text-muted-foreground sm:h-36 sm:w-24"
                  >
                    ?
                  </div>
                ))
              : hand.map((c, i) => (
                  <button
                    key={c.id + i}
                    type="button"
                    disabled={phase !== "draw"}
                    onClick={() => {
                      sfx.chip();
                      setHeld((h) => h.map((v, j) => (j === i ? !v : v)));
                    }}
                    className={`animate-tile-in relative grid h-28 w-19 place-items-center rounded-xl border text-2xl font-bold transition sm:h-36 sm:w-24 ${
                      held[i]
                        ? "-translate-y-2 border-primary bg-primary/15"
                        : "border-border bg-surface-2"
                    } ${isRed(c) ? "text-primary" : "text-foreground"}`}
                  >
                    {label(c)}
                    {held[i] ? (
                      <span className="absolute bottom-1 text-[10px] uppercase tracking-wider text-primary">
                        held
                      </span>
                    ) : null}
                  </button>
                ))}
          </div>

          <div className="text-center font-display text-lg">{result}</div>

          <div className="mx-auto grid w-full max-w-sm gap-1 text-xs">
            {PAYTABLE.filter((p) => p.pays > 0).map((p) => (
              <div
                key={p.name}
                className="flex justify-between rounded-md bg-surface/60 px-3 py-1.5 text-muted-foreground"
              >
                <span>{p.name}</span>
                <span className="num text-foreground">{p.pays}×</span>
              </div>
            ))}
          </div>
        </div>
      }
      panel={
        <BetPanel
          stake={stake}
          setStake={setStake}
          disabled={phase === "draw"}
          onPlay={phase === "draw" ? undefined : deal}
          playLabel="Deal"
        >
          {phase === "draw" ? (
            <button type="button" onClick={draw} className="btn-base btn-play w-full py-3">
              Draw
            </button>
          ) : null}
        </BetPanel>
      }
    />
  );
}

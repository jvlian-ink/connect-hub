import { useState } from "react";
import { BetPanel } from "@/components/BetPanel";
import { GameLayout } from "@/components/GameLayout";
import { useWallet } from "@/lib/wallet";
import { sfx } from "@/lib/sound";

const SYMBOLS = ["★", "◆", "7", "$", "♛"];

export function Slots() {
  const { bet, settle } = useWallet();
  const [stake, setStake] = useState(5);
  const [reels, setReels] = useState(["?", "?", "?"]);
  const [spinning, setSpinning] = useState<number[]>([]);
  const [message, setMessage] = useState("Three symbols. One huge rush.");
  const busy = spinning.length > 0;

  const play = () => {
    if (busy || !bet(stake)) return;
    const final = Array.from(
      { length: 3 },
      () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]!,
    );
    setSpinning([0, 1, 2]);
    setMessage("Reels are rolling…");
    sfx.whoosh();
    [0, 1, 2].forEach((reel) => {
      const interval = window.setInterval(
        () =>
          setReels((current) =>
            current.map((value, i) =>
              i === reel ? SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]! : value,
            ),
          ),
        85,
      );
      window.setTimeout(
        () => {
          window.clearInterval(interval);
          setReels((current) => current.map((value, i) => (i === reel ? final[i]! : value)));
          setSpinning((current) => current.filter((i) => i !== reel));
          sfx.click();
          if (reel !== 2) return;
          const triple = final[0] === final[1] && final[1] === final[2];
          const pair = final[0] === final[1] || final[1] === final[2] || final[0] === final[2];
          const m = triple ? (final[0] === "♛" ? 18 : 7) : pair ? 1.55 : 0;
          setMessage(m ? `${triple ? "JACKPOT" : "Pair"} · ${m}× payout` : "No match. Spin again.");
          if (m >= 7) sfx.jackpot();
          else if (m) sfx.win();
          else sfx.lose();
          settle(+(stake * m).toFixed(2));
        },
        800 + reel * 650,
      );
    });
  };

  return (
    <GameLayout
      title="Neon Slots"
      tagline="Three reels. Big symbols. Instant hits."
      icon="slots"
      board={
        <div className="flex h-full flex-col items-center justify-center gap-7">
          <div className="relative flex overflow-hidden rounded-2xl border border-primary/50 bg-background p-3 shadow-[var(--shadow-glow)]">
            <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-20 -translate-y-1/2 border-y border-primary/70 bg-primary/10" />
            {reels.map((symbol, i) => (
              <div
                key={i}
                className="relative z-20 grid h-32 w-20 place-items-center border-x border-border font-display text-5xl"
              >
                <span className={spinning.includes(i) ? "animate-slot-reel" : "animate-tile-in"}>
                  {symbol}
                </span>
              </div>
            ))}
          </div>
          <p className="font-display text-lg">{message}</p>
        </div>
      }
      panel={
        <BetPanel
          stake={stake}
          setStake={setStake}
          disabled={busy}
          onPlay={play}
          playLabel="Spin reels"
        >
          <p className="text-xs text-muted-foreground">
            Reels stop one by one. Pairs pay 1.55×; triples pay 7× or 18×.
          </p>
        </BetPanel>
      }
    />
  );
}

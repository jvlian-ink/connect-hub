import { useState } from "react";
import { BetPanel } from "@/components/BetPanel";
import { GameLayout } from "@/components/GameLayout";
import { useWallet } from "@/lib/wallet";
import { sfx } from "@/lib/sound";

const PAYOUT = 1.92;
export function CoinFlip() {
  const { bet, settle } = useWallet();
  const [stake, setStake] = useState(5);
  const [pick, setPick] = useState<"crimson" | "steel">("crimson");
  const [face, setFace] = useState<"crimson" | "steel" | null>(null);
  const [spinning, setSpinning] = useState(false);
  const flip = () => {
    if (spinning || !bet(stake)) return;
    setSpinning(true);
    setFace(null);
    sfx.whoosh();
    setTimeout(() => {
      const win = Math.random() < 0.525;
      const result = win ? pick : pick === "crimson" ? "steel" : "crimson";
      setFace(result);
      setSpinning(false);
      if (win) sfx.win();
      else sfx.lose();
      settle(win ? +(stake * PAYOUT).toFixed(2) : 0);
    }, 1200);
  };
  const showing = face ?? pick;
  return (
    <GameLayout
      title="Coin Clash"
      tagline="Pick a side and call the flip."
      icon="coinflip"
      board={
        <div className="flex h-full flex-col items-center justify-center gap-7">
          <div className="scene-3d">
            <div
              className={`animate-coin-flip grid h-44 w-44 place-items-center rounded-full border-8 text-center font-display text-2xl font-black shadow-[var(--shadow-glow)] ${showing === "steel" ? "border-steel bg-surface-2" : "border-primary bg-primary/20"}`}
              style={{ animationPlayState: spinning ? "running" : "paused" }}
            >
              <span>{spinning ? "FLIP" : showing.toUpperCase()}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            The coin flips through the air, then reveals its face.
          </p>
        </div>
      }
      panel={
        <BetPanel
          stake={stake}
          setStake={setStake}
          disabled={spinning}
          onPlay={flip}
          playLabel="Flip coin"
        >
          <div className="grid grid-cols-2 gap-2">
            {(["crimson", "steel"] as const).map((x) => (
              <button
                key={x}
                type="button"
                disabled={spinning}
                onClick={() => {
                  setPick(x);
                  sfx.click();
                }}
                className={`btn-base py-3 capitalize ${pick === x ? "btn-play" : "btn-ghost-soft"}`}
              >
                {x}
              </button>
            ))}
          </div>
        </BetPanel>
      }
    />
  );
}

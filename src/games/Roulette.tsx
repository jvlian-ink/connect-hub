import { useState } from "react";
import { BetPanel } from "@/components/BetPanel";
import { GameLayout } from "@/components/GameLayout";
import { useWallet } from "@/lib/wallet";
import { sfx } from "@/lib/sound";
type Pick = "red" | "black" | "green";
const POCKETS: Pick[] = [
  "green",
  ...Array.from({ length: 18 }, () => "red" as Pick),
  ...Array.from({ length: 18 }, () => "black" as Pick),
];

export function Roulette() {
  const { bet, settle } = useWallet();
  const [stake, setStake] = useState(5);
  const [pick, setPick] = useState<Pick>("red");
  const [result, setResult] = useState<Pick | null>(null);
  const [busy, setBusy] = useState(false);
  const [rotation, setRotation] = useState(0);
  const play = () => {
    if (busy || !bet(stake)) return;
    let index = Math.floor(Math.random() * POCKETS.length);
    let r = POCKETS[index]!;
    if (pick !== "green" && Math.random() < 0.025) {
      r = pick;
      index = POCKETS.findIndex((x) => x === pick);
    }
    setBusy(true);
    setResult(null);
    setRotation((x) => x + 2160 + (360 - index * (360 / POCKETS.length)));
    sfx.whoosh();
    setTimeout(() => {
      setResult(r);
      const m = r === pick ? (pick === "green" ? 30 : 1.95) : 0;
      setBusy(false);
      if (m >= 30) sfx.jackpot();
      else if (m) sfx.win();
      else sfx.lose();
      settle(+(stake * m).toFixed(2));
    }, 2900);
  };
  return (
    <GameLayout
      title="Roulette Flash"
      tagline="Red, black, or the electric green zero."
      icon="roulette"
      board={
        <div className="flex h-full flex-col items-center justify-center gap-7">
          <div className="relative h-64 w-64">
            <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 text-3xl text-primary">
              ▼
            </span>
            <div
              className="absolute inset-0 rounded-full border-[14px] border-background shadow-[var(--shadow-glow)]"
              style={{
                background:
                  "repeating-conic-gradient(var(--primary) 0deg 9.73deg, var(--surface) 9.73deg 19.46deg)",
                transform: `rotate(${rotation}deg)`,
                transition: busy ? "transform 2.9s cubic-bezier(.08,.72,.12,1)" : "none",
              }}
            />
            <div className="absolute inset-[33px] rounded-full border-8 border-win bg-[radial-gradient(circle,var(--surface-2)_0_28%,var(--background)_29%)]" />
            <div className="absolute inset-[83px] grid place-items-center rounded-full bg-background num text-xl font-black">
              {busy ? "SPIN" : (result?.toUpperCase() ?? "0")}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            The ball settles beneath the pointer: colors pay 1.95×, green pays 30×.
          </p>
        </div>
      }
      panel={
        <BetPanel
          stake={stake}
          setStake={setStake}
          disabled={busy}
          onPlay={play}
          playLabel="Spin roulette"
        >
          <div className="grid grid-cols-3 gap-2">
            {(["red", "black", "green"] as Pick[]).map((x) => (
              <button
                key={x}
                type="button"
                disabled={busy}
                onClick={() => {
                  setPick(x);
                  sfx.click();
                }}
                className={`btn-base py-2 capitalize ${pick === x ? "btn-play" : "btn-ghost-soft"}`}
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

import { useState } from "react";
import { BetPanel } from "@/components/BetPanel";
import { GameLayout } from "@/components/GameLayout";
import { NumberField } from "@/components/NumberField";
import { useWallet } from "@/lib/wallet";
import { sfx } from "@/lib/sound";
export function Dice() {
  const { bet, settle } = useWallet();
  const [stake, setStake] = useState(5),
    [target, setTarget] = useState(55),
    [roll, setRoll] = useState<number | null>(null),
    [busy, setBusy] = useState(false);
  const chance = 101 - target,
    mult = +(98 / chance).toFixed(2);
  const play = () => {
    if (busy || !bet(stake)) return;
    setBusy(true);
    setRoll(null);
    sfx.whoosh();
    setTimeout(() => {
      const win = Math.random() < Math.min(0.985, (chance / 100) * 1.015);
      const value = win
        ? target + Math.random() * (100 - target)
        : 1 + Math.random() * (target - 1);
      setRoll(+value.toFixed(2));
      setBusy(false);
      if (win) sfx.win();
      else sfx.lose();
      settle(win ? +(stake * mult).toFixed(2) : 0);
    }, 650);
  };
  return (
    <GameLayout
      title="Dice Dash"
      tagline="Set the line, then beat the roll."
      icon="dice"
      board={
        <div className="flex h-full flex-col items-center justify-center gap-5">
          <div
            className={`num text-7xl font-black ${roll === null ? "text-muted-foreground" : roll >= target ? "text-win" : "text-lose"}`}
          >
            {roll?.toFixed(2) ?? "--.--"}
          </div>
          <div className="text-sm text-muted-foreground">
            Roll <span className="text-foreground">over {target}</span> · {chance}% chance ·{" "}
            <span className="num text-foreground">{mult}×</span>
          </div>
        </div>
      }
      panel={
        <BetPanel
          stake={stake}
          setStake={setStake}
          disabled={busy}
          onPlay={play}
          playLabel="Roll dice"
        >
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Win above
            </span>
            <NumberField
              value={target}
              onCommit={(n) => setTarget(Math.round(n))}
              min={2}
              max={98}
              step={1}
              disabled={busy}
              ariaLabel="Dice target"
            />
          </div>
        </BetPanel>
      }
    />
  );
}

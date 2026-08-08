import { useState } from "react";
import { BetPanel } from "@/components/BetPanel";
import { GameLayout } from "@/components/GameLayout";
import { useWallet } from "@/lib/wallet";
import { sfx } from "@/lib/sound";
const PAY = [0, 0, 1.15, 2.4, 8, 28];
export function Keno() {
  const { bet, settle } = useWallet();
  const [stake, setStake] = useState(5);
  const [picked, setPicked] = useState<number[]>([]);
  const [draw, setDraw] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const toggle = (n: number) =>
    setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : p.length < 5 ? [...p, n] : p));
  const play = () => {
    if (busy || !picked.length || !bet(stake)) return;
    setBusy(true);
    setDraw([]);
    sfx.whoosh();
    setTimeout(() => {
      const bag = Array.from({ length: 20 }, (_, i) => i + 1)
        .sort(() => Math.random() - 0.5)
        .slice(0, 5);
      setDraw(bag);
      const hits = picked.filter((n) => bag.includes(n)).length;
      const m = PAY[hits] ?? 0;
      setBusy(false);
      if (m >= 8) sfx.jackpot();
      else if (m) sfx.win();
      else sfx.lose();
      settle(+(stake * m).toFixed(2));
    }, 850);
  };
  return (
    <GameLayout
      title="Keno Rush"
      tagline="Mark your numbers and sweat the draw."
      icon="keno"
      board={
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => {
            const selected = picked.includes(n);
            const hit = draw.includes(n);
            return (
              <button
                type="button"
                disabled={busy}
                onClick={() => toggle(n)}
                key={n}
                className={`num grid h-12 place-items-center rounded-lg border transition ${hit ? (selected ? "border-primary bg-primary text-primary-foreground" : "border-steel bg-surface-2") : selected ? "border-primary bg-primary/20" : "border-border bg-surface-2"}`}
              >
                {n}
              </button>
            );
          })}
        </div>
      }
      panel={
        <BetPanel
          stake={stake}
          setStake={setStake}
          disabled={busy}
          onPlay={play}
          playLabel={picked.length ? `Draw ${picked.length} picks` : "Pick up to 5"}
          playDisabled={!picked.length}
        >
          <p className="text-xs text-muted-foreground">
            Choose up to five numbers. Five hits pays{" "}
            <span className="num text-foreground">28×</span>.
          </p>
        </BetPanel>
      }
    />
  );
}

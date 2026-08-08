import { useRef, useState } from "react";
import { BetPanel } from "@/components/BetPanel";
import { GameLayout } from "@/components/GameLayout";
import { useWallet } from "@/lib/wallet";
import { sfx } from "@/lib/sound";

const FROGS = [
  { name: "Sir Hops", color: "oklch(0.62 0.2 26)" },
  { name: "Croakzilla", color: "oklch(0.72 0.03 20)" },
  { name: "Lily Bandit", color: "oklch(0.5 0.16 22)" },
  { name: "Mud Rocket", color: "oklch(0.8 0.02 20)" },
  { name: "Toadfather", color: "oklch(0.42 0.12 24)" },
  { name: "Ribbit Jr", color: "oklch(0.66 0.14 28)" },
];

const PADS = 6;
// Your frog wins 17.5% of the time (fair share is 16.67%) and pays 5.9×.
const PICK_WIN_CHANCE = 0.175;
const PAYOUT = 5.9;

export function Frogs() {
  const { bet, settle } = useWallet();
  const [stake, setStake] = useState(5);
  const [pick, setPick] = useState(0);
  const [positions, setPositions] = useState<number[]>(() => FROGS.map(() => 0));
  const [racing, setRacing] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [splash, setSplash] = useState<number | null>(null);
  const busy = useRef(false);

  const race = () => {
    if (busy.current || !bet(stake)) return;
    busy.current = true;
    setRacing(true);
    setWinner(null);
    setSplash(null);
    setPositions(FROGS.map(() => 0));

    // Decide the winner up front so the odds are exactly what we advertise.
    let champ: number;
    if (Math.random() < PICK_WIN_CHANCE) {
      champ = pick;
    } else {
      const others = FROGS.map((_, i) => i).filter((i) => i !== pick);
      champ = others[Math.floor(Math.random() * others.length)]!;
    }

    const pos = FROGS.map(() => 0);
    const tick = setInterval(() => {
      let done = false;
      for (let i = 0; i < FROGS.length; i++) {
        const lead = i === champ ? 0.72 : 0.5;
        if (Math.random() < lead) pos[i] = Math.min(PADS, (pos[i] ?? 0) + 1);
      }
      // Never let a non-champ cross first.
      for (let i = 0; i < FROGS.length; i++) {
        if (i !== champ && (pos[i] ?? 0) >= PADS) pos[i] = PADS - 1;
      }
      if ((pos[champ] ?? 0) >= PADS) done = true;
      setPositions([...pos]);
      setSplash(Math.floor(Math.random() * FROGS.length));
      sfx.hop(Math.max(...pos));

      if (done) {
        clearInterval(tick);
        setRacing(false);
        setWinner(champ);
        const won = champ === pick;
        if (won) sfx.jackpot();
        else sfx.splash();
        settle(won ? +(stake * PAYOUT).toFixed(2) : 0);
        busy.current = false;
      }
    }, 340);
  };

  return (
    <GameLayout
      title="Frog Racing"
      tagline="Six frogs, six lily pads, one winner."
      icon="frogs"
      board={
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-[oklch(0.24_0.02_25)] to-[oklch(0.15_0.01_20)] p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
            <span>Pond</span>
            <span>Finish →</span>
          </div>
          <div className="space-y-2.5">
            {FROGS.map((frog, i) => (
              <div
                key={frog.name}
                className={`relative rounded-xl border px-2 py-2 transition ${
                  i === pick ? "border-primary/60 bg-primary/10" : "border-border/60 bg-surface/40"
                }`}
              >
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className={i === pick ? "text-foreground" : "text-muted-foreground"}>
                    {frog.name}
                    {i === pick ? " · your pick" : ""}
                  </span>
                  {winner === i ? <span className="text-win">winner</span> : null}
                </div>
                <div className="relative flex items-center justify-between">
                  {Array.from({ length: PADS + 1 }, (_, p) => (
                    <span
                      key={p}
                      className="animate-lily grid h-5 w-5 place-items-center rounded-full text-[13px] sm:h-6 sm:w-6"
                      style={{ animationDelay: `${(p + i) * 0.18}s` }}
                    >
                      🪷
                    </span>
                  ))}
                  <span
                    className="absolute text-xl transition-all duration-300 sm:text-2xl"
                    style={{
                      left: `calc(${((positions[i] ?? 0) / PADS) * 100}% - 10px)`,
                      transform: `translateY(${racing ? -6 : 0}px)`,
                      filter: `drop-shadow(0 4px 4px oklch(0 0 0 / 0.6)) hue-rotate(0deg)`,
                      color: frog.color,
                    }}
                  >
                    🐸
                  </span>
                  {splash === i && racing ? (
                    <span
                      className="animate-ripple absolute h-4 w-4 rounded-full border border-steel/60"
                      style={{ left: `calc(${((positions[i] ?? 0) / PADS) * 100}% - 8px)` }}
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      }
      panel={
        <BetPanel
          stake={stake}
          setStake={setStake}
          disabled={racing}
          onPlay={race}
          playLabel={`Race · ${PAYOUT}×`}
        >
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Your frog</span>
            <div className="grid gap-1.5">
              {FROGS.map((f, i) => (
                <button
                  key={f.name}
                  type="button"
                  disabled={racing}
                  onClick={() => {
                    sfx.click();
                    setPick(i);
                  }}
                  className={`btn-base justify-start px-3 py-2 text-xs ${
                    pick === i ? "btn-play" : "btn-ghost-soft"
                  }`}
                >
                  🐸 {f.name}
                </button>
              ))}
            </div>
          </div>
        </BetPanel>
      }
    />
  );
}

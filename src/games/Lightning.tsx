import { useEffect, useRef, useState } from "react";
import { BetPanel } from "@/components/BetPanel";
import { GameLayout } from "@/components/GameLayout";
import { useWallet } from "@/lib/wallet";
import { sfx } from "@/lib/sound";

type Phase = "idle" | "charging" | "armed" | "done";
export function Lightning() {
  const { bet, settle } = useWallet();
  const [stake, setStake] = useState(5);
  const [charge, setCharge] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("Wait for the strike signal, then hit the button.");
  const timeout = useRef<number | null>(null);
  const live = phase === "charging" || phase === "armed";
  useEffect(() => {
    if (!live) return;
    const tick = window.setInterval(() => setCharge((x) => (x + 2.2) % 101), 30);
    return () => window.clearInterval(tick);
  }, [live]);
  useEffect(
    () => () => {
      if (timeout.current) window.clearTimeout(timeout.current);
    },
    [],
  );
  const finish = (automatic = false) => {
    if (!live) return;
    if (timeout.current) window.clearTimeout(timeout.current);
    const m =
      !automatic && phase === "armed"
        ? charge >= 90 && charge <= 93
          ? 18
          : charge >= 74 && charge <= 79
            ? 3.5
            : charge >= 57 && charge <= 64
              ? 1.35
              : 0
        : 0;
    setPhase("done");
    setMessage(
      automatic
        ? "Too slow — the charge faded."
        : m
          ? `STRIKE! ${m}× payout.`
          : "Missed the narrow strike zones.",
    );
    if (m >= 18) sfx.jackpot();
    else if (m) sfx.win();
    else sfx.lose();
    settle(+(stake * m).toFixed(2));
  };
  const start = () => {
    if (!bet(stake)) return;
    setCharge(0);
    setPhase("charging");
    setMessage("CHARGING… wait for the signal.");
    sfx.whoosh();
    const delay = 1200 + Math.random() * 1800;
    timeout.current = window.setTimeout(() => {
      setPhase("armed");
      setMessage("STRIKE NOW!");
      sfx.reveal();
      timeout.current = window.setTimeout(() => finish(true), 950);
    }, delay);
  };
  return (
    <GameLayout
      title="Lightning Strike"
      tagline="Wait for the signal, then time the strike."
      icon="lightning"
      board={
        <div className="flex h-full flex-col items-center justify-center gap-8">
          <div className="w-full max-w-md">
            <div className="mb-2 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>Miss</span>
              <span className="text-win">1.35×</span>
              <span className="text-primary">3.5×</span>
              <span className="text-foreground">18×</span>
            </div>
            <div className="relative h-16 overflow-hidden rounded-xl bg-surface p-1">
              <div className="absolute inset-y-0 left-[57%] w-[7%] bg-win/50" />
              <div className="absolute inset-y-0 left-[74%] w-[6%] bg-primary/60" />
              <div className="absolute inset-y-0 left-[90%] w-[4%] bg-foreground/50" />
              <div
                className="relative h-full w-1 bg-foreground shadow-[0_0_12px_white]"
                style={{ transform: `translateX(calc(${charge * 100}% - 2px))` }}
              />
            </div>
          </div>
          <div
            className={`font-display text-2xl font-black ${phase === "armed" ? "animate-pulse text-primary" : "text-foreground"}`}
          >
            {phase === "armed" ? "STRIKE NOW!" : phase === "charging" ? "WAIT…" : "READY"}
          </div>
          <div className="num text-5xl font-black">{charge.toFixed(0)}%</div>
          <p className="text-sm text-muted-foreground">{message}</p>
          {phase === "armed" && (
            <button
              type="button"
              onClick={() => finish()}
              className="btn-base btn-play px-12 py-4 text-lg"
            >
              STRIKE
            </button>
          )}
        </div>
      }
      panel={
        <BetPanel
          stake={stake}
          setStake={setStake}
          disabled={live}
          onPlay={start}
          playLabel="Charge up"
        >
          <p className="text-xs text-muted-foreground">
            Wait for the signal. You then have less than a second to hit one of the narrow payout
            zones.
          </p>
        </BetPanel>
      }
    />
  );
}

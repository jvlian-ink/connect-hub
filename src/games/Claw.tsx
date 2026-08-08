import { useEffect, useState } from "react";
import { BetPanel } from "@/components/BetPanel";
import { GameLayout } from "@/components/GameLayout";
import { useWallet } from "@/lib/wallet";
import { sfx } from "@/lib/sound";

const PRIZES = ["SMALL", "MEDIUM", "MEGA", "MEDIUM", "SMALL"];
const PAYOUTS = [0, 1.35, 8, 1.35, 0];

export function Claw() {
  const { bet, settle } = useWallet();
  const [stake, setStake] = useState(5);
  const [position, setPosition] = useState(0);
  const [live, setLive] = useState(false);
  const [message, setMessage] = useState("Start the claw, then stop it over a prize.");

  useEffect(() => {
    if (!live) return;
    const interval = window.setInterval(() => setPosition(p => (p + 1) % PRIZES.length), 330);
    return () => window.clearInterval(interval);
  }, [live]);

  const start = () => { if (!bet(stake)) return; setPosition(0); setLive(true); setMessage("Line up the claw, then GRAB."); sfx.whoosh(); };
  const grab = () => {
    if (!live) return;
    setLive(false);
    const payout = PAYOUTS[position] ?? 0;
    setMessage(payout ? `${PRIZES[position]} prize! ${payout}x payout.` : "Empty grab. The prize slipped away.");
    if (payout >= 8) sfx.jackpot(); else if (payout) sfx.win(); else sfx.lose();
    settle(+(stake * payout).toFixed(2));
  };
  return <GameLayout title="Prize Claw" tagline="Time the grab and snag a glowing prize." icon="claw" board={<div className="flex h-full flex-col items-center justify-center gap-6"><div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface p-5"><div className="absolute top-0 h-14 w-12 -translate-x-1/2 transition-transform duration-300" style={{ left: `${10 + position * 20}%` }}><div className="mx-auto h-8 w-0.5 bg-primary"/><div className="flex justify-center gap-1 text-primary"><span>\</span><span>|</span><span>/</span></div></div><div className="mt-14 grid grid-cols-5 gap-2">{PRIZES.map((prize, i) => <div key={i} className={`grid h-20 place-items-center rounded-lg border text-center text-[10px] font-bold transition ${position === i && live ? "border-primary bg-primary/20 shadow-[var(--shadow-glow)]" : "border-border bg-background"}`}>{prize}<br/>{PAYOUTS[i]}x</div>)}</div></div><p className="font-display text-lg">{message}</p>{live && <button type="button" onClick={grab} className="btn-base btn-play px-12 py-4 text-lg">GRAB</button>}</div>} panel={<BetPanel stake={stake} setStake={setStake} disabled={live} onPlay={live ? undefined : start} playLabel="Start claw"><p className="text-xs text-muted-foreground">The center MEGA prize pays 8x. Time the claw to catch it.</p></BetPanel>} />;
}

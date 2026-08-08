import { useState } from "react";
import { BetPanel } from "@/components/BetPanel";
import { GameLayout } from "@/components/GameLayout";
import { useWallet } from "@/lib/wallet";
import { sfx } from "@/lib/sound";

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export function CardWar() {
  const { bet, settle } = useWallet();
  const [stake, setStake] = useState(5);
  const [mine, setMine] = useState<string | null>(null);
  const [dealer, setDealer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Draw higher than the dealer to win.");

  const play = () => {
    if (busy || !bet(stake)) return;
    setBusy(true); setMine(null); setDealer(null); setMessage("Dealer draws first…"); sfx.whoosh();
    const dealerValue = Math.floor(Math.random() * 13) + 1;
    const win = Math.random() < 0.525;
    let myValue = dealerValue;
    if (win) myValue = dealerValue === 13 ? 13 : dealerValue + 1 + Math.floor(Math.random() * (13 - dealerValue));
    else if (dealerValue > 1) myValue = Math.floor(Math.random() * (dealerValue - 1)) + 1;
    window.setTimeout(() => { setDealer(RANKS[dealerValue - 1] ?? "A"); sfx.card(); setMessage("Your turn…"); }, 550);
    window.setTimeout(() => {
      setMine(RANKS[myValue - 1] ?? "A"); setBusy(false);
      const payout = win ? +(stake * 1.92).toFixed(2) : 0;
      setMessage(win ? "You win the war! 1.92x payout." : "Dealer takes this round.");
      if (win) sfx.win(); else sfx.lose();
      settle(payout);
    }, 1250);
  };

  const card = (value: string | null, label: string, hidden: boolean) => <div className="text-center"><div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{label}</div><div className={`grid h-38 w-26 place-items-center rounded-xl border text-5xl font-black shadow-[var(--shadow-panel)] ${hidden ? "animate-pulse border-primary bg-primary/25" : value ? "animate-tile-in border-border bg-surface-2" : "border-dashed border-border bg-surface"}`}>{hidden ? "?" : value ?? "?"}</div></div>;
  return <GameLayout title="Card War" tagline="Flip against the dealer. Highest card wins." icon="cardwar" board={<div className="flex h-full flex-col items-center justify-center gap-8"><div className="flex items-center gap-8 sm:gap-14">{card(dealer, "Dealer", busy && !dealer)}<span className="font-display text-2xl text-primary">VS</span>{card(mine, "You", busy && Boolean(dealer) && !mine)}</div><p className="font-display text-lg">{message}</p></div>} panel={<BetPanel stake={stake} setStake={setStake} disabled={busy} onPlay={play} playLabel="Declare war"><p className="text-xs text-muted-foreground">Higher card wins. Aces are low, kings are high. Wins pay 1.92x.</p></BetPanel>} />;
}

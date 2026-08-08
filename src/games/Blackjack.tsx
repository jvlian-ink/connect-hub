import { useState } from "react";
import { BetPanel } from "@/components/BetPanel";
import { GameLayout } from "@/components/GameLayout";
import { freshDeck, handTotal, isRed, label, type Card } from "@/lib/cards";
import { useWallet } from "@/lib/wallet";
import { sfx } from "@/lib/sound";

// Dealer stands on 16 instead of 17 — noticeably softer than a real table.
const DEALER_STAND = 16;
const BLACKJACK_PAYS = 2.5;

type Phase = "idle" | "player" | "done";

function CardView({ card, hidden }: { card: Card; hidden?: boolean }) {
  if (hidden) {
    return (
      <div className="animate-tile-in grid h-24 w-16 place-items-center rounded-lg border border-border chip-blood text-xl sm:h-28 sm:w-20">
        ✦
      </div>
    );
  }
  return (
    <div
      className={`animate-tile-in grid h-24 w-16 place-items-center rounded-lg border border-border bg-surface-2 text-xl font-bold sm:h-28 sm:w-20 ${
        isRed(card) ? "text-primary" : "text-foreground"
      }`}
    >
      {label(card)}
    </div>
  );
}

export function Blackjack() {
  const { bet, settle } = useWallet();
  const [stake, setStake] = useState(5);
  const [deck, setDeck] = useState<Card[]>([]);
  const [player, setPlayer] = useState<Card[]>([]);
  const [dealer, setDealer] = useState<Card[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("Place a bet to deal.");

  const pTotal = handTotal(player);
  const dTotal = handTotal(dealer);

  const finish = (dealerCards: Card[], playerCards: Card[], multiplier: number, text: string) => {
    setDealer(dealerCards);
    setPlayer(playerCards);
    setPhase("done");
    setMessage(text);
    if (multiplier > 0) sfx.win();
    else sfx.lose();
    settle(+(stake * multiplier).toFixed(2));
  };

  const deal = () => {
    if (phase === "player" || !bet(stake)) return;
    const d = freshDeck();
    const p = [d.pop()!, d.pop()!];
    const h = [d.pop()!, d.pop()!];
    setDeck(d);
    setPlayer(p);
    setDealer(h);
    sfx.card();
    setTimeout(() => sfx.card(), 120);

    const pBJ = handTotal(p) === 21;
    const dBJ = handTotal(h) === 21;
    if (pBJ || dBJ) {
      if (pBJ && dBJ) finish(h, p, 1, "Push — both blackjack.");
      else if (pBJ) finish(h, p, BLACKJACK_PAYS, `Blackjack! ${BLACKJACK_PAYS}× payout.`);
      else finish(h, p, 0, "Dealer blackjack.");
      return;
    }
    setPhase("player");
    setMessage("Hit or stand.");
  };

  const hit = () => {
    if (phase !== "player") return;
    const d = [...deck];
    const next = [...player, d.pop()!];
    setDeck(d);
    setPlayer(next);
    sfx.card();
    const total = handTotal(next);
    if (total > 21) finish(dealer, next, 0, `Bust with ${total}.`);
    else if (total === 21) stand(next, d);
  };

  const stand = (playerCards = player, workingDeck = deck) => {
    if (phase !== "player" && playerCards === player) return;
    const d = [...workingDeck];
    const h = [...dealer];
    while (handTotal(h) < DEALER_STAND) {
      h.push(d.pop()!);
    }
    setDeck(d);
    const dt = handTotal(h);
    const pt = handTotal(playerCards);
    if (dt > 21) finish(h, playerCards, 2, `Dealer busts with ${dt}. You win.`);
    else if (dt > pt) finish(h, playerCards, 0, `Dealer ${dt} beats your ${pt}.`);
    else if (dt < pt) finish(h, playerCards, 2, `Your ${pt} beats dealer ${dt}.`);
    else finish(h, playerCards, 1, `Push on ${pt}.`);
  };

  const doubleDown = () => {
    if (phase !== "player" || player.length !== 2) return;
    if (!bet(stake)) return;
    const d = [...deck];
    const next = [...player, d.pop()!];
    setDeck(d);
    setPlayer(next);
    sfx.chip();
    setStakeDoubled();
    function setStakeDoubled() {
      /* stake state stays; payouts below already account for the 2× wager */
    }
    const total = handTotal(next);
    if (total > 21) {
      setPhase("done");
      setMessage(`Doubled and busted with ${total}.`);
      sfx.lose();
      settle(0);
      return;
    }
    // resolve dealer against the doubled wager
    const h = [...dealer];
    while (handTotal(h) < DEALER_STAND) h.push(d.pop()!);
    const dt = handTotal(h);
    setDealer(h);
    setPhase("done");
    if (dt > 21 || total > dt) {
      setMessage(dt > 21 ? `Dealer busts with ${dt}. Double paid.` : `Double wins ${total} vs ${dt}.`);
      sfx.jackpot();
      settle(+(stake * 4).toFixed(2));
    } else if (dt === total) {
      setMessage(`Push on ${total}.`);
      settle(+(stake * 2).toFixed(2));
    } else {
      setMessage(`Dealer ${dt} beats your ${total}.`);
      sfx.lose();
      settle(0);
    }
  };

  const hideHole = phase === "player";

  return (
    <GameLayout
      title="Blackjack"
      tagline="The dealer isn't as sharp as he thinks."
      icon="blackjack"
      board={
        <div className="flex h-full flex-col justify-between gap-6">
          <div>
            <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
              Dealer {phase === "idle" ? "" : hideHole ? "" : `· ${dTotal}`}
            </div>
            <div className="flex gap-2">
              {dealer.map((c, i) => (
                <CardView key={c.id + i} card={c} hidden={hideHole && i === 1} />
              ))}
              {dealer.length === 0 ? (
                <div className="grid h-24 w-16 place-items-center rounded-lg border border-dashed border-border text-muted-foreground sm:h-28 sm:w-20">
                  ?
                </div>
              ) : null}
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            {message}
            <div className="mt-1 text-xs">Dealer stands on {DEALER_STAND}.</div>
          </div>

          <div>
            <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
              You {player.length ? `· ${pTotal}` : ""}
            </div>
            <div className="flex gap-2">
              {player.map((c, i) => (
                <CardView key={c.id + i} card={c} />
              ))}
              {player.length === 0 ? (
                <div className="grid h-24 w-16 place-items-center rounded-lg border border-dashed border-border text-muted-foreground sm:h-28 sm:w-20">
                  ?
                </div>
              ) : null}
            </div>
          </div>
        </div>
      }
      panel={
        <BetPanel
          stake={stake}
          setStake={setStake}
          disabled={phase === "player"}
          onPlay={phase === "player" ? undefined : deal}
          playLabel="Deal"
        >
          {phase === "player" ? (
            <div className="grid gap-2">
              <button type="button" onClick={hit} className="btn-base btn-play w-full py-3">
                Hit
              </button>
              <button
                type="button"
                onClick={() => stand()}
                className="btn-base btn-ghost-soft w-full py-3"
              >
                Stand
              </button>
              <button
                type="button"
                disabled={player.length !== 2}
                onClick={doubleDown}
                className="btn-base btn-ghost-soft w-full py-3"
              >
                Double down
              </button>
            </div>
          ) : null}
        </BetPanel>
      }
    />
  );
}

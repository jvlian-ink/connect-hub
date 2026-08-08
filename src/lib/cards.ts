export type Card = { rank: number; suit: "♠" | "♥" | "♦" | "♣"; id: string };

export const SUITS: Card["suit"][] = ["♠", "♥", "♦", "♣"];
export const RANK_LABELS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export const isRed = (c: Card) => c.suit === "♥" || c.suit === "♦";
export const label = (c: Card) => `${RANK_LABELS[c.rank]}${c.suit}`;

export function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ rank, suit, id: `${rank}${suit}` });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i]!, deck[j]!] = [deck[j]!, deck[i]!];
  }
  return deck;
}

/** Blackjack total with soft-ace handling. */
export function handTotal(cards: Card[]) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === 1) {
      aces++;
      total += 11;
    } else total += Math.min(10, c.rank);
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

export type GameMeta = {
  id: string;
  name: string;
  tagline: string;
  emoji: string;
  accent: string;
};

export const GAMES: GameMeta[] = [
  {
    id: "crash",
    name: "Crash",
    tagline: "Ride the curve, bail before the bust.",
    emoji: "📈",
    accent: "from-primary/25",
  },
  {
    id: "mines",
    name: "Mines",
    tagline: "Pick your own bomb count. Dig carefully.",
    emoji: "💥",
    accent: "from-accent/25",
  },
  {
    id: "limbo",
    name: "Limbo",
    tagline: "Name a target. Beat the roll.",
    emoji: "🎯",
    accent: "from-steel/25",
  },
  {
    id: "plinko",
    name: "Plinko",
    tagline: "Drop the ball, pray for the edges.",
    emoji: "🔻",
    accent: "from-primary/25",
  },
  {
    id: "chicken",
    name: "Chicken",
    tagline: "Cross the traffic one lane at a time.",
    emoji: "🐔",
    accent: "from-accent/25",
  },
  {
    id: "blackjack",
    name: "Blackjack",
    tagline: "The dealer isn't as sharp as he thinks.",
    emoji: "🃏",
    accent: "from-steel/25",
  },
  {
    id: "frogs",
    name: "Frog Racing",
    tagline: "Six frogs, six lily pads, one winner.",
    emoji: "🐸",
    accent: "from-primary/25",
  },
  {
    id: "poker",
    name: "Poker Draw",
    tagline: "Five cards, one draw, paytable payouts.",
    emoji: "♠️",
    accent: "from-accent/25",
  },
  {
    id: "highlow",
    name: "Higher / Lower",
    tagline: "Will the next multiplier climb or fall?",
    emoji: "🔀",
    accent: "from-steel/25",
  },
  {
    id: "wheel",
    name: "Lucky Wheel",
    tagline: "Spin for multipliers, chase the jackpot.",
    emoji: "",
    accent: "from-primary/25",
  },
  {
    id: "slots",
    name: "Neon Slots",
    tagline: "Three reels. Big symbols. Instant hits.",
    emoji: "",
    accent: "from-accent/25",
  },
  {
    id: "keno",
    name: "Keno Rush",
    tagline: "Mark your numbers and sweat the draw.",
    emoji: "",
    accent: "from-steel/25",
  },
  {
    id: "dice",
    name: "Dice Dash",
    tagline: "Set the line, then beat the roll.",
    emoji: "",
    accent: "from-primary/25",
  },
  {
    id: "coinflip",
    name: "Coin Clash",
    tagline: "Pick a side and call the flip.",
    emoji: "",
    accent: "from-accent/25",
  },
  {
    id: "roulette",
    name: "Roulette Flash",
    tagline: "Red, black, or the electric green zero.",
    emoji: "",
    accent: "from-steel/25",
  },
  {
    id: "towers",
    name: "Sky Towers",
    tagline: "Climb the floors, avoid the wrong door.",
    emoji: "",
    accent: "from-primary/25",
  },
  {
    id: "vault",
    name: "Treasure Vault",
    tagline: "Open chambers, collect gems, cash out.",
    emoji: "",
    accent: "from-accent/25",
  },
  {
    id: "scratch",
    name: "Scratch Blitz",
    tagline: "Reveal nine tiles and hunt matching symbols.",
    emoji: "",
    accent: "from-steel/25",
  },
  {
    id: "lightning",
    name: "Lightning Strike",
    tagline: "Stop the charge inside the payout zone.",
    emoji: "",
    accent: "from-primary/25",
  },
  {
    id: "cardwar",
    name: "Card War",
    tagline: "Flip against the dealer. Highest card wins.",
    emoji: "",
    accent: "from-accent/25",
  },
];

export const gameById = (id: string) => GAMES.find((g) => g.id === id);
import { createFileRoute, Link } from "@tanstack/react-router";
import { gameById } from "@/lib/games";
import { Crash } from "@/games/Crash";
import { Mines } from "@/games/Mines";
import { Limbo } from "@/games/Limbo";
import { Plinko } from "@/games/Plinko";
import { Chicken } from "@/games/Chicken";
import { Blackjack } from "@/games/Blackjack";
import { Frogs } from "@/games/Frogs";
import { Poker } from "@/games/Poker";
import { HighLow } from "@/games/HighLow";
import { Wheel } from "@/games/Wheel";
import { Slots } from "@/games/Slots";
import { Keno } from "@/games/Keno";
import { Dice } from "@/games/Dice";
import { CoinFlip } from "@/games/CoinFlip";
import { Roulette } from "@/games/Roulette";
import { Towers } from "@/games/Towers";
import { Vault } from "@/games/Vault";
import { Scratch } from "@/games/Scratch";
import { Lightning } from "@/games/Lightning";
import { CardWar } from "@/games/CardWar";
import { Claw } from "@/games/Claw";

const REGISTRY: Record<string, () => React.ReactElement> = {
  crash: Crash,
  mines: Mines,
  limbo: Limbo,
  plinko: Plinko,
  chicken: Chicken,
  blackjack: Blackjack,
  frogs: Frogs,
  poker: Poker,
  highlow: HighLow,
  wheel: Wheel,
  slots: Slots,
  keno: Keno,
  dice: Dice,
  coinflip: CoinFlip,
  roulette: Roulette,
  towers: Towers,
  vault: Vault,
  scratch: Scratch,
  lightning: Lightning,
  cardwar: CardWar,
  claw: Claw,
};

export const Route = createFileRoute("/game/$id")({
  head: ({ params }) => {
    const meta = gameById(params.id);
    const title = meta ? `${meta.name} — Flared` : "Game — Flared";
    const description = meta?.tagline ?? "Play the Flared games with fake currency.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: GamePage,
});

function GamePage() {
  const { id } = Route.useParams();
  const Game = REGISTRY[id];

  if (!Game) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Unknown game</h1>
        <p className="mt-2 text-sm text-muted-foreground">"{id}" isn't on Flared (yet).</p>
        <Link to="/" className="btn-base btn-play mt-6 px-4 py-2 text-sm">
          Back to lobby
        </Link>
      </div>
    );
  }

  return <Game />;
}

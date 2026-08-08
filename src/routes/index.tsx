import { createFileRoute, Link } from "@tanstack/react-router";
import { GAMES } from "@/lib/games";
import { fmt, useWallet, FAILSAFE_DAILY_LIMIT } from "@/lib/wallet";
import { sfx } from "@/lib/sound";
import { GameIcon } from "@/components/GameIcon";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flared — Nine Games, One Fake Bankroll" },
      {
        name: "description",
        content:
          "Crash, Mines, Limbo, Plinko, Chicken, Blackjack, Frog Racing, Poker Draw and Higher/Lower. Fake currency, real leaderboard.",
      },
      { property: "og:title", content: "Flared — Nine Games, One Fake Bankroll" },
      {
        property: "og:description",
        content: "Pick a name, take 250 credits, and see how far you can climb.",
      },
    ],
  }),
  component: Lobby,
});

function Lobby() {
  const { name, displayBalance, biggestWin, rounds, totalWagered, failsafeLeft } = useWallet();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="panel mb-8 overflow-hidden p-6 sm:p-8">
        <h1 className="font-display text-3xl font-black sm:text-5xl">
          Welcome back, <span className="text-shine">{name}</span>
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Every credit here is fake. The only thing on the line is your spot on the leaderboard.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { k: "Balance", v: fmt(displayBalance) },
            { k: "Biggest win", v: fmt(biggestWin) },
            { k: "Rounds", v: String(rounds) },
            { k: "Wagered", v: fmt(totalWagered) },
          ].map((s) => (
            <div key={s.k} className="rounded-xl border border-border bg-surface/60 px-3 py-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {s.k}
              </div>
              <div className="num text-lg font-semibold">{s.v}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="rounded-full bg-surface-2 px-3 py-1">
            Fail Safe: {failsafeLeft}/{FAILSAFE_DAILY_LIMIT} left today
          </span>
          <Link
            to="/leaderboard"
            onClick={() => sfx.click()}
            className="rounded-full bg-primary/15 px-3 py-1 text-foreground transition hover:bg-primary/25"
          >
            View leaderboard →
          </Link>
        </div>
      </section>

      <h2 className="mb-4 font-display text-xl font-bold">Games</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((g) => (
          <Link
            key={g.id}
            to="/game/$id"
            params={{ id: g.id }}
            onClick={() => sfx.click()}
            onMouseEnter={() => sfx.hover()}
            className={`group panel relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)]`}
          >
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${g.accent} to-transparent opacity-60`}
            />
            <div className="relative">
              <GameIcon id={g.id} className="h-12 w-12" />
              <div className="mt-3 font-display text-lg font-bold">{g.name}</div>
              <p className="mt-1 text-xs text-muted-foreground">{g.tagline}</p>
              <div className="mt-4 text-xs font-semibold text-primary opacity-0 transition group-hover:opacity-100">
                Play now →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

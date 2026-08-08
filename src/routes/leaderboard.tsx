import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { getBiggestWins, getLeaderboard, type Period } from "@/lib/players.functions";
import { fmt, useWallet } from "@/lib/wallet";
import { sfx } from "@/lib/sound";

const richestQuery = (period: Period) =>
  queryOptions({
    queryKey: ["leaderboard", period],
    queryFn: () => getLeaderboard({ data: { period } }),
    staleTime: 15_000,
  });

const winsQuery = queryOptions({
  queryKey: ["leaderboard", "biggest-wins"],
  queryFn: () => getBiggestWins(),
  staleTime: 15_000,
});

const PERIOD_TABS: { id: Period; label: string }[] = [
  { id: "day", label: "Daily" },
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
  { id: "year", label: "Yearly" },
  { id: "all", label: "All time" },
];

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Flared" },
      {
        name: "description",
        content: "Daily, weekly, monthly, yearly and all-time rankings, plus the biggest single wins on Flared.",
      },
      { property: "og:title", content: "Leaderboard — Flared" },
      {
        property: "og:description",
        content: "The richest players on Flared and the biggest payouts ever landed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Leaderboard,
  errorComponent: ({ error }) => (
    <div role="alert" className="mx-auto max-w-md px-4 py-20 text-center text-sm text-muted-foreground">
      Couldn't load the leaderboard: {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-muted-foreground">
      No players yet.
    </div>
  ),
});

type Row = { rank: number; name: string; balance: number; biggestWin: number; rounds: number };

function Board({
  rows,
  loading,
  valueLabel,
  valueOf,
  me,
}: {
  rows: Row[];
  loading: boolean;
  valueLabel: string;
  valueOf: (r: Row) => number;
  me: string | null;
}) {
  return (
    <div className="panel mt-4 overflow-hidden">
      <div className="grid grid-cols-[3rem_1fr_auto] gap-3 border-b border-border px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground sm:grid-cols-[3rem_1fr_7rem_6rem]">
        <span>#</span>
        <span>Player</span>
        <span className="hidden text-right sm:block">Rounds</span>
        <span className="text-right">{valueLabel}</span>
      </div>
      {loading ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          Nothing here yet for this window. Go play a few rounds.
        </div>
      ) : (
        rows.map((row) => {
          const mine = row.name === me;
          return (
            <div
              key={`${row.rank}-${row.name}`}
              className={`grid grid-cols-[3rem_1fr_auto] items-center gap-3 border-b border-border/50 px-4 py-3 text-sm sm:grid-cols-[3rem_1fr_7rem_6rem] ${
                mine ? "bg-primary/10" : ""
              }`}
            >
              <span
                className={`num font-semibold ${
                  row.rank === 1
                    ? "text-primary"
                    : row.rank <= 3
                      ? "text-accent"
                      : "text-muted-foreground"
                }`}
              >
                {row.rank}
              </span>
              <span className="truncate">
                {row.name}
                {mine ? <span className="ml-2 text-xs text-primary">you</span> : null}
              </span>
              <span className="num hidden text-right text-muted-foreground sm:block">
                {row.rounds}
              </span>
              <span className="num text-right font-semibold">{fmt(valueOf(row))}</span>
            </div>
          );
        })
      )}
    </div>
  );
}

function Leaderboard() {
  const { name } = useWallet();
  const [board, setBoard] = useState<"richest" | "wins">("richest");
  const [period, setPeriod] = useState<Period>("all");

  const richest = useQuery(richestQuery(period));
  const wins = useQuery({ ...winsQuery, enabled: board === "wins" });

  const tab = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-semibold transition ${
      active
        ? "bg-primary text-primary-foreground"
        : "bg-surface-2 text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-black">
        <span className="text-shine">Leaderboard</span>
      </h1>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={tab(board === "richest")}
          onClick={() => {
            sfx.click();
            setBoard("richest");
          }}
        >
          Top bankrolls
        </button>
        <button
          type="button"
          className={tab(board === "wins")}
          onClick={() => {
            sfx.click();
            setBoard("wins");
          }}
        >
          Biggest win (all time)
        </button>
      </div>

      {board === "richest" ? (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {PERIOD_TABS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={tab(period === p.id)}
                onClick={() => {
                  sfx.click();
                  setPeriod(p.id);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {period === "all"
              ? "Ranked by current balance."
              : "Ranked by credits gained inside this window."}
          </p>
          <Board
            rows={richest.data ?? []}
            loading={richest.isPending}
            valueLabel={period === "all" ? "Balance" : "Gained"}
            valueOf={(r) => r.balance}
            me={name}
          />
        </>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted-foreground">
            The single biggest payout each player has ever landed.
          </p>
          <Board
            rows={wins.data ?? []}
            loading={wins.isPending}
            valueLabel="Biggest win"
            valueOf={(r) => r.biggestWin}
            me={name}
          />
        </>
      )}
    </div>
  );
}

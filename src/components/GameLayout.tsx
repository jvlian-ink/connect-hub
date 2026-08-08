import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { sfx } from "@/lib/sound";
import { GameIcon } from "@/components/GameIcon";

export function GameLayout({
  title,
  tagline,
  icon,
  board,
  panel,
}: {
  title: string;
  tagline: string;
  icon: string;
  board: ReactNode;
  panel: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex items-center gap-3">
        <Link
          to="/"
          onClick={() => sfx.click()}
          className="btn-base btn-ghost-soft h-9 px-3 text-sm"
        >
          ← Lobby
        </Link>
        <div className="flex items-center gap-3">
          <GameIcon id={icon} className="h-10 w-10" />
          <div>
            <h1 className="font-display text-xl font-bold">{title}</h1>
            <p className="text-xs text-muted-foreground">{tagline}</p>
          </div>
        </div>
      </div>


      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="panel min-h-[420px] p-4 sm:p-6">{board}</div>
        <div>{panel}</div>
      </div>
    </div>
  );
}

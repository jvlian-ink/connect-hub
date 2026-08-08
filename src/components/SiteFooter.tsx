import { Link } from "@tanstack/react-router";
import { sfx } from "@/lib/sound";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border/70 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center">
        <p className="text-xs text-muted-foreground">
          Flared · fake currency, real bragging rights.
        </p>
        <div className="flex items-center gap-4 text-sm">
          <Link
            to="/leaderboard"
            onClick={() => sfx.click()}
            className="text-muted-foreground transition hover:text-foreground"
          >
            Leaderboard
          </Link>
          <Link
            to="/credits"
            onClick={() => sfx.click()}
            className="text-primary transition hover:brightness-125"
          >
            Credits
          </Link>
        </div>
      </div>
    </footer>
  );
}

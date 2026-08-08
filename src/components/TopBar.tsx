import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fmt, useWallet } from "@/lib/wallet";
import { isMuted, primeAudio, setMuted, sfx } from "@/lib/sound";
import { applyTheme, readTheme, type Theme } from "@/lib/theme";

export function TopBar() {
  const { displayBalance, floats, name, failsafeLeft, accountEmail, signOut } = useWallet();
  const [quiet, setQuiet] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => setQuiet(isMuted()), []);
  useEffect(() => {
    const t = readTheme();
    setTheme(t);
    applyTheme(t);
  }, []);


  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link
          to="/"
          onClick={() => sfx.click()}
          className="flex items-center gap-2 font-display text-lg font-bold tracking-tight"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg chip-blood text-sm">F</span>
          <span className="hidden sm:inline text-shine">FLARED</span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 sm:flex">
          <Link
            to="/leaderboard"
            onClick={() => sfx.click()}
            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
          >
            Leaderboard
          </Link>
          <Link
            to="/credits"
            onClick={() => sfx.click()}
            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
          >
            Credits
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              primeAudio();
              const next = !quiet;
              setQuiet(next);
              setMuted(next);
              if (!next) sfx.coin();
            }}
            aria-label={quiet ? "Unmute sound" : "Mute sound"}
            className="btn-base btn-ghost-soft h-9 w-9 text-sm"
          >
            {quiet ? "🔇" : "🔊"}
          </button>

          <button
            type="button"
            onClick={() => {
              sfx.click();
              const next: Theme = theme === "dark" ? "light" : "dark";
              setTheme(next);
              applyTheme(next);
            }}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to night mode"}
            title={theme === "dark" ? "Light mode" : "Night mode"}
            className="btn-base btn-ghost-soft h-9 w-9 text-sm"
          >
            {theme === "dark" ? "🌙" : "☀️"}
          </button>



          {name ? (
            <span className="hidden rounded-lg bg-surface-2 px-3 py-1.5 text-sm sm:inline">
              {name}
            </span>
          ) : null}

{name ? (
  <button
    type="button"
    onClick={() => {
      sfx.click();
      void signOut();
    }}
    className="btn-base btn-ghost-soft px-3 py-1.5 text-xs inline-flex"
  >
    Log out
  </button>
) : null}
          <div className="relative rounded-xl border border-border bg-surface px-3 py-1.5 text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Balance · {failsafeLeft} fail safe
            </div>
            <div className="num text-base font-semibold text-foreground">
              {fmt(displayBalance)}
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-0">
              {floats.map((f) => (
                <span
                  key={f.id}
                  className={`animate-pop-up absolute right-2 num text-sm font-semibold ${
                    f.amount >= 0 ? "text-win" : "text-muted-foreground"
                  }`}
                >
                  {f.amount >= 0 ? "+" : "−"}
                  {fmt(Math.abs(f.amount))}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

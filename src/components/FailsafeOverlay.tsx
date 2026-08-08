import { FAILSAFE_AMOUNT, FAILSAFE_DAILY_LIMIT, fmt, useWallet } from "@/lib/wallet";

const SPARKS = Array.from({ length: 18 }, (_, i) => {
  const a = (i / 18) * Math.PI * 2;
  return { dx: `${Math.cos(a) * 220}px`, dy: `${Math.sin(a) * 200}px`, d: i * 0.035 };
});

/** The long, flashy Fail Safe cinematic — only ever shown at a genuine 0.00. */
export function FailsafeOverlay() {
  const { failsafeActive, failsafeDenied, failsafeLeft } = useWallet();
  if (!failsafeActive && !failsafeDenied) return null;

  if (failsafeDenied) {
    return (
      <div className="pointer-events-none fixed inset-0 z-[60] grid place-items-center px-4">
        <div className="animate-shake panel max-w-sm border-primary/50 p-6 text-center">
          <div className="text-4xl">🚫</div>
          <h2 className="mt-3 font-display text-xl font-bold">Fail Safe exhausted</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            All {FAILSAFE_DAILY_LIMIT} rescues used today. Resets at 00:00 UTC.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      <div className="animate-screen-flash absolute inset-0 bg-primary/40" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="relative">
          <div className="animate-failsafe-flare absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/45 blur-3xl" />
          <div className="animate-failsafe-ring absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary/70" />
          <div
            className="animate-failsafe-ring absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/60"
            style={{ animationDelay: "0.35s" }}
          />
          {SPARKS.map((s, i) => (
            <span
              key={i}
              className="animate-spark absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-accent"
              style={
                {
                  "--dx": s.dx,
                  "--dy": s.dy,
                  animationDelay: `${s.d}s`,
                } as React.CSSProperties
              }
            />
          ))}

          <div className="animate-failsafe-card relative overflow-hidden rounded-3xl border border-primary/60 bg-card/95 px-8 py-7 text-center shadow-[var(--shadow-glow)] sm:px-14 sm:py-10">
            <div className="animate-failsafe-sweep absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
            <div className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">
              Fail Safe engaged
            </div>
            <div className="num mt-3 text-5xl font-black text-foreground sm:text-6xl">
              +{fmt(FAILSAFE_AMOUNT)}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              You hit absolute zero. The house floats you a lifeline.
            </p>
            <div className="mt-4 inline-flex rounded-full bg-surface-2 px-3 py-1 text-xs text-muted-foreground">
              {failsafeLeft} of {FAILSAFE_DAILY_LIMIT} left today
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

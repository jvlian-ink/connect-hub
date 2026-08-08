/**
 * House icon set — every game badge is a crimson tile with a carbon-black
 * glyph, so nothing on the site falls back to a stock multi-colour emoji.
 */

type Props = {
  id: string;
  className?: string;
};

const GLYPHS: Record<string, React.ReactNode> = {
  crash: (
    <>
      <path d="M4 19 L10 12 L13.5 15 L20 6" />
      <path d="M15 6 h5 v5" />
    </>
  ),
  mines: (
    <>
      <circle cx="11.5" cy="13.5" r="5.5" />
      <path d="M15.5 9.5 L19 6" />
      <path d="M17.5 4 L19.5 6 L17.5 8" />
    </>
  ),
  limbo: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 2.5 v3M12 18.5 v3M2.5 12 h3M18.5 12 h3" />
    </>
  ),
  plinko: (
    <>
      <path d="M12 4 v6" />
      <path d="M5 20 L12 10 L19 20 Z" />
      <circle cx="12" cy="5" r="1.4" />
    </>
  ),
  chicken: (
    <>
      <path d="M8 20 v-5.5 a4.5 4.5 0 0 1 9 0 V20" />
      <path d="M8 14.5 L4.5 12 L8 10.5" />
      <path d="M12.5 6 a2 2 0 1 1 4 0 v2" />
      <path d="M14.5 3.6 v-1.2" />
    </>
  ),
  blackjack: (
    <>
      <rect x="4" y="3.5" width="12" height="17" rx="2.5" />
      <path d="M10 8.5 c2.6 2.1 3.4 3.2 3.4 4.4 a1.9 1.9 0 0 1-3.4 1.1 a1.9 1.9 0 0 1-3.4-1.1 c0-1.2 .8-2.3 3.4-4.4Z" />
      <path d="M18.5 6.5 a2.5 2.5 0 0 1 2 2.4 V18 a2.5 2.5 0 0 1-2.5 2.5" />
    </>
  ),
  frogs: (
    <>
      <path d="M4.5 15.5 a3.5 3.5 0 0 1 3.5-3.5 h8 a3.5 3.5 0 0 1 3.5 3.5 v1 a3 3 0 0 1-3 3 h-9 a3 3 0 0 1-3-3Z" />
      <circle cx="8.5" cy="8" r="2.6" />
      <circle cx="15.5" cy="8" r="2.6" />
      <path d="M4.5 19.5 L2.5 21.5M19.5 19.5 L21.5 21.5" />
    </>
  ),
  poker: (
    <>
      <path d="M12 3.2 c4.4 4 6.2 5.9 6.2 8.4 a3.4 3.4 0 0 1-6.2 1.9 a3.4 3.4 0 0 1-6.2-1.9 c0-2.5 1.8-4.4 6.2-8.4Z" />
      <path d="M10 20.5 h4 c-1.3-1.4-1.8-2.9-2-4.4-.2 1.5-.7 3-2 4.4Z" />
    </>
  ),
  highlow: (
    <>
      <path d="M8 20 V5" />
      <path d="M4.5 8.5 L8 4.5 L11.5 8.5" />
      <path d="M16 4 v15" />
      <path d="M12.5 15.5 L16 19.5 L19.5 15.5" />
    </>
  ),
  wheel: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4v16M4 12h16M6.3 6.3l11.4 11.4M17.7 6.3 6.3 17.7" />
    </>
  ),
  slots: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M9.3 5v14M14.7 5v14" />
    </>
  ),
  keno: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M8.5 9.5h.01M15.5 9.5h.01M8.5 14.5h.01M15.5 14.5h.01" />
    </>
  ),
  dice: (
    <>
      <rect x="5" y="5" width="14" height="14" rx="3" />
      <path d="M9 9h.01M15 9h.01M12 12h.01M9 15h.01M15 15h.01" />
    </>
  ),
  coinflip: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v10M9.5 9.5h5" />
    </>
  ),
  roulette: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 4v4M20 12h-4M12 20v-4M4 12h4" />
    </>
  ),
  towers: (
    <>
      <path d="M5 20V8l7-4 7 4v12" />
      <path d="M9 20v-5h6v5M8 10h.01M16 10h.01" />
    </>
  ),
  vault: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 9v6M9 12h6" />
    </>
  ),
  scratch: (
    <>
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <path d="M8 16 16 8M9 8h.01M15 16h.01" />
    </>
  ),
  lightning: (
    <>
      <path d="m13 2-8 12h6l-1 8 9-13h-6z" />
    </>
  ),
  cardwar: (
    <>
      <rect x="5" y="3.5" width="12" height="17" rx="2" />
      <path d="M9 8h4M11 6v4M8.5 15.5c1.8-1.9 5.2-1.9 7 0" />
      <path d="M19 7.5v10a2.5 2.5 0 0 1-2 2.4" />
    </>
  ),
  claw: (
    <>
      <path d="M12 3v8M8 11h8M9 11v4M15 11v4M9 15l-2 3M15 15l2 3" />
      <path d="M5 21h14" />
    </>
  ),
};

export function GameIcon({ id, className = "h-11 w-11" }: Props) {
  const glyph = GLYPHS[id];
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-[0_6px_18px_-8px_var(--primary)] ring-1 ring-primary/40 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[62%] w-[62%]"
        fill="none"
        stroke="oklch(0.14 0.01 20)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {glyph ?? <circle cx="12" cy="12" r="7" />}
      </svg>
    </span>
  );
}

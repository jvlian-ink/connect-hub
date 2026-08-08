import { useEffect, useState } from "react";
import { sfx } from "@/lib/sound";

/**
 * iOS-safe numeric field.
 *
 * A raw <input type="number"> on iPhone fights the user: the value is
 * re-parsed on every keystroke, so clearing "1" and typing "2.5" jumps the
 * caret and forces you to type *around* the existing digit. We keep a local
 * string draft, allow it to be empty/partial while typing, and only commit a
 * parsed number when it's actually valid.
 */
export function NumberField({
  value,
  onCommit,
  min = 0,
  max,
  step,
  disabled,
  className = "",
  ariaLabel,
  suffix,
}: {
  value: number;
  onCommit: (n: number) => void;
  min?: number;
  max?: number;
  step?: number | undefined;
  disabled?: boolean | undefined;

  className?: string;
  ariaLabel?: string;
  suffix?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);

  const commit = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.]/g, "");
    if (cleaned === "" || cleaned === ".") {
      onCommit(min);
      setDraft(String(min));
      return;
    }
    let n = Number.parseFloat(cleaned);
    if (!Number.isFinite(n)) n = min;
    if (max !== undefined) n = Math.min(max, n);
    n = Math.max(min, n);
    n = +n.toFixed(4);
    onCommit(n);
    setDraft(String(n));
  };

  return (
    <div className="relative">
      <input
        // text + inputMode keeps the numeric keypad on iOS without the
        // native stepper re-parsing (and re-ordering) every keystroke.
        type="text"
        inputMode="decimal"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label={ariaLabel}
        disabled={disabled}
        value={draft}
        onFocus={(e) => {
          const el = e.currentTarget;
          setFocused(true);
          sfx.tick();
          requestAnimationFrame(() => el.select());
        }}
        onChange={(e) => {
          const next = e.target.value;
          if (/^[0-9]*\.?[0-9]*$/.test(next)) setDraft(next);
        }}
        onBlur={(e) => {
          setFocused(false);
          commit(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
          if (step && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
            e.preventDefault();
            const dir = e.key === "ArrowUp" ? 1 : -1;
            commit(String((Number.parseFloat(draft) || min) + dir * step));
          }
        }}
        className={`w-full rounded-lg border border-border bg-input px-3 py-2.5 num text-foreground outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-ring/35 ${
          suffix ? "pr-10" : ""
        } ${className}`}
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

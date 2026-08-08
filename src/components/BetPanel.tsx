import type { ReactNode } from "react";
import { NumberField } from "@/components/NumberField";
import { fmt, useWallet } from "@/lib/wallet";
import { sfx } from "@/lib/sound";

export function BetPanel({
  stake,
  setStake,
  disabled,
  onPlay,
  playLabel = "Place bet",
  playDisabled,
  children,
  footer,
}: {
  stake: number;
  setStake: (n: number) => void;
  disabled?: boolean | undefined;
  onPlay?: (() => void) | undefined;
  playLabel?: string | undefined;
  playDisabled?: boolean | undefined;
  children?: ReactNode | undefined;
  footer?: ReactNode | undefined;
}) {

  const { balance, canBet } = useWallet();

  const quick = (fn: (s: number) => number) => () => {
    sfx.click();
    setStake(Math.max(0.1, +Math.min(balance, fn(stake)).toFixed(2)));
  };

  return (
    <div className="panel flex flex-col gap-4 p-4 sm:p-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
          <span>Stake</span>
          <span className="num">Balance {fmt(balance)}</span>
        </div>
        <NumberField
          value={stake}
          onCommit={setStake}
          min={0.1}
          max={Math.max(0.1, balance)}
          step={1}
          disabled={disabled}
          ariaLabel="Stake amount"
        />
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={quick((s) => s / 2)}
            className="btn-base btn-ghost-soft py-2 text-xs"
          >
            ½
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={quick((s) => s * 2)}
            className="btn-base btn-ghost-soft py-2 text-xs"
          >
            2×
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={quick(() => 10)}
            className="btn-base btn-ghost-soft py-2 text-xs"
          >
            10
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={quick(() => balance)}
            className="btn-base btn-ghost-soft py-2 text-xs"
          >
            Max
          </button>
        </div>
      </div>

      {children}

      {onPlay ? (
        <button
          type="button"
          disabled={playDisabled || disabled || !canBet(stake)}
          onClick={onPlay}
          className="btn-base btn-play w-full py-3 text-base"
        >
          {playLabel}
        </button>
      ) : null}

      {footer}
    </div>
  );
}

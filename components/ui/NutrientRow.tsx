import { RatingBadge } from "./RatingBadge";
import { RangeBar } from "./RangeBar";
import { NutrientIconBadge, type NutrientIconKey } from "./Icons";

interface NutrientRowProps {
  label: string;
  value: number;
  unit: string;
  rating: string;
  ratingClass: string;
  targetMin: number;
  targetMax: number;
  barMax: number;
  iconKey: NutrientIconKey;
  warnOver?: boolean;
  showRange?: boolean;
}

export function NutrientRow({
  label,
  value,
  unit,
  rating,
  ratingClass,
  targetMin,
  targetMax,
  barMax,
  iconKey,
  warnOver,
  showRange = true,
}: NutrientRowProps) {
  return (
    <div className="border-b border-[var(--color-border)] py-4 last:border-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <NutrientIconBadge type={iconKey} />
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">{label}</p>
            <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-[var(--color-text)]">
              {value}
              <span className="ml-1 text-xs font-normal text-[var(--color-muted)]">
                {unit}
              </span>
            </p>
          </div>
        </div>
        <RatingBadge label={rating} className={ratingClass} />
      </div>
      {showRange && (
        <RangeBar
          value={value}
          targetMin={targetMin}
          targetMax={targetMax}
          barMax={barMax}
          warnOver={warnOver}
        />
      )}
    </div>
  );
}

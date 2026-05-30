import { IconCalorie } from "./Icons";

interface CalorieGaugeProps {
  value: number;
  targetMin: number;
  targetMax: number;
  barMax: number;
}

export function CalorieGauge({ value, targetMin, targetMax, barMax }: CalorieGaugeProps) {
  const minPct = (targetMin / barMax) * 100;
  const maxPct = (targetMax / barMax) * 100;
  const valuePct = Math.min(100, (value / barMax) * 100);
  const isOver = value > targetMax;
  const inRange = value >= targetMin && value <= targetMax;

  return (
    <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-gradient-to-br from-white/80 to-emerald-50/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-muted)]">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
            <IconCalorie className="h-4 w-4" />
          </span>
          今日热量区间
        </div>
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text)]">
          {targetMin} – {targetMax} 千卡
        </span>
      </div>

      <div className="relative h-4 overflow-hidden rounded-full bg-[#e8eeea] shadow-[inset_0_1px_4px_rgba(26,46,36,0.08)]">
        <div
          className="absolute h-full bg-gradient-to-r from-emerald-50 to-emerald-100/90"
          style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }}
        />
        <div
          className={`absolute left-0 h-full rounded-full transition-all duration-700 ease-out ${
            isOver
              ? "bg-gradient-to-r from-orange-300 via-orange-400 to-orange-500"
              : "bg-gradient-to-r from-emerald-400 to-[#3dd68c]"
          }`}
          style={{ width: `${valuePct}%` }}
        />
        <div
          className={`absolute top-1/2 z-10 h-5 w-5 -translate-y-1/2 rounded-full border-[3px] border-white ${
            isOver
              ? "bg-orange-500 shadow-[0_2px_10px_rgba(249,115,22,0.5)]"
              : "bg-emerald-500 shadow-[0_2px_10px_rgba(46,184,114,0.5)]"
          }`}
          style={{ left: `calc(${Math.max(2, valuePct)}% - 10px)` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-[var(--color-muted)]">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-200" />
          偏低
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-3 rounded-full bg-emerald-300" />
          目标区
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
          超标
        </span>
      </div>

      <p
        className={`mt-2.5 text-center text-xs leading-relaxed ${
          isOver
            ? "font-semibold text-orange-500"
            : inRange
              ? "font-medium text-emerald-600"
              : "text-[var(--color-muted)]"
        }`}
      >
        {isOver
          ? `已超出目标 ${value - targetMax} 千卡，建议控制后续摄入`
          : inRange
            ? `当前 ${value} 千卡，处于目标区间内`
            : `当前 ${value} 千卡，距离目标下限还差 ${targetMin - value} 千卡`}
      </p>
    </div>
  );
}

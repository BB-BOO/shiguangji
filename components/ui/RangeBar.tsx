interface RangeBarProps {
  value: number;
  targetMin: number;
  targetMax: number;
  barMax: number;
  warnOver?: boolean;
}

export function RangeBar({ value, targetMin, targetMax, barMax, warnOver = false }: RangeBarProps) {
  const minPct = (targetMin / barMax) * 100;
  const maxPct = (targetMax / barMax) * 100;
  const valuePct = Math.min(100, (value / barMax) * 100);
  const isOver = value > targetMax;
  const over = isOver && warnOver;

  return (
    <div className="mt-3">
      <div className="relative h-[10px] overflow-hidden rounded-full bg-[#e8eeea] shadow-[inset_0_1px_3px_rgba(26,46,36,0.08)]">
        <div
          className="absolute top-0 h-full rounded-full bg-gradient-to-r from-emerald-100/90 to-emerald-200/80"
          style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }}
        />
        <div
          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out ${
            over
              ? "bg-gradient-to-r from-orange-300 to-orange-400"
              : "bg-gradient-to-r from-emerald-400 to-[#3dd68c]"
          }`}
          style={{ width: `${valuePct}%`, opacity: value > 0 ? 1 : 0 }}
        />
        <div
          className={`absolute top-1/2 z-10 h-[14px] w-[14px] -translate-y-1/2 rounded-full border-[2.5px] border-white transition-all duration-500 ${
            over
              ? "bg-orange-500 shadow-[0_2px_8px_rgba(249,115,22,0.45)]"
              : "bg-emerald-500 shadow-[0_2px_8px_rgba(46,184,114,0.45)]"
          }`}
          style={{ left: `calc(${Math.max(2, valuePct)}% - 7px)` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-medium text-[var(--color-muted)]">
        <span>0</span>
        <span className="rounded-md bg-white/60 px-1.5 py-0.5">
          目标 {targetMin}–{targetMax}
        </span>
        <span>{barMax}</span>
      </div>
    </div>
  );
}

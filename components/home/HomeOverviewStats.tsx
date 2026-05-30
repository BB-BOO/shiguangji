import { IconCalorie, IconChart, IconMeal } from "@/components/ui/Icons";
import type { DailyStatus, NutritionEstimate } from "@/lib/types";

interface HomeOverviewStatsProps {
  mainMealCount: number;
  snackCount: number;
  nutrition: NutritionEstimate;
  summaryStatus: DailyStatus | null;
}

function StatPill({
  icon,
  label,
  value,
  sub,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-2 rounded-2xl border border-white/70 bg-white/75 p-3.5 shadow-[0_4px_16px_rgba(26,46,36,0.05)] backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-[var(--color-muted)]">{label}</span>
        <span className="opacity-80">{icon}</span>
      </div>
      <p className={`text-lg font-bold tabular-nums tracking-tight ${valueClass || "text-[var(--color-text)]"}`}>
        {value}
      </p>
      <p className="text-[10px] text-[var(--color-muted)]">{sub}</p>
    </div>
  );
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function HomeOverviewStats({ mainMealCount, snackCount, nutrition, summaryStatus }: HomeOverviewStatsProps) {
  const mealCount = mainMealCount + snackCount;
  const score =
    mealCount === 0
      ? "—"
      : summaryStatus
        ? (() => {
            const statuses = [summaryStatus.protein, summaryStatus.vegetables, summaryStatus.carbs, summaryStatus.fat, summaryStatus.calories];
            const bad = statuses.filter((s) => s === "超标" || s === "不足").length;
            if (bad === 0) return "均衡";
            if (bad <= 2) return "一般";
            return "待改善";
          })()
        : "计算中";

  const scoreColor =
    score === "均衡" ? "text-emerald-600" :
    score === "一般" ? "text-amber-600" :
    score === "待改善" ? "text-red-500" :
    "text-[var(--color-muted)]";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2.5">
        <StatPill
          icon={<IconMeal className="h-[18px] w-[18px] text-emerald-600" />}
          label="已记录"
          value={`${mainMealCount} 正餐`}
          sub={snackCount > 0 ? `${snackCount} 加餐` : " "}
        />
        <StatPill
          icon={<IconCalorie className="h-[18px] w-[18px] text-rose-500" />}
          label="今日热量"
          value={mealCount ? formatNumber(Math.round(nutrition.calories_kcal)) : "0"}
          sub="kcal"
        />
        <StatPill
          icon={<IconChart className="h-[18px] w-[18px] text-emerald-600" />}
          label="综合状态"
          value={score}
          sub={mealCount ? "基于今日摄入" : "待记录"}
          valueClass={scoreColor}
        />
      </div>
    </div>
  );
}

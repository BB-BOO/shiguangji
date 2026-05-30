import { Card } from "@/components/ui/Card";
import { CalorieGauge } from "@/components/ui/CalorieGauge";
import { NutrientRow } from "@/components/ui/NutrientRow";
import { IconChart } from "@/components/ui/Icons";
import type { DailyStatus, DailyTargetRange, NutritionEstimate } from "@/lib/types";
import { macroStatusClass, proteinVegStatusClass } from "@/lib/ratingStyles";

interface DailyNutritionCardProps {
  nutrition: NutritionEstimate;
  targets: DailyTargetRange;
  status: DailyStatus | null;
}

export function DailyNutritionCard({ nutrition, targets, status }: DailyNutritionCardProps) {
  return (
    <Card title="今日营养摄入" icon={<IconChart className="h-4 w-4" />}>
      <NutrientRow
        label="蛋白质"
        value={Math.round(nutrition.protein_g)}
        unit="克"
        rating={status?.protein ?? "—"}
        ratingClass={status ? proteinVegStatusClass(status.protein) : "text-gray-400 bg-gray-100"}
        targetMin={targets.protein_g.min}
        targetMax={targets.protein_g.max}
        barMax={Math.round(targets.protein_g.max * 1.25)}
        iconKey="protein"
        warnOver={false}
      />
      <NutrientRow
        label="蔬菜"
        value={Math.round(nutrition.vegetables_g)}
        unit="克"
        rating={status?.vegetables ?? "—"}
        ratingClass={status ? proteinVegStatusClass(status.vegetables) : "text-gray-400 bg-gray-100"}
        targetMin={targets.vegetables_g.min}
        targetMax={targets.vegetables_g.max}
        barMax={Math.round(targets.vegetables_g.max * 1.25)}
        iconKey="vegetables"
        warnOver={false}
      />
      <NutrientRow
        label="碳水"
        value={Math.round(nutrition.carbs_g)}
        unit="克"
        rating={status?.carbs ?? "—"}
        ratingClass={status ? macroStatusClass(status.carbs) : "text-gray-400 bg-gray-100"}
        targetMin={targets.carbs_g.min}
        targetMax={targets.carbs_g.max}
        barMax={Math.round(targets.carbs_g.max * 1.25)}
        iconKey="carbs"
        warnOver
      />
      <NutrientRow
        label="脂肪"
        value={Math.round(nutrition.fat_g)}
        unit="克"
        rating={status?.fat ?? "—"}
        ratingClass={status ? macroStatusClass(status.fat) : "text-gray-400 bg-gray-100"}
        targetMin={targets.fat_g.min}
        targetMax={targets.fat_g.max}
        barMax={Math.round(targets.fat_g.max * 1.25)}
        iconKey="fat"
        warnOver
      />
      <div className="pt-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M13 3L8 13h4l-1 8 7-12h-4l-1-6z" opacity="0.9" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-medium">热量</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight">
                {Math.round(nutrition.calories_kcal)}
                <span className="ml-1 text-xs font-normal text-[var(--color-muted)]">千卡</span>
              </p>
            </div>
          </div>
          {status && (
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${macroStatusClass(status.calories)}`}>
              {status.calories}
            </span>
          )}
        </div>
        <CalorieGauge
          value={Math.round(nutrition.calories_kcal)}
          targetMin={targets.calories_kcal.min}
          targetMax={targets.calories_kcal.max}
          barMax={Math.round(targets.calories_kcal.max * 1.25)}
        />
        {status?.calories === "超标" && (
          <p className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-center text-xs font-semibold text-orange-500">
            今日热量已超标，请注意控制后续摄入
          </p>
        )}
      </div>
    </Card>
  );
}

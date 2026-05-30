import { Card } from "@/components/ui/Card";
import { RatingBadge } from "@/components/ui/RatingBadge";
import { NutrientIconBadge, IconChart, type NutrientIconKey } from "@/components/ui/Icons";
import type { MealAnalysisResponse, MealStatus, NutritionEstimate } from "@/lib/types";
import { mealLevelClass, warningClass } from "@/lib/ratingStyles";

interface MealNutritionCardProps {
  analysis: MealAnalysisResponse;
}

const METRICS: { key: keyof MealStatus; label: string; icon: NutrientIconKey; unit: keyof NutritionEstimate; isWarning: boolean }[] = [
  { key: "protein",   label: "蛋白质",   icon: "protein",    unit: "protein_g",    isWarning: false },
  { key: "vegetables", label: "蔬菜",     icon: "vegetables", unit: "vegetables_g", isWarning: false },
  { key: "carbs",     label: "碳水",     icon: "carbs",      unit: "carbs_g",      isWarning: false },
  { key: "fat",       label: "脂肪",     icon: "fat",        unit: "fat_g",         isWarning: true },
  { key: "calories",  label: "热量",     icon: "calories",   unit: "calories_kcal", isWarning: true },
];

function getRatingClass(isWarning: boolean, value: string): string {
  if (isWarning) return warningClass(value as "是" | "否");
  return mealLevelClass(value as "较多" | "正常" | "较少");
}

function getRatingLabel(key: string, value: string): string {
  if (key === "fat") return value === "是" ? "高油" : "正常";
  if (key === "calories") return value === "是" ? "高热" : "正常";
  return value;
}

export function MealNutritionCard({ analysis }: MealNutritionCardProps) {
  const { meal_status, nutrition_estimate } = analysis;

  if (!nutrition_estimate) return null;

  return (
    <Card title="本餐营养估算" icon={<IconChart className="h-4 w-4" />}>
      <div className="grid grid-cols-1 gap-2.5">
        {METRICS.map(({ key, label, icon, unit, isWarning }) => {
          const value = nutrition_estimate[unit];
          const rating = meal_status[key];
          return (
            <div
              key={key}
              className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-gradient-to-r from-white to-gray-50/50 px-3.5 py-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <NutrientIconBadge type={icon} />
                <div>
                  <p className="text-xs font-medium text-[var(--color-muted)]">{label}</p>
                  <p className="text-base font-semibold tabular-nums tracking-tight">
                    {value}
                    <span className="ml-1 text-xs font-normal text-[var(--color-muted)]">{unit === "calories_kcal" ? "千卡" : "克"}</span>
                  </p>
                </div>
              </div>
              <RatingBadge label={getRatingLabel(key, rating)} className={getRatingClass(isWarning, rating)} />
            </div>
          );
        })}
      </div>
      {(meal_status.fat === "是" || meal_status.calories === "是") && (
        <p className="mt-4 rounded-2xl border border-red-100 bg-gradient-to-r from-red-50 to-orange-50/50 px-4 py-3 text-center text-xs font-semibold text-red-500">
          {meal_status.fat === "是" && meal_status.calories === "是"
            ? "本餐热量与油脂均偏高，建议减少油炸与肥肉"
            : meal_status.fat === "是"
              ? "本餐油脂偏高，烹调宜少油"
              : "本餐热量偏高，注意控制份量"}
        </p>
      )}
    </Card>
  );
}

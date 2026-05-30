import type { DailyStatus, DailyTargetRange, GoalMatch, NutritionEstimate, OverallBalance, WeeklyStatus } from "./types";

/** 系统计算每日达标状态——纯数值比较，不调 LLM */
export function computeDailyStatus(
  nutrition: NutritionEstimate,
  targets: DailyTargetRange,
): DailyStatus {
  return {
    calories: compareMacro(nutrition.calories_kcal, targets.calories_kcal),
    protein: compareProteinVeg(nutrition.protein_g, targets.protein_g),
    carbs: compareMacro(nutrition.carbs_g, targets.carbs_g),
    vegetables: compareProteinVeg(nutrition.vegetables_g, targets.vegetables_g),
    fat: compareMacro(nutrition.fat_g, targets.fat_g),
  };
}

/** 系统计算每周达标状态 */
export function computeWeeklyStatus(
  weeklyAvg: NutritionEstimate,
  targets: DailyTargetRange,
): WeeklyStatus {
  const daily = computeDailyStatus(weeklyAvg, targets);
  const goodCount = [daily.calories, daily.protein, daily.carbs, daily.vegetables, daily.fat].filter(
    (v) => v === "均衡" || v === "达标" || v === "充足",
  ).length;
  const overall: OverallBalance = goodCount >= 4 ? "较均衡" : goodCount >= 2 ? "一般" : "失衡";
  return { ...daily, overall_balance: overall };
}

/** 系统计算目标吻合度 */
export function computeGoalMatch(status: WeeklyStatus): GoalMatch {
  const onTarget = [status.calories, status.protein, status.carbs, status.vegetables, status.fat].filter(
    (v) => v === "均衡" || v === "达标" || v === "充足",
  ).length;
  if (onTarget === 5) return "完美符合";
  if (onTarget >= 3) return "基本符合";
  return "偏离目标";
}

function compareMacro(value: number, range: { min: number; max: number }): "超标" | "均衡" | "不足" {
  if (value > range.max) return "超标";
  if (value < range.min) return "不足";
  return "均衡";
}

function compareProteinVeg(value: number, range: { min: number; max: number }): "充足" | "达标" | "不足" {
  if (value > range.max) return "充足";
  if (value < range.min) return "不足";
  return "达标";
}

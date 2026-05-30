import type { DailyTargetRange, GoalMode } from "./types";

/**
 * 根据用户资料自动计算初始每日营养目标范围。
 * 公式基于通用营养指南，按目标模式微调。
 */
export function calculateInitialTargets(
  goalMode: GoalMode,
  weightKg: number,
  heightCm: number,
  age: number,
): DailyTargetRange {
  // 基础代谢率 (Mifflin-St Jeor)
  let bmr: number;
  if (goalMode === "增肌") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5; // 男性公式为保守起点
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161; // 女性公式为保守起点
  }

  // 活动系数 1.55 (中等活动)
  const tdee = Math.round(bmr * 1.55);

  // 按目标调整热量
  let calorieTarget: number;
  switch (goalMode) {
    case "减脂":
      calorieTarget = Math.round(tdee * 0.8); // 20% 热量缺口
      break;
    case "增肌":
      calorieTarget = Math.round(tdee * 1.15); // 15% 热量盈余
      break;
    case "保持":
    default:
      calorieTarget = tdee;
  }

  // 蛋白质: 1.2-2.0 g/kg 体重
  const proteinMin = Math.round(weightKg * 1.2);
  const proteinMax = Math.round(weightKg * 1.8);

  // 碳水: 热量减去蛋白质和脂肪后
  const carbMin = Math.round((calorieTarget * 0.45) / 4);
  const carbMax = Math.round((calorieTarget * 0.6) / 4);

  // 蔬菜: 固定 300-500g
  const vegMin = 300;
  const vegMax = 500;

  // 油脂: 热量20-30%
  const oilMin = Math.round((calorieTarget * 0.2) / 9);
  const oilMax = Math.round((calorieTarget * 0.3) / 9);

  const calorieMin = Math.round(calorieTarget * 0.85);
  const calorieMax = Math.round(calorieTarget * 1.15);

  return {
    protein_g: { min: proteinMin, max: proteinMax },
    carbs_g: { min: carbMin, max: carbMax },
    vegetables_g: { min: vegMin, max: vegMax },
    fat_g: { min: oilMin, max: oilMax },
    calories_kcal: { min: calorieMin, max: calorieMax },
  };
}

/** 目标范围是否匹配用户 profile，用于判断是否需要重算 */
export function isTargetStale(
  profile: { goal_mode: GoalMode; weight_kg: number },
  existingTargets: DailyTargetRange | null,
): boolean {
  return !existingTargets;
}

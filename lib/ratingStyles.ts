import type { MacroStatus, OverallBalance, ProteinVegStatus } from "./types";

type MealLevelRating = "较多" | "正常" | "较少";

export function proteinVegStatusClass(r: ProteinVegStatus): string {
  if (r === "充足") return "text-emerald-600 bg-emerald-50";
  if (r === "达标") return "text-blue-600 bg-blue-50";
  return "text-orange-500 bg-orange-50";
}

export function macroStatusClass(r: MacroStatus): string {
  if (r === "均衡") return "text-emerald-600 bg-emerald-50";
  if (r === "超标") return "text-red-500 bg-red-50";
  return "text-orange-500 bg-orange-50";
}

export function mealLevelClass(r: MealLevelRating): string {
  if (r === "正常") return "text-emerald-600 bg-emerald-50";
  if (r === "较多") return "text-amber-600 bg-amber-50";
  return "text-gray-400 bg-gray-100";
}

export function warningClass(warning: "是" | "否"): string {
  return warning === "是" ? "text-red-500 bg-red-50" : "text-emerald-600 bg-emerald-50";
}

export function overallBalanceClass(r: OverallBalance): string {
  if (r === "较均衡") return "text-emerald-600 bg-emerald-50";
  if (r === "一般") return "text-amber-600 bg-amber-50";
  return "text-red-500 bg-red-50";
}

export function goalMatchClass(m: string): string {
  if (m === "完美符合") return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (m === "基本符合") return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-red-500 bg-red-50 border-red-200";
}

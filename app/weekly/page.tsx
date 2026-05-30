"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { fetchWeeklyAnalysis } from "@/lib/difyService";
import { loadMealsByDateRange, loadMemory, loadWeeklySummaryCache, saveWeeklySummaryCache, addMemoryEntry } from "@/lib/storage";
import type { DailyTargetRange, MealRecord, NutritionEstimate, WeeklyAnalysisResponse, WeeklyStatus } from "@/lib/types";
import { goalMatchClass, macroStatusClass, overallBalanceClass, proteinVegStatusClass } from "@/lib/ratingStyles";
import { computeWeeklyStatus } from "@/lib/nutritionStatus";
import { Card } from "@/components/ui/Card";
import { RatingBadge } from "@/components/ui/RatingBadge";
import { IconBack, IconRefresh, IconSparkle, IconTarget, IconChart, IconQuote } from "@/components/ui/Icons";
import Link from "next/link";

function getPast7Dates(): string[] {
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return dates;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return weekDays[d.getDay()];
}

function accumulateMeals(meals: MealRecord[]): NutritionEstimate {
  return meals.reduce(
    (acc, m) => ({
      protein_g: acc.protein_g + m.nutrition_estimate.protein_g,
      carbs_g: acc.carbs_g + m.nutrition_estimate.carbs_g,
      fat_g: acc.fat_g + m.nutrition_estimate.fat_g,
      vegetables_g: acc.vegetables_g + m.nutrition_estimate.vegetables_g,
      calories_kcal: acc.calories_kcal + m.nutrition_estimate.calories_kcal,
    }),
    { protein_g: 0, carbs_g: 0, fat_g: 0, vegetables_g: 0, calories_kcal: 0 },
  );
}

type NutrientKey = "protein_g" | "carbs_g" | "vegetables_g" | "fat_g" | "calories_kcal";

const NUTRIENT_OPTIONS: { key: NutrientKey; label: string; unit: string; color: string }[] = [
  { key: "calories_kcal", label: "热量", unit: "千卡", color: "#f43f5e" },
  { key: "protein_g", label: "蛋白质", unit: "克", color: "#10b981" },
  { key: "carbs_g", label: "碳水", unit: "克", color: "#f59e0b" },
  { key: "vegetables_g", label: "蔬菜", unit: "克", color: "#84cc16" },
  { key: "fat_g", label: "油脂", unit: "克", color: "#f97316" },
];

interface WeekData {
  date: string;
  meals: MealRecord[];
  nutrition: NutritionEstimate;
  label: string;
}

function WeeklyTrendChart({
  weekData,
  targets,
  nutrient,
}: {
  weekData: WeekData[];
  targets: DailyTargetRange;
  nutrient: typeof NUTRIENT_OPTIONS[number];
}) {
  const W = 320;
  const H = 180;
  const PAD = { top: 16, right: 16, bottom: 32, left: 16 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const values = weekData.map((d) => d.nutrition[nutrient.key]);
  const tRange = targets[keyToTarget(nutrient.key)];
  const tMin = tRange?.min ?? 0;
  const tMax = tRange?.max ?? 100;
  const allVals = [...values, tMin, tMax].filter((v) => v > 0);
  const dataMax = allVals.length ? Math.max(...allVals) : 100;
  const yMax = dataMax * 1.2;

  const yScale = (v: number) => PAD.top + plotH - (v / yMax) * plotH;
  const xScale = (i: number) => PAD.left + (i / (weekData.length - 1)) * plotW;

  const tMinY = yScale(tMin);
  const tMaxY = yScale(tMax);

  const points = values.map((v, i) => `${xScale(i)},${yScale(v)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
      {/* Target range */}
      <defs>
        <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={nutrient.color} stopOpacity="0.12" />
          <stop offset="100%" stopColor={nutrient.color} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <rect x={PAD.left} y={tMaxY} width={plotW} height={tMinY - tMaxY} fill="url(#targetGrad)" rx="4" />

      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((frac) => {
        const gy = yScale(yMax * frac);
        return (
          <line key={frac} x1={PAD.left} x2={PAD.left + plotW} y1={gy} y2={gy}
            stroke="rgba(26,46,36,0.06)" strokeWidth="1" />
        );
      })}

      {/* Target range boundary lines */}
      <line x1={PAD.left} x2={PAD.left + plotW} y1={tMinY} y2={tMinY}
        stroke={nutrient.color} strokeWidth="1" strokeDasharray="4,3" opacity="0.4" />
      <line x1={PAD.left} x2={PAD.left + plotW} y1={tMaxY} y2={tMaxY}
        stroke={nutrient.color} strokeWidth="1" strokeDasharray="4,3" opacity="0.4" />

      {/* Data line */}
      <polyline fill="none" stroke={nutrient.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        points={points} opacity="0.8" />

      {/* Data dots */}
      {values.map((v, i) => {
        const isOver = v > tMax;
        const isUnder = v < tMin && v > 0;
        const cx = xScale(i);
        const cy = yScale(v);
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r="6" fill={nutrient.color} opacity="0.15" />
            <circle cx={cx} cy={cy} r="3.5" fill="white" stroke={isOver ? "#f43f5e" : isUnder ? "#f59e0b" : nutrient.color} strokeWidth="2" />
          </g>
        );
      })}

      {/* X-axis labels */}
      {weekData.map((d, i) => (
        <text key={i} x={xScale(i)} y={H - 6} textAnchor="middle"
          className="fill-[var(--color-muted)] text-[9px]" fontFamily="var(--font-sans)">
          {d.label}
        </text>
      ))}
    </svg>
  );
}

function keyToTarget(key: NutrientKey): keyof DailyTargetRange {
  const map: Record<NutrientKey, keyof DailyTargetRange> = {
    protein_g: "protein_g",
    carbs_g: "carbs_g",
    vegetables_g: "vegetables_g",
    fat_g: "fat_g",
    calories_kcal: "calories_kcal",
  };
  return map[key];
}

export default function WeeklyPage() {
  const router = useRouter();
  const { isAuthenticated, userProfile, dailyTarget, updateTargets } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<WeeklyAnalysisResponse | null>(null);
  const [applied, setApplied] = useState(false);
  const [activeNutrient, setActiveNutrient] = useState<typeof NUTRIENT_OPTIONS[number]>(NUTRIENT_OPTIONS[0]);
  const [insufficientData, setInsufficientData] = useState(false);
  const [weeklyRating, setWeeklyRating] = useState<boolean | undefined>(undefined);
  const [weekData, setWeekData] = useState<WeekData[]>([]);
  const [weekAverages, setWeekAverages] = useState<NutritionEstimate | null>(null);
  const [lastWeekAverages, setLastWeekAverages] = useState<NutritionEstimate | null>(null);
  const [lastWeekStatus, setLastWeekStatus] = useState<WeeklyStatus | null>(null);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { router.replace("/login"); return; }
    if (!userProfile || !dailyTarget) { router.replace("/profile"); return; }
    setReady(true);
  }, [isAuthenticated, userProfile, dailyTarget, router]);

  const prepareData = useCallback(() => {
    const dates = getPast7Dates();
    const allMeals = loadMealsByDateRange(dates[0], dates[6]);
    const data: WeekData[] = dates.map((date) => {
      const meals = allMeals.filter((m) => m.date === date);
      return { date, meals, nutrition: accumulateMeals(meals), label: formatDateLabel(date) };
    });

    const daysWithData = data.filter((d) => d.meals.length > 0).length;
    setWeekData(data);
    setInsufficientData(daysWithData < 3);

    if (daysWithData >= 3) {
      const count = daysWithData;
      const totals = data.reduce((acc, d) => {
        if (d.meals.length === 0) return acc;
        return {
          protein_g: acc.protein_g + d.nutrition.protein_g,
          carbs_g: acc.carbs_g + d.nutrition.carbs_g,
          vegetables_g: acc.vegetables_g + d.nutrition.vegetables_g,
          fat_g: acc.fat_g + d.nutrition.fat_g,
          calories_kcal: acc.calories_kcal + d.nutrition.calories_kcal,
        };
      }, { protein_g: 0, carbs_g: 0, fat_g: 0, vegetables_g: 0, calories_kcal: 0 });

      setWeekAverages({
        protein_g: Math.round(totals.protein_g / count),
        carbs_g: Math.round(totals.carbs_g / count),
        vegetables_g: Math.round(totals.vegetables_g / count),
        fat_g: Math.round(totals.fat_g / count),
        calories_kcal: Math.round(totals.calories_kcal / count),
      });
    }

    // 加载上周数据用于周对比（往前 7 天）
    const lastWeekStart = new Date(dates[0] + "T00:00:00");
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(dates[0] + "T00:00:00");
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
    const lwStartStr = lastWeekStart.toISOString().split("T")[0];
    const lwEndStr = lastWeekEnd.toISOString().split("T")[0];
    const lastWeekMeals = loadMealsByDateRange(lwStartStr, lwEndStr);
    if (lastWeekMeals.length > 0 && dailyTarget) {
      const lwTotals = lastWeekMeals.reduce((acc, m) => ({
        protein_g: acc.protein_g + m.nutrition_estimate.protein_g,
        carbs_g: acc.carbs_g + m.nutrition_estimate.carbs_g,
        vegetables_g: acc.vegetables_g + m.nutrition_estimate.vegetables_g,
        fat_g: acc.fat_g + m.nutrition_estimate.fat_g,
        calories_kcal: acc.calories_kcal + m.nutrition_estimate.calories_kcal,
      }), { protein_g: 0, carbs_g: 0, fat_g: 0, vegetables_g: 0, calories_kcal: 0 });
      const lwDates = new Set(lastWeekMeals.map((m) => m.date)).size;
      const lwAvg: NutritionEstimate = {
        protein_g: Math.round(lwTotals.protein_g / lwDates),
        carbs_g: Math.round(lwTotals.carbs_g / lwDates),
        vegetables_g: Math.round(lwTotals.vegetables_g / lwDates),
        fat_g: Math.round(lwTotals.fat_g / lwDates),
        calories_kcal: Math.round(lwTotals.calories_kcal / lwDates),
      };
      setLastWeekAverages(lwAvg);
      setLastWeekStatus(computeWeeklyStatus(lwAvg, dailyTarget));
    } else {
      setLastWeekAverages(null);
      setLastWeekStatus(null);
    }
  }, [dailyTarget]);

  useEffect(() => { if (ready) prepareData(); }, [ready, prepareData]);

  const runAnalysis = useCallback(async () => {
    if (!userProfile || !dailyTarget || !weekAverages) return;
    setLoading(true);
    setError("");
    try {
      const weekStart = weekData[0]?.date || "";
      const allMealIds = weekData
        .flatMap((d) => d.meals.map((m) => m.id))
        .sort()
        .join(",");

      // 检查缓存
      const cached = loadWeeklySummaryCache(weekStart);
      if (cached && cached.fingerprint === allMealIds) {
        setResult(cached.summary);
        setLoading(false);
        return;
      }

      const weeklyMealText = weekData
        .filter((d) => d.meals.length > 0)
        .map((d) => {
          const text = d.meals.map((m) => m.meal_record_text).join("。");
          return `${d.date}: ${text}`;
        })
        .join("\n");

      const res = await fetchWeeklyAnalysis({
        goal_mode: userProfile.goal_mode,
        weight_kg: userProfile.weight_kg,
        height_cm: userProfile.height_cm,
        age: userProfile.age,
        protein_target_min: dailyTarget.protein_g.min,
        protein_target_max: dailyTarget.protein_g.max,
        carbs_target_min: dailyTarget.carbs_g.min,
        carbs_target_max: dailyTarget.carbs_g.max,
        vegetables_target_min: dailyTarget.vegetables_g.min,
        vegetables_target_max: dailyTarget.vegetables_g.max,
        fat_target_min: dailyTarget.fat_g.min,
        fat_target_max: dailyTarget.fat_g.max,
        calories_target_min: dailyTarget.calories_kcal.min,
        calories_target_max: dailyTarget.calories_kcal.max,
        weekly_avg_protein_g: weekAverages.protein_g,
        weekly_avg_carbs_g: weekAverages.carbs_g,
        weekly_avg_vegetables_g: weekAverages.vegetables_g,
        weekly_avg_fat_g: weekAverages.fat_g,
        weekly_avg_calories_kcal: weekAverages.calories_kcal,
        weekly_meal_records: weeklyMealText,
        memory: loadMemory().map((e) => `${e.field}：${e.value}`).join("；"),
      });
      setResult(res);
      setApplied(false);
      saveWeeklySummaryCache(weekData[0]?.date || "", allMealIds, res);
      // 将周报关键信息写入 memory
      try {
        addMemoryEntry({ field: "周报反馈", value: res.feedback, source: "weekly", extracted_at: new Date().toISOString() });
        addMemoryEntry({ field: "每周目标匹配", value: res.goal_match, source: "weekly", extracted_at: new Date().toISOString() });
      } catch { /* ignore */ }
    } catch (e) {
      console.error("Weekly analysis failed:", e);
      setError("分析生成失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [userProfile, dailyTarget, weekAverages, weekData]);

  useEffect(() => {
    if (weekAverages && !result && !loading && !error) {
      runAnalysis();
    }
  }, [weekAverages, result, loading, error, runAnalysis]);

  const handleApplyTarget = () => {
    if (!result?.next_week_target) return;
    const t = result.next_week_target;
    updateTargets({
      protein_g: { min: t.protein_min, max: t.protein_max },
      carbs_g: { min: t.carbs_min, max: t.carbs_max },
      vegetables_g: { min: t.vegetables_min, max: t.vegetables_max },
      fat_g: { min: t.fat_min, max: t.fat_max },
      calories_kcal: { min: t.calories_min, max: t.calories_max },
    });
    setApplied(true);
  };

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-pulse rounded-full bg-emerald-200/60" />
          <p className="text-sm text-[var(--color-muted)]">加载中…</p>
        </div>
      </div>
    );
  }

  const getTargetRange = (key: NutrientKey): { min: number; max: number } => {
    const map: Record<NutrientKey, keyof DailyTargetRange> = {
      protein_g: "protein_g", carbs_g: "carbs_g",
      vegetables_g: "vegetables_g", fat_g: "fat_g", calories_kcal: "calories_kcal",
    };
    return dailyTarget![map[key]];
  };

  return (
    <main className="min-h-dvh px-5 pt-7 pb-10">
      {/* Top nav */}
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center rounded-full bg-white/70 p-2 text-[var(--color-muted)] shadow-sm backdrop-blur-sm transition-colors hover:text-[var(--color-primary)] active:scale-[0.98]"
          >
            <IconBack />
          </Link>
          <h1 className="text-lg font-bold tracking-tight">每周分析</h1>
          <div>
            {!insufficientData ? (
              <button
                onClick={runAnalysis}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-sm font-medium text-[var(--color-muted)] shadow-sm backdrop-blur-sm transition-colors hover:text-[var(--color-primary)] active:scale-[0.98] disabled:opacity-50"
              >
                <IconRefresh className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                刷新
              </button>
            ) : (
              <div className="w-[52px]" />
            )}
          </div>
        </div>
      </header>

      {insufficientData ? (
        <div className="card-elevated flex flex-col items-center rounded-[22px] border border-dashed border-emerald-200/60 px-6 py-16 text-center">
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-3xl">
            📊
          </span>
          <p className="text-sm font-medium text-[var(--color-text)]">
            数据不足，建议至少记录3天饮食后再查看每周分析
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Trend chart */}
          <Card title="七日趋势" icon={<IconChart className="h-4 w-4" />}>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {NUTRIENT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setActiveNutrient(opt)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all duration-200 ${
                    activeNutrient.key === opt.key
                      ? "text-white shadow-sm"
                      : "bg-gray-100/80 text-[var(--color-muted)] hover:bg-gray-100"
                  }`}
                  style={activeNutrient.key === opt.key ? { background: opt.color } : {}}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <WeeklyTrendChart weekData={weekData} targets={dailyTarget!} nutrient={activeNutrient} />
            <div className="mt-2 flex justify-between text-[10px] text-[var(--color-muted)]">
              <span>目标区间 {getTargetRange(activeNutrient.key).min}–{getTargetRange(activeNutrient.key).max} {activeNutrient.unit}</span>
              <span>周均 {weekAverages?.[activeNutrient.key] ?? "—"} {activeNutrient.unit}</span>
            </div>
          </Card>

          {/* Week-over-week comparison */}
          {lastWeekAverages && lastWeekStatus && weekAverages && result && (
            <Card title="上周对比" icon={<IconChart className="h-4 w-4" />}>
              <div className="space-y-2.5">
                {(() => {
                  const nutrients = [
                    { key: "protein" as const, label: "蛋白质", unit: "g", curr: weekAverages.protein_g, prev: lastWeekAverages.protein_g, currStatus: result.weekly_status.protein, prevStatus: lastWeekStatus.protein },
                    { key: "vegetables" as const, label: "蔬菜", unit: "g", curr: weekAverages.vegetables_g, prev: lastWeekAverages.vegetables_g, currStatus: result.weekly_status.vegetables, prevStatus: lastWeekStatus.vegetables },
                    { key: "carbs" as const, label: "碳水", unit: "g", curr: weekAverages.carbs_g, prev: lastWeekAverages.carbs_g, currStatus: result.weekly_status.carbs, prevStatus: lastWeekStatus.carbs },
                    { key: "fat" as const, label: "油脂", unit: "g", curr: weekAverages.fat_g, prev: lastWeekAverages.fat_g, currStatus: result.weekly_status.fat, prevStatus: lastWeekStatus.fat },
                    { key: "calories" as const, label: "热量", unit: "kcal", curr: weekAverages.calories_kcal, prev: lastWeekAverages.calories_kcal, currStatus: result.weekly_status.calories, prevStatus: lastWeekStatus.calories },
                  ];

                  return nutrients.map((n) => {
                    const diff = n.prev > 0 ? Math.round(((n.curr - n.prev) / n.prev) * 100) : 0;
                    const improved = (
                      (n.prevStatus === "不足" && n.currStatus === "达标") ||
                      (n.prevStatus === "不足" && n.currStatus === "充足") ||
                      (n.prevStatus === "达标" && n.currStatus === "充足") ||
                      (n.prevStatus === "超标" && n.currStatus === "均衡") ||
                      (n.prevStatus === "不足" && n.currStatus === "均衡")
                    );
                    const worsened = (
                      (n.prevStatus === "充足" && n.currStatus === "达标") ||
                      (n.prevStatus === "达标" && n.currStatus === "不足") ||
                      (n.prevStatus === "充足" && n.currStatus === "不足") ||
                      (n.prevStatus === "均衡" && n.currStatus === "超标") ||
                      (n.prevStatus === "均衡" && n.currStatus === "不足")
                    );
                    const arrow = improved ? "↑" : worsened ? "↓" : "→";
                    const arrowColor = improved ? "text-emerald-500" : worsened ? "text-red-500" : "text-gray-400";

                    return (
                      <div key={n.key} className="flex items-center justify-between rounded-xl bg-gray-50/60 px-3 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-medium text-[var(--color-muted)] w-10 shrink-0">{n.label}</span>
                          <span className="text-xs tabular-nums text-[var(--color-text)]">
                            {n.prev}{n.unit} → {n.curr}{n.unit}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[11px] font-medium tabular-nums ${diff > 0 ? "text-red-500" : diff < 0 ? "text-emerald-500" : "text-[var(--color-muted)]"}`}>
                            {diff > 0 ? "+" : ""}{diff}%
                          </span>
                          <span className={`text-sm font-bold ${arrowColor}`}>{arrow}</span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              <p className="mt-3 text-[10px] text-center text-[var(--color-muted)]">
                ↑ 改善 · ↓ 下降 · → 持平 &nbsp;|&nbsp; 对比基于上周日均值
              </p>
            </Card>
          )}

          {/* Loading state - skeleton screen */}
          {loading && (
            <div className="space-y-5">
              <div className="card-elevated rounded-[22px] p-5 animate-pulse">
                <div className="h-4 w-24 rounded-full bg-gray-200/70 mb-4" />
                <div className="h-[180px] rounded-2xl bg-gray-100/60" />
              </div>
              <div className="card-elevated rounded-[22px] p-5 animate-pulse">
                <div className="h-4 w-20 rounded-full bg-gray-200/70 mb-4" />
                <div className="grid grid-cols-2 gap-2.5 mb-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-12 rounded-2xl bg-gray-100/60" />
                  ))}
                </div>
                <div className="h-10 rounded-2xl bg-gray-100/60" />
              </div>
              <div className="card-elevated rounded-[22px] p-5 animate-pulse">
                <div className="h-4 w-16 rounded-full bg-gray-200/70 mb-4" />
                <div className="h-16 rounded-2xl bg-gray-100/60 mb-4" />
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-gray-100/60" />
                  <div className="h-3 w-3/4 rounded bg-gray-100/60" />
                  <div className="h-3 w-1/2 rounded bg-gray-100/60" />
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="card-elevated rounded-[22px] p-6 text-center">
              <p className="text-sm text-red-500">{error}</p>
              <button
                onClick={runAnalysis}
                className="mt-3 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-emerald-600 active:scale-[0.97]"
              >
                重试
              </button>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <>
              {/* Data coverage warning (3-6 days) */}
              {weekData.filter((d) => d.meals.length > 0).length < 7 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-center">
                  <p className="text-xs text-amber-700">
                    数据覆盖不足7天，结论仅供参考
                  </p>
                </div>
              )}

              {/* Weekly nutrition status grid */}
              <Card title="本周营养评级" icon={<IconTarget className="h-4 w-4" />}>
                <div className="grid grid-cols-2 gap-2.5">
                  <StatusItem label="蛋白质" status={result.weekly_status.protein}
                    className={proteinVegStatusClass(result.weekly_status.protein)} />
                  <StatusItem label="蔬菜" status={result.weekly_status.vegetables}
                    className={proteinVegStatusClass(result.weekly_status.vegetables)} />
                  <StatusItem label="碳水" status={result.weekly_status.carbs}
                    className={macroStatusClass(result.weekly_status.carbs)} />
                  <StatusItem label="油脂" status={result.weekly_status.fat}
                    className={macroStatusClass(result.weekly_status.fat)} />
                  <StatusItem label="热量" status={result.weekly_status.calories}
                    className={macroStatusClass(result.weekly_status.calories)} />
                  <StatusItem label="整体均衡性" status={result.weekly_status.overall_balance}
                    className={overallBalanceClass(result.weekly_status.overall_balance)} />
                </div>

                {/* Goal match badge */}
                <div className={`mt-4 rounded-2xl border px-4 py-3 text-center ${goalMatchClass(result.goal_match)}`}>
                  <span className="text-sm font-semibold">目标匹配 · {result.goal_match}</span>
                </div>
              </Card>

              {/* AI feedback + analysis */}
              <Card title="AI 评价" icon={<IconSparkle className="h-4 w-4" />}>
                <div className="highlight-quote relative overflow-hidden rounded-2xl px-4 py-4">
                  <IconQuote className="absolute right-3 top-3 h-8 w-8 text-emerald-600/20" />
                  <p className="relative text-[15px] font-medium leading-relaxed text-[var(--color-primary-dark)]">
                    {result.feedback}
                  </p>
                </div>
                <div className="mt-5">
                  <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-muted)]">
                    <span className="h-1 w-1 rounded-full bg-[var(--color-primary)]" />
                    详细分析
                  </p>
                  <p className="whitespace-pre-line text-sm leading-[1.75] text-[var(--color-text)]/90">
                    {result.analysis_text}
                  </p>
                </div>

                {/* 周报满意度评价 */}
                <div className="mt-5 border-t border-[var(--color-border)] pt-4">
                  {weeklyRating === undefined ? (
                    <div className="text-center">
                      <p className="mb-3 text-xs font-medium text-[var(--color-muted)]">这份周报对你有帮助吗？</p>
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() => {
                            setWeeklyRating(true);
                            try {
                              const raw = localStorage.getItem("shiguangji-weekly-rating");
                              const ratings = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
                              ratings[new Date().toISOString().split("T")[0]] = true;
                              localStorage.setItem("shiguangji-weekly-rating", JSON.stringify(ratings));
                            } catch { /* ignore */ }
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700 transition-all hover:bg-emerald-100 active:scale-[0.97]"
                        >
                          😊 满意
                        </button>
                        <button
                          onClick={() => {
                            setWeeklyRating(false);
                            try {
                              const raw = localStorage.getItem("shiguangji-weekly-rating");
                              const ratings = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
                              ratings[new Date().toISOString().split("T")[0]] = false;
                              localStorage.setItem("shiguangji-weekly-rating", JSON.stringify(ratings));
                            } catch { /* ignore */ }
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-4 py-2 text-xs font-medium text-[var(--color-muted)] transition-all hover:bg-gray-200 active:scale-[0.97]"
                        >
                          😐 不满意
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-xs text-[var(--color-muted)]">
                      {weeklyRating ? "感谢反馈！😊" : "感谢反馈，我们会继续改进"}
                    </p>
                  )}
                </div>
              </Card>

              {/* Next week target card */}
              <Card title="下周每日建议目标" icon={<IconTarget className="h-4 w-4" />}>
                <div className="space-y-2.5 text-sm">
                  <TargetRow label="蛋白质" range={{ min: result.next_week_target.protein_min, max: result.next_week_target.protein_max }} unit="g"
                    current={dailyTarget!.protein_g} bgClass="bg-emerald-50/50" />
                  <TargetRow label="碳水" range={{ min: result.next_week_target.carbs_min, max: result.next_week_target.carbs_max }} unit="g"
                    current={dailyTarget!.carbs_g} bgClass="bg-amber-50/50" />
                  <TargetRow label="蔬菜" range={{ min: result.next_week_target.vegetables_min, max: result.next_week_target.vegetables_max }} unit="g"
                    current={dailyTarget!.vegetables_g} bgClass="bg-lime-50/50" />
                  <TargetRow label="油脂" range={{ min: result.next_week_target.fat_min, max: result.next_week_target.fat_max }} unit="g"
                    current={dailyTarget!.fat_g} bgClass="bg-orange-50/50" />
                  <TargetRow label="热量" range={{ min: result.next_week_target.calories_min, max: result.next_week_target.calories_max }} unit="kcal"
                    current={dailyTarget!.calories_kcal} bgClass="bg-rose-50/50" />
                </div>
                <button
                  onClick={handleApplyTarget}
                  disabled={applied}
                  className={`mt-5 w-full rounded-2xl py-3.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${
                    applied
                      ? "bg-emerald-100 text-emerald-600 cursor-default"
                      : "btn-primary text-white"
                  }`}
                >
                  {applied ? "✓ 已应用" : "应用下周目标"}
                </button>
                {applied && (
                  <p className="mt-2 text-center text-[11px] text-emerald-600">
                    目标已更新，下周生效
                  </p>
                )}
              </Card>
            </>
          )}
        </div>
      )}
    </main>
  );
}

function StatusItem({ label, status, className }: { label: string; status: string; className: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-gradient-to-r from-white to-gray-50/50 px-3.5 py-3">
      <span className="text-xs font-medium text-[var(--color-muted)]">{label}</span>
      <RatingBadge label={status} className={className} />
    </div>
  );
}

function TargetRow({
  label, range, unit, current, bgClass,
}: { label: string; range: { min: number; max: number }; unit: string; current: { min: number; max: number }; bgClass: string }) {
  const changed = range.min !== current.min || range.max !== current.max;
  return (
    <div className={`rounded-xl px-3.5 py-2.5 ${bgClass}`}>
      <div className="flex items-center justify-between">
        <span className="text-[var(--color-muted)]">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-semibold tabular-nums">
            {range.min} – {range.max} {unit}
          </span>
          {changed && (
            <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
              调整中
            </span>
          )}
        </div>
      </div>
      <p className="mt-0.5 text-right text-[10px] text-[var(--color-muted)]">
        本周 {current.min} – {current.max} {unit}
      </p>
    </div>
  );
}

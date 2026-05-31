"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { fetchDailySummary } from "@/lib/difyService";
import { loadTodayMeals, loadDailySummaryCache, saveDailySummaryCache, getTodayKey, loadMemory, syncDailyRating } from "@/lib/storage";
import type { DailySummaryResponse, MealRecord, NutritionEstimate } from "@/lib/types";
import { DailyNutritionCard } from "@/components/home/DailyNutritionCard";
import { DailyResultCard } from "@/components/home/DailyResultCard";
import { FabAdd } from "@/components/home/FabAdd";
import { HomeOverviewStats } from "@/components/home/HomeOverviewStats";
import { seedBalancedWeek } from "@/lib/seedData";


import { ProactiveCard } from "@/components/home/ProactiveCard";
import { ColdStartGuide } from "@/components/home/ColdStartGuide";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { IconLeaf, IconSparkle, IconChart, IconHistory, IconTarget } from "@/components/ui/Icons";

function accumulateNutrition(meals: MealRecord[]): NutritionEstimate {
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

function formatToday(): string {
  const d = new Date();
  return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, "0")}月${String(d.getDate()).padStart(2, "0")}日`;
}

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, userProfile, dailyTarget } = useAuth();

  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [summary, setSummary] = useState<DailySummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dailyRating, setDailyRating] = useState<boolean | undefined>(undefined);

  const [ready, setReady] = useState(false);
  const [titleTapCount, setTitleTapCount] = useState(0);
  const titleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 认证检查
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!userProfile || !dailyTarget) {
      router.replace("/profile");
      return;
    }
    setReady(true);
  }, [isAuthenticated, userProfile, dailyTarget, router]);

  const loadAndAnalyze = useCallback(async () => {
    if (!userProfile || !dailyTarget) return;
    const todayMeals = await loadTodayMeals();
    setMeals(todayMeals);

    // 加载今日评分
    try {
      const raw = localStorage.getItem("shiguangji-daily-rating");
      if (raw) {
        const ratings = JSON.parse(raw) as Record<string, boolean>;
        setDailyRating(ratings[getTodayKey()]);
      }
    } catch { /* ignore */ }

    if (todayMeals.length === 0) {
      setSummary(null);
      return;
    }

    // 仅当三餐（早/午/晚）全部记录后才触发 AI 每日总结
    const mainMealTypes = new Set(
      todayMeals.filter((m) => m.meal_type !== "加餐").map((m) => m.meal_type),
    );
    const allThreeRecorded =
      mainMealTypes.has("早餐") && mainMealTypes.has("午餐") && mainMealTypes.has("晚餐");
    if (!allThreeRecorded) {
      setSummary(null);
      return;
    }

    // 三餐齐全，立即显示加载态
    setLoading(true);
    setError("");

    // 检查缓存：餐记录指纹不变则复用已缓存的每日总结
    const todayKey = getTodayKey();
    const fingerprint = todayMeals
      .map((m) => m.id)
      .sort()
      .join(",");
    const cached = await loadDailySummaryCache(todayKey);
    if (cached && cached.fingerprint === fingerprint) {
      setSummary(cached.summary);
      setLoading(false);
      return;
    }

    try {
      const nutrition = accumulateNutrition(todayMeals);
      const mealRecordsText = todayMeals
        .map((m) => m.meal_record_text)
        .join("。\n");

      const result = await fetchDailySummary({
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
        protein_g: nutrition.protein_g,
        carbs_g: nutrition.carbs_g,
        vegetables_g: nutrition.vegetables_g,
        fat_g: nutrition.fat_g,
        calories_kcal: nutrition.calories_kcal,
        meal_records: mealRecordsText,
        memory: (await loadMemory()).map((e) => `${e.field}：${e.value}`).join("；"),
      });
      setSummary(result);
      saveDailySummaryCache(todayKey, fingerprint, result);
    } catch (e) {
      console.error("Daily summary failed:", e);
      setError("总结生成失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [userProfile, dailyTarget]);

  useEffect(() => {
    loadAndAnalyze();
    const onFocus = () => loadAndAnalyze();
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onFocus);
    };
  }, [loadAndAnalyze]);

  if (!ready) {
    return (
      <main className="min-h-dvh px-5 pt-7">
        <div className="animate-pulse space-y-5">
          <div className="h-[88px] rounded-[28px] bg-gray-100/60" />
          <div className="flex gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 flex-1 rounded-2xl bg-gray-100/60" />
            ))}
          </div>
          <div className="h-10 rounded-2xl bg-gray-100/60" />
          <div className="grid grid-cols-3 gap-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[88px] rounded-2xl bg-gray-100/60" />
            ))}
          </div>
          <div className="card-elevated rounded-[22px] p-5">
            <div className="h-4 w-24 rounded-full bg-gray-200/70 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded-2xl bg-gray-100/60" />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }


  const nutrition = accumulateNutrition(meals);

  return (
    <main className="flex min-h-dvh flex-col">
      <PullToRefresh onRefresh={loadAndAnalyze}>
        <div className="px-5 pt-7">
          <header className="relative mb-7 overflow-hidden rounded-[28px] card-elevated p-5">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-300/25 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-lime-200/30 blur-xl"
          aria-hidden
        />
        <div className="relative flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-br from-emerald-400 to-[#2eb872] text-white shadow-[0_8px_20px_rgba(46,184,114,0.35)]">
            <IconLeaf className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-2">
              <h1
                className="text-[26px] font-bold tracking-tight whitespace-nowrap text-[var(--color-text)] select-none"
                onClick={() => {
                  if (titleTapTimer.current) clearTimeout(titleTapTimer.current);
                  const next = titleTapCount + 1;
                  setTitleTapCount(next);
                  if (next >= 5) {
                    setTitleTapCount(0);
                    seedBalancedWeek();
                    loadAndAnalyze();
                  } else {
                    titleTapTimer.current = setTimeout(() => setTitleTapCount(0), 2000);
                  }
                }}
              >
                食光记
              </h1>
              <Link
                href="/assistant"
                className="flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 transition-all hover:bg-emerald-100 active:scale-95 shrink-0"
              >
                <IconSparkle className="h-3 w-3" />
                AI
              </Link>
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-[var(--color-muted)] whitespace-nowrap">
              <span>AI饮食助手</span>
              <span className="text-[10px] opacity-25">|</span>
              <span className="text-xs opacity-60">{formatToday()}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Top navigation */}
      <nav className="mb-5 flex gap-1.5">
        <NavItem href="/" label="今日" active>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M3 10l9-7 9 7v10a2 2 0 01-2 2H5a2 2 0 01-2-2V10z" stroke="currentColor" strokeWidth="1.8" />
            <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </NavItem>
        <NavItem href="/weekly" label="周报">
          <IconChart className="h-4 w-4" />
        </NavItem>
        <NavItem href="/history" label="历史">
          <IconHistory className="h-4 w-4" />
        </NavItem>
        <NavItem href="/profile" label="我的">
          <IconTarget className="h-4 w-4" />
        </NavItem>
      </nav>

      <div className="space-y-4 pb-36">
        <ColdStartGuide />
        <ProactiveCard />
        <HomeOverviewStats
          mainMealCount={meals.filter((m) => m.meal_type !== "加餐").length}
          snackCount={meals.filter((m) => m.meal_type === "加餐").length}
          nutrition={nutrition}
          summaryStatus={summary?.daily_status ?? null}
        />

        {meals.length === 0 ? (
          <div className="card-elevated flex flex-col items-center rounded-[22px] bg-gradient-to-br from-emerald-50/60 to-lime-50/40 px-6 py-12 text-center border border-dashed border-emerald-200/60">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 text-3xl shadow-sm">
              🥗
            </span>
            <p className="text-sm font-medium text-[var(--color-text)]">
              今天还没有饮食记录
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
              点击 + 号添加吧
            </p>
            <Link
              href="/meal"
              className="btn-primary mt-5 inline-flex items-center gap-2 rounded-[24px] px-6 py-3 text-sm font-semibold text-white"
            >
              添加一餐
            </Link>
          </div>
        ) : (
          <>
            <DailyNutritionCard
              nutrition={nutrition}
              targets={dailyTarget!}
              status={summary?.daily_status ?? null}
            />
            {loading ? (
              <div className="card-elevated rounded-[22px] p-5 animate-pulse">
                <div className="h-16 rounded-2xl bg-gray-100/60 mb-4" />
                <div className="space-y-2 mb-4">
                  <div className="h-3 w-full rounded bg-gray-100/60" />
                  <div className="h-3 w-3/4 rounded bg-gray-100/60" />
                  <div className="h-3 w-1/2 rounded bg-gray-100/60" />
                </div>
                <div className="h-4 w-20 rounded-full bg-gray-200/70" />
              </div>
            ) : error ? (
              <div className="card-elevated rounded-[22px] p-6 text-center">
                <p className="text-sm text-red-500">{error}</p>
                <button
                  onClick={loadAndAnalyze}
                  className="mt-3 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-emerald-600 active:scale-[0.97]"
                >
                  重试
                </button>
              </div>
            ) : summary ? (
              <DailyResultCard
                summary={summary}
                rating={dailyRating}
                onRate={(satisfied) => {
                  setDailyRating(satisfied);
                  try {
                    const raw = localStorage.getItem("shiguangji-daily-rating");
                    const ratings = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
                    ratings[getTodayKey()] = satisfied;
                    localStorage.setItem("shiguangji-daily-rating", JSON.stringify(ratings));
                  } catch { /* ignore */ }
                  syncDailyRating(getTodayKey(), satisfied);
                }}
              />
            ) : (
              <div className="card-elevated flex flex-col items-center rounded-[22px] px-6 py-10 text-center border border-dashed border-emerald-200/50">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
                  📋
                </span>
                <p className="text-sm font-medium text-[var(--color-text)]">
                  等待三餐记录完成
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-muted)]">
                  记录完早餐、午餐、晚餐后，AI 将自动生成每日总结
                </p>
              </div>
            )}
          </>
        )}
      </div>

        </div>
      </PullToRefresh>
      <FabAdd />
    </main>
  );
}

function NavItem({
  href, label, active, children,
}: { href: string; label: string; active?: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-[13px] font-semibold transition-all duration-200 active:scale-[0.96] ${
        active
          ? "bg-gradient-to-b from-emerald-400 to-[#2eb872] text-white shadow-[0_4px_12px_rgba(46,184,114,0.3)]"
          : "bg-white/70 text-[var(--color-muted)] hover:bg-white hover:text-[var(--color-text)]"
      }`}
    >
      {children}
      <span>{label}</span>
    </Link>
  );
}

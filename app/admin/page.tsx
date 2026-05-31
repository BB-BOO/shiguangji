"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  adminGetMealRatingStats,
  adminGetDailyRatingStats,
  adminGetWeeklyRatingStats,
  adminGetGoalAdoptionStats,
  adminGetFollowUpMeals,
  adminGetErrorLogs,
} from "@/lib/db";

const ADMIN_PASSWORD = "shiguangji2026";

type FollowUpMeal = { id: string; date: string; meal_type: string; follow_up_count: number; user_id: string };
type ErrorLogEntry = { id: number; source: string; error_type: string; message: string; stack?: string; created_at: string };
type GoalAdoptRecord = { week_start: string; user_id: string; target_adopted: boolean; target_adopted_at: string | null };
type RatingStats = { total: number; rated: number; satisfied: number };

export default function AdminPage() {
  const [authed, setAuthed] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("admin-authed") === "true";
    return false;
  });
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // 基础数据
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [totalMeals, setTotalMeals] = useState(0);
  const [recentMeals, setRecentMeals] = useState<Record<string, unknown>[]>([]);
  const [userMealCounts, setUserMealCounts] = useState<Record<string, number>>({});

  // 分析数据
  const [followUpMeals, setFollowUpMeals] = useState<FollowUpMeal[]>([]);
  const [mealRating, setMealRating] = useState<RatingStats>({ total: 0, rated: 0, satisfied: 0 });
  const [dailyRating, setDailyRating] = useState<RatingStats>({ total: 0, rated: 0, satisfied: 0 });
  const [weeklyRating, setWeeklyRating] = useState<RatingStats>({ total: 0, rated: 0, satisfied: 0 });
  const [goalAdoption, setGoalAdoption] = useState<{ total: number; adopted: number; records: GoalAdoptRecord[] }>({ total: 0, adopted: 0, records: [] });
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>([]);
  const [errorFilter, setErrorFilter] = useState("");
  const [tab, setTab] = useState<"dashboard" | "quality">("dashboard");

  // 留存 + 成本
  const [retention, setRetention] = useState<{ dau: { date: string; users: number }[]; day2Rate: number; day7Rate: number; totalRecordingDays: number } | null>(null);
  const [costStats, setCostStats] = useState<{ totalPrompt: number; totalCompletion: number; totalCacheHit: number; totalCacheMiss: number; estimatedCost: number; bySource: { source: string; prompt: number; completion: number; cacheHit: number; cacheMiss: number; calls: number }[]; dailyTokens: { date: string; prompt: number; completion: number }[] } | null>(null);

  function login() {
    if (pwd === ADMIN_PASSWORD) {
      setAuthed(true);
      sessionStorage.setItem("admin-authed", "true");
      setError("");
    } else {
      setError("密码错误");
    }
  }

  useEffect(() => {
    if (!authed) return;
    async function load() {
      setLoading(true);
      const [
        { data: usersData },
        mealRecordsQuery,
        recentMealsQuery,
        followUpMealsResult,
        mealRatingResult,
        dailyRatingResult,
        weeklyRatingResult,
        goalAdoptionResult,
        errorLogsResult,
        retentionResult,
        costResult,
      ] = await Promise.all([
        supabase.from("users").select("*").order("created_at", { ascending: false }),
        supabase.from("meal_records").select("user_id"),
        supabase.from("meal_records").select("id, date, meal_type, meal_record_text, user_id, created_at").order("created_at", { ascending: false }).limit(30),
        import("@/lib/db").then((m) => m.adminGetFollowUpMeals(50)),
        import("@/lib/db").then((m) => m.adminGetMealRatingStats()),
        import("@/lib/db").then((m) => m.adminGetDailyRatingStats()),
        import("@/lib/db").then((m) => m.adminGetWeeklyRatingStats()),
        import("@/lib/db").then((m) => m.adminGetGoalAdoptionStats()),
        import("@/lib/db").then((m) => m.adminGetErrorLogs(50)),
        import("@/lib/db").then((m) => m.adminGetRetentionStats()),
        import("@/lib/db").then((m) => m.adminGetCostStats()),
      ]);

      const countMap: Record<string, number> = {};
      ((mealRecordsQuery.data ?? []) as Record<string, unknown>[]).forEach((m) => {
        countMap[m.user_id as string] = (countMap[m.user_id as string] ?? 0) + 1;
      });

      setUsers(
        (usersData ?? []).map((u) => ({
          ...u,
          meal_count: countMap[u.id as string] ?? 0,
        })),
      );
      setUserMealCounts(countMap);
      setTotalMeals((mealRecordsQuery.data ?? []).length);
      setRecentMeals((recentMealsQuery.data ?? []) as Record<string, unknown>[]);
      setFollowUpMeals(followUpMealsResult as FollowUpMeal[]);
      setMealRating(mealRatingResult);
      setDailyRating(dailyRatingResult);
      setWeeklyRating(weeklyRatingResult);
      setGoalAdoption(goalAdoptionResult as unknown as { total: number; adopted: number; records: GoalAdoptRecord[] });
      setErrorLogs(errorLogsResult as ErrorLogEntry[]);
      setRetention(retentionResult as { dau: { date: string; users: number }[]; day2Rate: number; day7Rate: number; totalRecordingDays: number });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCostStats(costResult as any);

      setLoading(false);
    }
    load();
  }, [authed]);

  const totalUsers = users.length;
  const mealsPerUser = totalUsers > 0 ? totalMeals / totalUsers : 0;

  // 用户 ID -> 用户名 映射（用于追问表和采纳表）
  const userNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach((u) => {
      map[u.id as string] = (u.username as string) ?? (u.id as string).slice(0, 8);
    });
    return map;
  }, [users]);

  // 追问统计
  const followUpStats = useMemo(() => {
    if (followUpMeals.length === 0) return { max: 0, avg: 0, overLimit: 0 };
    const max = Math.max(...followUpMeals.map((m) => m.follow_up_count));
    const avg = followUpMeals.reduce((a, b) => a + b.follow_up_count, 0) / followUpMeals.length;
    return { max, avg: Math.round(avg * 10) / 10, overLimit: followUpMeals.filter((m) => m.follow_up_count > 2).length };
  }, [followUpMeals]);

  // 过滤后的错误日志
  const filteredErrorLogs = errorFilter
    ? errorLogs.filter((e) => e.source === errorFilter)
    : errorLogs;

  const errorSources = useMemo(() => [...new Set(errorLogs.map((e) => e.source))], [errorLogs]);

  if (!authed) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
          <h1 className="mb-6 text-center text-xl font-bold">食光记 · 后台</h1>
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            placeholder="输入管理员密码"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-emerald-500"
          />
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <button
            onClick={login}
            className="mt-4 w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            进入后台
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-bold">食光记 · 数据后台</h1>
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1 text-sm">
            <button
              onClick={() => setTab("dashboard")}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${tab === "dashboard" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              数据看板
            </button>
            <button
              onClick={() => setTab("quality")}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${tab === "quality" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              抽样质检
            </button>
          </div>
        </div>

        {tab === "dashboard" && (
          <>
        {/* 概览统计（4列） */}
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard label="总用户数" value={totalUsers} />
          <StatCard label="总餐次数" value={totalMeals} />
          <StatCard label="人均餐次" value={mealsPerUser.toFixed(1)} />
          <StatCard label="总错误数" value={errorLogs.length} color="red" />
        </div>

        {/* 分析卡片区域 */}
        <div className="mb-6 grid grid-cols-1 gap-4">
          {/* 用户留存 */}
          <Card title="📈 用户留存">
            {retention ? (
              <div>
                <div className="mb-3 grid grid-cols-3 gap-3 text-center text-sm">
                  <div className="rounded-lg bg-gray-50 py-2">
                    <p className="text-xs text-gray-500">D2 留存</p>
                    <p className="text-lg font-bold text-emerald-600">{(retention.day2Rate * 100).toFixed(1)}%</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 py-2">
                    <p className="text-xs text-gray-500">D7 留存</p>
                    <p className="text-lg font-bold text-emerald-600">{(retention.day7Rate * 100).toFixed(1)}%</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 py-2">
                    <p className="text-xs text-gray-500">总记录天数</p>
                    <p className="text-lg font-bold">{retention.totalRecordingDays}</p>
                  </div>
                </div>
                {retention.dau.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs text-gray-500">近30天 DAU</p>
                    <div className="flex items-end gap-0.5" style={{ height: 60 }}>
                      {retention.dau.map((d) => {
                        const maxUsers = Math.max(...retention.dau.map((x) => x.users), 1);
                        const h = Math.max(4, (d.users / maxUsers) * 56);
                        return (
                          <div
                            key={d.date}
                            className="flex-1 rounded-t bg-emerald-400"
                            style={{ height: h }}
                            title={`${d.date}: ${d.users}人`}
                          />
                        );
                      })}
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-gray-300">
                      <span>{retention.dau[0]?.date}</span>
                      <span>{retention.dau[retention.dau.length - 1]?.date}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-gray-400">暂无留存数据</p>
            )}
          </Card>

          {/* Token 用量 */}
          <Card title="💰 Token 用量（DeepSeek 成本）">
            {costStats ? (
              <div>
                <div className="mb-3 grid grid-cols-4 gap-2 text-center text-sm">
                  <div className="rounded-lg bg-gray-50 py-2">
                    <p className="text-xs text-gray-500">输入</p>
                    <p className="text-base font-bold">{(costStats.totalPrompt / 1000).toFixed(0)}K</p>
                  </div>
                  <div className="rounded-lg bg-green-50 py-2">
                    <p className="text-xs text-gray-500">缓存命中</p>
                    <p className="text-base font-bold text-green-700">
                      {costStats.totalPrompt > 0 ? (costStats.totalCacheHit / costStats.totalPrompt * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 py-2">
                    <p className="text-xs text-gray-500">输出</p>
                    <p className="text-base font-bold">{(costStats.totalCompletion / 1000).toFixed(0)}K</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 py-2">
                    <p className="text-xs text-gray-500">费用</p>
                    <p className="text-base font-bold text-amber-600">¥{costStats.estimatedCost.toFixed(4)}</p>
                  </div>
                </div>
                {costStats.bySource.length > 0 && (
                  <table className="mt-3 w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="pb-2">来源</th>
                        <th className="pb-2">调用次数</th>
                        <th className="pb-2">输入 Token</th>
                        <th className="pb-2">输出 Token</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costStats.bySource.sort((a, b) => b.prompt + b.completion - (a.prompt + a.completion)).map((s) => (
                        <tr key={s.source} className="border-b last:border-0">
                          <td className="py-2">
                            <SourceBadge source={s.source} />
                          </td>
                          <td className="py-2">{s.calls}</td>
                          <td className="py-2 text-xs text-gray-500">{(s.prompt / 1000).toFixed(1)}K</td>
                          <td className="py-2 text-xs text-gray-500">{(s.completion / 1000).toFixed(1)}K</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-gray-400">暂无调用记录</p>
            )}
          </Card>

          {/* 用户满意度 */}
          <Card title="📊 用户满意度">
            <div className="grid grid-cols-3 gap-4">
              <RatingMini label="🍽 单餐" stats={mealRating} />
              <RatingMini label="📅 每日" stats={dailyRating} />
              <RatingMini label="📊 每周" stats={weeklyRating} />
            </div>
          </Card>

          {/* 信息完整性追问 */}
          <Card title="📋 信息完整性追问">
            <div className="mb-3 grid grid-cols-3 text-sm">
              <div className="text-center">
                <span className="text-gray-500">追问餐次</span>
                <p className="text-lg font-bold">{followUpMeals.length}</p>
              </div>
              <div className="text-center">
                <span className="text-gray-500">最多追问</span>
                <p className="text-lg font-bold">{followUpStats.max}轮</p>
              </div>
              <div className="text-center">
                <span className="text-gray-500">平均追问</span>
                <p className="text-lg font-bold">{followUpStats.avg}轮</p>
              </div>
            </div>
            {followUpStats.overLimit > 0 && (
              <div className="mb-3 text-center">
                <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-600">
                  ⚠ {followUpStats.overLimit}条超限
                </span>
              </div>
            )}
            {followUpMeals.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">暂无追问记录</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2">日期</th>
                    <th className="pb-2">用户</th>
                    <th className="pb-2">餐次</th>
                    <th className="pb-2">追问轮数</th>
                  </tr>
                </thead>
                <tbody>
                  {followUpMeals.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="py-2">{m.date}</td>
                      <td className="py-2 text-xs font-mono text-gray-500">{userNameMap[m.user_id] ?? m.user_id.slice(0, 8)}</td>
                      <td className="py-2">{m.meal_type}</td>
                      <td className={`py-2 font-bold ${m.follow_up_count > 2 ? "text-red-600" : ""}`}>
                        {m.follow_up_count > 2 && "🔴 "}{m.follow_up_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {/* 每周目标采纳率 */}
          <Card title="🎯 每周目标采纳率">
            <RatingBar
              total={goalAdoption.total}
              rated={goalAdoption.adopted}
              satisfied={goalAdoption.adopted}
              label="采纳"
            />
            <div className="mt-3 flex gap-4 text-sm">
              <span className="text-gray-500">
                已采纳：<strong className="text-emerald-700">{goalAdoption.adopted}</strong>
              </span>
              <span className="text-gray-500">
                有建议：<strong>{goalAdoption.total}</strong>
              </span>
            </div>
            {goalAdoption.records.length > 0 && (
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2">周起始</th>
                    <th className="pb-2">用户</th>
                    <th className="pb-2">采纳时间</th>
                  </tr>
                </thead>
                <tbody>
                  {goalAdoption.records.slice(0, 10).map((r, i) => (
                    <tr key={`${r.week_start}-${r.user_id}-${i}`} className="border-b last:border-0">
                      <td className="py-2">{r.week_start}</td>
                      <td className="py-2 text-xs font-mono text-gray-500">{userNameMap[r.user_id] ?? r.user_id.slice(0, 8)}</td>
                      <td className="py-2 text-xs text-gray-400">
                        {r.target_adopted_at ? new Date(r.target_adopted_at).toLocaleString("zh-CN") : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {goalAdoption.records.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400">暂无采纳记录</p>
            )}
          </Card>
        </div>

        {/* 报错情况日志（全宽） */}
        <Card title="⚠ 报错情况日志（最近50条）">
          {errorSources.length > 0 && (
            <div className="mb-4 flex items-center gap-2">
              <label className="text-xs text-gray-500">筛选来源：</label>
              <select
                value={errorFilter}
                onChange={(e) => setErrorFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1 text-xs outline-none"
              >
                <option value="">全部 ({errorLogs.length})</option>
                {errorSources.map((s) => (
                  <option key={s} value={s}>{s} ({errorLogs.filter((e) => e.source === s).length})</option>
                ))}
              </select>
            </div>
          )}
          {filteredErrorLogs.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">暂无错误记录 🎉</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 w-28">时间</th>
                  <th className="pb-2 w-32">来源</th>
                  <th className="pb-2">错误信息</th>
                </tr>
              </thead>
              <tbody>
                {filteredErrorLogs.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="py-2 text-xs text-gray-400">
                      {new Date(e.created_at).toLocaleString("zh-CN")}
                    </td>
                    <td className="py-2">
                      <SourceBadge source={e.source} />
                    </td>
                    <td className="py-2 max-w-xs truncate text-gray-600" title={e.message}>
                      {e.message.length > 60 ? e.message.slice(0, 60) + "…" : e.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* 分割线 */}
        <div className="my-4 border-t border-gray-200" />

        {/* 用户列表（保留原有） */}
        <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold">用户列表</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2">用户名</th>
                <th className="pb-2">目标</th>
                <th className="pb-2">身高</th>
                <th className="pb-2">体重</th>
                <th className="pb-2">年龄</th>
                <th className="pb-2">记录餐次</th>
                <th className="pb-2">创建时间</th>
              </tr>
            </thead>
            <tbody>
              {(users as Record<string, unknown>[]).map((u) => (
                <tr key={u.id as string} className="border-b last:border-0">
                  <td className="py-2 font-medium">{(u.username as string) ?? (u.id as string).slice(0, 8)}</td>
                  <td className="py-2">{u.goal_mode as string ?? "-"}</td>
                  <td className="py-2">{u.height_cm ? `${u.height_cm}cm` : "-"}</td>
                  <td className="py-2">{u.weight_kg ? `${u.weight_kg}kg` : "-"}</td>
                  <td className="py-2">{u.age ? `${u.age}岁` : "-"}</td>
                  <td className="py-2 font-medium">{u.meal_count as number}</td>
                  <td className="py-2 text-xs text-gray-400">
                    {u.created_at ? new Date(u.created_at as string).toLocaleDateString("zh-CN") : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 最近记录（保留原有） */}
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold">最近记录（30条）</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2">日期</th>
                <th className="pb-2">餐次</th>
                <th className="pb-2">内容</th>
                <th className="pb-2">用户</th>
              </tr>
            </thead>
            <tbody>
              {(recentMeals as Record<string, unknown>[]).map((m) => (
                <tr key={m.id as string} className="border-b last:border-0">
                  <td className="py-2">{m.date as string}</td>
                  <td className="py-2">{m.meal_type as string}</td>
                  <td className="py-2 max-w-xs truncate text-gray-600">{m.meal_record_text as string ?? "-"}</td>
                  <td className="py-2 text-xs text-gray-400">{userNameMap[m.user_id as string] ?? (m.user_id as string).slice(0, 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          </>
        )}

        {tab === "quality" && <QualityTab />}
      </div>
    </div>
  );
}

// ====== 质检 Tab ======

function QualityTab() {
  const [scene, setScene] = useState<"meal" | "daily" | "assistant">("meal");
  const [sampleSize, setSampleSize] = useState(5);
  const [samples, setSamples] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ total: number; good: number; suspicious: number; bad: number }>({ total: 0, good: 0, suspicious: 0, bad: 0 });
  const [reviews, setReviews] = useState<Record<string, { verdict: string; note: string }>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"pending" | "reviewed">("pending");

  useEffect(() => {
    import("@/lib/db").then((m) => m.adminGetQualityStats().then(setStats));
  }, []);

  const loadSamples = async () => {
    setLoading(true);
    setReviews({});
    if (filter === "reviewed") {
      const data = await import("@/lib/db").then((m) => m.adminGetReviewedItems(scene, sampleSize));
      setSamples(data);
      setLoading(false);
      return;
    }
    let data: Record<string, unknown>[] = [];
    if (scene === "meal") {
      data = await import("@/lib/db").then((m) => m.adminGetRandomMeals(sampleSize));
    } else if (scene === "daily") {
      data = await import("@/lib/db").then((m) => m.adminGetRandomDailySummaries(sampleSize));
    } else {
      data = await import("@/lib/db").then((m) => m.adminGetRandomConversations(sampleSize));
    }
    setSamples(data);
    setLoading(false);
  };

  const setVerdict = async (recordId: string, verdict: string) => {
    setReviews((prev) => ({ ...prev, [recordId]: { ...prev[recordId], verdict } }));
    setSaving((prev) => ({ ...prev, [recordId]: true }));
    try {
      await import("@/lib/db").then((m) => m.saveQualityReview({
        scene,
        record_id: recordId,
        verdict,
        note: reviews[recordId]?.note ?? "",
      }));
      setStats((prev) => ({ ...prev, total: prev.total + 1, [verdict]: (prev[verdict as keyof typeof prev] as number) + 1 }));
      // 标记后从当前列表移除该卡片
      setSamples((prev) => prev.filter((s) => {
        const id = String(s.id ?? s.date ?? s.week_start ?? "");
        return id !== recordId;
      }));
    } catch { /* ignore */ }
    setSaving((prev) => ({ ...prev, [recordId]: false }));
  };

  const setNote = (recordId: string, note: string) => {
    setReviews((prev) => ({ ...prev, [recordId]: { ...prev[recordId], note } }));
  };

  const sceneLabel = scene === "meal" ? "单餐分析" : scene === "daily" ? "每日总结" : "AI助手";
  const passRate = stats.total > 0 ? (stats.good / stats.total * 100).toFixed(0) : "-";

  return (
    <div>
      {/* 统计栏 */}
      <div className="mb-4 grid grid-cols-5 gap-2 text-center text-sm">
        <div className="rounded-lg bg-white p-3 shadow-sm">
          <p className="text-xs text-gray-500">已审</p>
          <p className="text-lg font-bold">{stats.total}</p>
        </div>
        <div className="rounded-lg bg-white p-3 shadow-sm">
          <p className="text-xs text-gray-500">通过率</p>
          <p className="text-lg font-bold text-emerald-600">{passRate}%</p>
        </div>
        <div className="rounded-lg bg-emerald-50 p-3 shadow-sm">
          <p className="text-xs text-gray-500">✅ 合理</p>
          <p className="text-lg font-bold text-emerald-700">{stats.good}</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-3 shadow-sm">
          <p className="text-xs text-gray-500">⚠️ 存疑</p>
          <p className="text-lg font-bold text-amber-700">{stats.suspicious}</p>
        </div>
        <div className="rounded-lg bg-red-50 p-3 shadow-sm">
          <p className="text-xs text-gray-500">❌ 错误</p>
          <p className="text-lg font-bold text-red-700">{stats.bad}</p>
        </div>
      </div>

      {/* 抽样控制 */}
      <div className="mb-4 flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 text-sm">
          {(["meal", "daily", "assistant"] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setScene(s); setSamples([]); }}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${scene === s ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              {s === "meal" ? "单餐分析" : s === "daily" ? "每日总结" : "AI助手"}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 text-sm">
          <button
            onClick={() => { setFilter("pending"); setSamples([]); }}
            className={`rounded-md px-3 py-1 font-medium transition-colors ${filter === "pending" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            待审核
          </button>
          <button
            onClick={() => { setFilter("reviewed"); setSamples([]); }}
            className={`rounded-md px-3 py-1 font-medium transition-colors ${filter === "reviewed" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            已审核
          </button>
        </div>
        {filter === "pending" && (
          <>
            <select
              value={sampleSize}
              onChange={(e) => setSampleSize(Number(e.target.value))}
              className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none"
            >
              <option value={5}>抽5条</option>
              <option value={10}>抽10条</option>
              <option value={20}>抽20条</option>
            </select>
            <button
              onClick={loadSamples}
              disabled={loading}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? "抽取中..." : "随机抽取"}
            </button>
          </>
        )}
        {filter === "reviewed" && (
          <button
            onClick={loadSamples}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "加载中..." : "查看已审核"}
          </button>
        )}
      </div>

      {/* 样本列表 */}
      {samples.length === 0 && !loading && (
        <p className="py-8 text-center text-sm text-gray-400">
          {filter === "pending" ? "点击「随机抽取」开始质检" : "点击「查看已审核」加载历史记录"}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3">
        {samples.map((s, i) => (
          <QualityCard
            key={String(s.id ?? i)}
            scene={scene}
            data={s}
            index={i}
            review={reviews[s.id as string] ?? reviews[s.date as string] ?? reviews[s.week_start as string]}
            saving={saving[s.id as string] ?? saving[s.date as string] ?? saving[s.week_start as string]}
            onVerdict={(v) => setVerdict(String(s.id ?? s.date ?? s.week_start), v)}
            onNoteChange={(n) => setNote(String(s.id ?? s.date ?? s.week_start), n)}
          />
        ))}
      </div>
    </div>
  );
}

function QualityCard({
  scene, data, index, review, saving, onVerdict, onNoteChange,
}: {
  scene: string;
  data: Record<string, unknown>;
  index: number;
  review?: { verdict: string; note: string };
  saving?: boolean;
  onVerdict: (v: string) => void;
  onNoteChange: (n: string) => void;
}) {
  const mealId = data.id as string ?? "";
  const defaultVerdict = data._verdict as string | undefined;
  const defaultNote = data._note as string | undefined;
  const reviewedAt = data._reviewed_at as string | undefined;
  const isReviewed = !!review?.verdict || !!defaultVerdict;
  const verdict = review?.verdict ?? defaultVerdict ?? "";
  const note = review?.note ?? defaultNote ?? "";
  const isHighRisk = scene === "meal" && ((data.follow_up_count as number) ?? 0) > 2;
  const verdictLabel = verdict === "good" ? "✅ 合理" : verdict === "suspicious" ? "⚠️ 存疑" : verdict === "bad" ? "❌ 错误" : "";

  return (
    <div className={`rounded-lg bg-white p-4 shadow-sm ${isReviewed ? "opacity-60" : ""}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs text-gray-500">
          #{index + 1}
          {scene === "meal" && (
            <>
              <span>{data.date as string}</span>
              <span>{data.meal_type as string}</span>
            </>
          )}
          {scene === "daily" && <span>{data.date as string}</span>}
          {scene === "assistant" && <span>{data.date as string}</span>}
          {isHighRisk && <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-600">追问{String(data.follow_up_count)}次</span>}
        </span>
        {saving && <span className="text-xs text-gray-400">保存中...</span>}
        {isReviewed && <span className="text-xs text-emerald-600">已标记</span>}
      </div>

      {/* 用户输入/提问 */}
      {scene === "meal" && (
        <div className="mb-2 rounded-lg bg-gray-50 p-2.5 text-sm text-gray-700">
          <span className="text-xs text-gray-400">用户描述：</span>
          {(data.meal_record_text as string)?.slice(0, 200) ?? "-"}
        </div>
      )}
      {scene === "daily" && (
        <div className="mb-2 rounded-lg bg-gray-50 p-2.5 text-sm text-gray-700">
          <span className="text-xs text-gray-400">日期：</span>{data.date as string}
          {(data.analysis_text as string) && (
            <div className="mt-1 line-clamp-3">{(data.analysis_text as string).slice(0, 300)}</div>
          )}
        </div>
      )}
      {scene === "assistant" && (
        <div className="mb-2">
          {/* 工具调用 */}
          {((data.tool_summary as string[])?.length ?? 0) > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              <span className="text-xs text-gray-400">工具调用：</span>
              {(data.tool_summary as string[]).map((t: string) => (
                <span key={t} className="rounded bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-700">{t}</span>
              ))}
            </div>
          )}
          {/* 完整对话 */}
          <div className="max-h-64 overflow-y-auto space-y-1.5 rounded-lg bg-gray-50 p-2.5 text-sm">
            {((data.messages as Array<{ role: string; content: string }>) ?? []).map((msg, i) => (
              <div key={i} className={`${msg.role === "user" ? "text-emerald-700" : "text-gray-700"}`}>
                <span className="text-xs text-gray-400">{msg.role === "user" ? "用户" : "AI"}：</span>
                {msg.content?.slice(0, 300) || <span className="text-gray-300">（无内容）</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI 输出 */}
      {scene === "meal" && (
        <div className="mb-2 text-sm">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(data.nutrition_estimate as Record<string, number>) && Object.entries(data.nutrition_estimate as Record<string, number>).map(([k, v]) => (
              <span key={k} className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">
                {k.replace("_g", "").replace("_kcal", "")}: {v}{k.includes("kcal") ? "kcal" : "g"}
              </span>
            ))}
          </div>
          {(data.meal_status as Record<string, string>) && (
            <div className="flex flex-wrap gap-1">
              {Object.entries(data.meal_status as Record<string, string>).map(([k, v]) => (
                <span key={k} className={`rounded px-1.5 py-0.5 text-xs ${v === "是" || v === "较多" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                  {k}: {v}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {scene === "daily" && (
        <div className="mb-2 text-sm">
          {(data.daily_status as Record<string, string>) && (
            <div className="flex flex-wrap gap-1 mb-2">
              {Object.entries(data.daily_status as Record<string, string>).map(([k, v]) => (
                <span key={k} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{k}: {v}</span>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 italic">「{(data.feedback as string)?.slice(0, 80)}」</p>
        </div>
      )}

      {/* 质检标记 */}
      {!isReviewed ? (
        <div className="flex items-center gap-2">
          <span className="mr-2 text-xs text-gray-500">标记：</span>
          {[
            { key: "good", label: "✅ 合理", cls: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
            { key: "suspicious", label: "⚠️ 存疑", cls: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
            { key: "bad", label: "❌ 错误", cls: "bg-red-50 text-red-700 hover:bg-red-100" },
          ].map(({ key, label, cls }) => (
            <button
              key={key}
              onClick={() => onVerdict(key)}
              disabled={saving}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${cls}`}
            >
              {label}
            </button>
          ))}
          <input
            type="text"
            placeholder="备注（存疑/错误时建议填）"
            value={review?.note ?? ""}
            onChange={(e) => onNoteChange(e.target.value)}
            className="ml-2 flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs outline-none focus:border-emerald-400"
          />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
            verdict === "good" ? "bg-emerald-50 text-emerald-700" :
            verdict === "suspicious" ? "bg-amber-50 text-amber-700" :
            "bg-red-50 text-red-700"
          }`}>
            已标记：{verdictLabel}
          </span>
          {note && <span className="text-xs text-gray-500">备注：{note}</span>}
          {reviewedAt && (
            <span className="text-xs text-gray-400">
              {new Date(reviewedAt).toLocaleString("zh-CN")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ====== 子组件 ======

function StatCard({ label, value, color }: { label: string; value: string | number; color?: "red" }) {
  return (
    <div className="rounded-lg bg-white p-3 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-0.5 text-xl font-bold ${color === "red" ? "text-red-500" : "text-emerald-600"}`}>
        {value}
      </p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function RatingBar({ total, rated, satisfied, label }: { total: number; rated: number; satisfied: number; label?: string }) {
  const rate = rated > 0 ? (satisfied / rated) * 100 : 0;
  const barColor = rate >= 80 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold">{rate.toFixed(1)}%</span>
        <span className="text-xs text-gray-400">{label ?? "认可率"} = 满意数 / 已评总数</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
    </div>
  );
}

function RatingMini({ label, stats }: { label: string; stats: RatingStats }) {
  const rate = stats.rated > 0 ? (stats.satisfied / stats.rated) * 100 : 0;
  const barColor = rate >= 75 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="text-center">
      <p className="mb-1 text-xs font-medium text-gray-500">{label}</p>
      <p className="mb-1 text-lg font-bold">{rate.toFixed(0)}%</p>
      <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
      <p className="text-xs text-gray-400">
        {stats.satisfied}/{stats.rated} 满意
      </p>
      <p className="text-xs text-gray-300">
        ({stats.rated}/{stats.total} 已评)
      </p>
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    "meal-chat": "bg-blue-50 text-blue-700",
    "meal-chat/analyze": "bg-blue-50 text-blue-700",
    "daily-summary": "bg-green-50 text-green-700",
    "weekly-analysis": "bg-purple-50 text-purple-700",
    proactive: "bg-amber-50 text-amber-700",
    "assistant/chat": "bg-indigo-50 text-indigo-700",
    "assistant/chat-stream": "bg-indigo-50 text-indigo-700",
    "assistant/chat-extractMemory": "bg-gray-100 text-gray-600",
  };
  const cls = colors[source] ?? "bg-gray-100 text-gray-600";

  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-mono ${cls}`}>
      {source}
    </span>
  );
}

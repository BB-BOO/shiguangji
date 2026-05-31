"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { adminGetStats } from "@/lib/db";

type Stats = Awaited<ReturnType<typeof adminGetStats>>;

const ADMIN_PASSWORD = "shiguangji2024";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  function login() {
    if (pwd === ADMIN_PASSWORD) {
      setAuthed(true);
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
        { count: totalMeals },
        { data: recentMeals },
      ] = await Promise.all([
        supabase.from("users").select("*").order("created_at", { ascending: false }),
        supabase.from("meal_records").select("*", { count: "exact", head: true }),
        supabase.from("meal_records").select("id, date, meal_type, meal_record_text, user_id, created_at").order("created_at", { ascending: false }).limit(30),
      ]);

      // 每个用户的餐次数
      const { data: userMealCounts } = await supabase
        .from("meal_records")
        .select("user_id");

      const countMap: Record<string, number> = {};
      (userMealCounts ?? []).forEach((m) => {
        countMap[m.user_id as string] = (countMap[m.user_id as string] ?? 0) + 1;
      });

      setUsers(
        (usersData ?? []).map((u) => ({
          ...u,
          meal_count: countMap[u.id as string] ?? 0,
        })),
      );

      setStats({
        totalUsers: (usersData ?? []).length,
        totalMeals: totalMeals ?? 0,
        mealsPerUser: (usersData ?? []).length
          ? (totalMeals ?? 0) / (usersData ?? []).length
          : 0,
        recentActivity: recentMeals ?? [],
      });

      setLoading(false);
    }
    load();
  }, [authed]);

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
    <div className="min-h-dvh bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-bold">食光记 · 数据后台</h1>

        {/* 概览统计 */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">总用户数</p>
            <p className="mt-1 text-3xl font-bold text-emerald-600">{stats?.totalUsers}</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">总餐次数</p>
            <p className="mt-1 text-3xl font-bold text-emerald-600">{stats?.totalMeals}</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">人均餐次</p>
            <p className="mt-1 text-3xl font-bold text-emerald-600">
              {stats?.mealsPerUser.toFixed(1)}
            </p>
          </div>
        </div>

        {/* 用户列表 */}
        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">用户列表</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2">用户 ID</th>
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
                  <td className="py-2 font-mono text-xs text-gray-400">{(u.id as string).slice(0, 8)}...</td>
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

        {/* 最近记录 */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">最近记录（30条）</h2>
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
              {(stats?.recentActivity as Record<string, unknown>[] ?? []).map((m) => (
                <tr key={m.id as string} className="border-b last:border-0">
                  <td className="py-2">{m.date as string}</td>
                  <td className="py-2">{m.meal_type as string}</td>
                  <td className="py-2 max-w-xs truncate text-gray-600">{m.meal_record_text as string ?? "-"}</td>
                  <td className="py-2 font-mono text-xs text-gray-400">{(m.user_id as string).slice(0, 8)}...</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

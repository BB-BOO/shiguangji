"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { loadMeals, deleteMeals, saveMeal } from "@/lib/storage";
import type { MealRecord, MealType } from "@/lib/types";
import { IconBack, IconTrash } from "@/components/ui/Icons";
import Link from "next/link";

const MEAL_EMOJI: Record<MealType, string> = {
  早餐: "🌅",
  午餐: "☀️",
  晚餐: "🌙",
  加餐: "🍎",
};

interface GroupedMeals {
  date: string;
  dateLabel: string;
  meals: MealRecord[];
}

function groupByDate(meals: MealRecord[]): GroupedMeals[] {
  const map = new Map<string, MealRecord[]>();
  for (const m of meals) {
    const list = map.get(m.date) || [];
    list.push(m);
    map.set(m.date, list);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, meals]) => {
      const d = new Date(date + "T00:00:00");
      const weekDay = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
      return {
        date,
        dateLabel: `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 周${weekDay}`,
        meals: meals.sort((a, b) => b.created_at.localeCompare(a.created_at)),
      };
    });
}

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [groups, setGroups] = useState<GroupedMeals[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealRecord | null>(null);
  const [editText, setEditText] = useState("");

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { router.replace("/login"); return; }
    setReady(true);
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!ready) return;
    const allMeals = loadMeals();
    setGroups(groupByDate(allMeals));
  }, [ready]);

  // Re-sync on focus
  useEffect(() => {
    if (!ready) return;
    const onFocus = () => setGroups(groupByDate(loadMeals()));
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onFocus);
    };
  }, [ready]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleDelete = () => {
    if (selectedIds.size === 0) return;
    deleteMeals(Array.from(selectedIds));
    setGroups(groupByDate(loadMeals()));
    setSelectedIds(new Set());
    setShowConfirm(false);
    setEditMode(false);
  };

  const handleCardClick = (meal: MealRecord) => {
    if (editMode) return;
    setEditingMeal(meal);
    setEditText(meal.meal_record_text);
  };

  const handleSaveEdit = () => {
    if (!editingMeal || !editText.trim()) return;
    const updated: MealRecord = { ...editingMeal, meal_record_text: editText.trim() };
    saveMeal(updated);
    setGroups(groupByDate(loadMeals()));
    setEditingMeal(null);
  };

  const exitEditMode = () => {
    setEditMode(false);
    setSelectedIds(new Set());
    setShowConfirm(false);
  };

  const totalCalories = (meals: MealRecord[]) =>
    meals.reduce((sum, m) => sum + m.nutrition_estimate.calories_kcal, 0);

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
          <h1 className="text-lg font-bold tracking-tight">历史饮食</h1>
          <div>
            {groups.length > 0 ? (
              <button
                onClick={() => editMode ? exitEditMode() : setEditMode(true)}
                className="rounded-full bg-white/70 px-3 py-1.5 text-sm font-medium shadow-sm backdrop-blur-sm transition-colors hover:bg-white active:scale-[0.98]"
                style={{ color: editMode ? "#f43f5e" : "var(--color-muted)" }}
              >
                {editMode ? "取消" : "编辑"}
              </button>
            ) : (
              <div className="w-[52px]" />
            )}
          </div>
        </div>
      </header>

      {groups.length === 0 ? (
        <div className="card-elevated flex flex-col items-center rounded-[22px] border border-dashed border-emerald-200/60 px-6 py-16 text-center">
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl">
            🥗
          </span>
          <p className="text-sm font-medium text-[var(--color-text)]">
            暂无饮食记录，去添加一餐吧
          </p>
          <Link
            href="/meal"
            className="btn-primary mt-5 inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-white"
          >
            添加一餐
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.date}>
              <h2 className="mb-3 ml-1 text-xs font-semibold text-[var(--color-muted)]">
                {group.dateLabel}
              </h2>
              <div className="space-y-2">
                {group.meals.map((meal) => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    editMode={editMode}
                    selected={selectedIds.has(meal.id)}
                    onToggle={() => toggleSelect(meal.id)}
                    onClick={() => handleCardClick(meal)}
                  />
                ))}
              </div>
              <p className="mt-2.5 ml-1 text-[11px] text-[var(--color-muted)]">
                当日合计 {totalCalories(group.meals)} 千卡 · {group.meals.length} 餐
              </p>
            </section>
          ))}

          {/* Edit mode bottom bar */}
          {editMode && (
            <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/60 bg-white/90 px-5 py-4 shadow-[0_-8px_32px_rgba(26,46,36,0.08)] backdrop-blur-xl">
              <div className="mx-auto flex max-w-md items-center justify-between">
                <span className="text-sm font-medium text-[var(--color-text)]">
                  已选 {selectedIds.size} 项
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={exitEditMode}
                    className="rounded-2xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-gray-200 active:scale-[0.98]"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => setShowConfirm(true)}
                    disabled={selectedIds.size === 0}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-600 disabled:opacity-40 active:scale-[0.98]"
                  >
                    <IconTrash className="h-4 w-4" />
                    删除所选
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Spacer for bottom bar */}
          {editMode && <div className="h-20" />}
        </div>
      )}

      {/* Delete confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm px-6">
          <div className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-[0_16px_48px_rgba(0,0,0,0.15)]">
            <p className="text-center text-[15px] font-semibold text-[var(--color-text)]">
              确定删除所选餐记录吗？
            </p>
            <p className="mt-2 text-center text-xs text-[var(--color-muted)]">
              此操作无法撤销
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-2xl bg-gray-100 py-3 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-gray-200 active:scale-[0.98]"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-2xl bg-red-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-600 active:scale-[0.98]"
              >
                确定删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit meal modal */}
      {editingMeal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-t-[24px] sm:rounded-[24px] bg-white p-6 shadow-[0_16px_48px_rgba(0,0,0,0.15)]">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-lg">
                {MEAL_EMOJI[editingMeal.meal_type]}
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  {editingMeal.meal_type}
                </p>
                <p className="text-[11px] text-[var(--color-muted)]">
                  {editingMeal.date}
                </p>
              </div>
            </div>

            <label className="mb-1.5 block text-[11px] font-medium text-[var(--color-muted)]">
              食物描述
            </label>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-2xl border border-[var(--color-border)] bg-gray-50/80 px-4 py-3 text-sm leading-relaxed outline-none transition-all focus:border-emerald-300 focus:bg-white focus:shadow-[0_0_0_3px_rgba(46,184,114,0.12)]"
              placeholder="描述你吃了什么…"
            />

            <p className="mt-2 text-[10px] text-[var(--color-muted)]">
              修改描述不会触发 AI 重新分析，如需更新营养素数据请删除后重新记录
            </p>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setEditingMeal(null)}
                className="flex-1 rounded-2xl bg-gray-100 py-3 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-gray-200 active:scale-[0.98]"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editText.trim()}
                className="flex-1 rounded-2xl bg-emerald-500 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-40"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function MealCard({
  meal, editMode, selected, onToggle, onClick,
}: { meal: MealRecord; editMode: boolean; selected: boolean; onToggle: () => void; onClick: () => void }) {
  return (
    <div
      onClick={editMode ? onToggle : onClick}
      className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-all duration-200 ${
        editMode
          ? selected
            ? "cursor-pointer border-emerald-300 bg-emerald-50/60 shadow-[0_0_0_2px_rgba(46,184,114,0.2)]"
            : "cursor-pointer border-[var(--color-border)] bg-white/80 hover:bg-white"
          : "cursor-pointer border-[var(--color-border)] bg-white/80 hover:shadow-[0_2px_8px_rgba(26,46,36,0.06)] hover:border-emerald-200/60"
      }`}
    >
      {editMode && (
        <div
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            selected ? "border-emerald-500 bg-emerald-500" : "border-gray-300 bg-white"
          }`}
        >
          {selected && (
            <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      )}

      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
        {MEAL_EMOJI[meal.meal_type]}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-[var(--color-muted)]">{meal.meal_type}</span>
        </div>
        <p className="mt-0.5 truncate text-sm font-medium text-[var(--color-text)]">
          {meal.meal_record_text}
        </p>
        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[var(--color-muted)]">
          <span>蛋白质 {Math.round(meal.nutrition_estimate.protein_g)}g</span>
          <span>碳水 {Math.round(meal.nutrition_estimate.carbs_g)}g</span>
          <span>脂肪 {Math.round(meal.nutrition_estimate.fat_g)}g</span>
        </div>
      </div>

      {!editMode && (
        <span className="shrink-0 text-sm font-semibold text-[var(--color-text)] tabular-nums">
          {Math.round(meal.nutrition_estimate.calories_kcal)} kcal
        </span>
      )}
    </div>
  );
}

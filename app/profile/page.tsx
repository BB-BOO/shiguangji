"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { GoalMode } from "@/lib/types";
import Link from "next/link";
import { IconBack } from "@/components/ui/Icons";
import { AISettings } from "@/components/home/AISettings";
import { MemoryManager } from "@/components/home/MemoryManager";

const GOAL_MODES: { mode: GoalMode; desc: string; emoji: string; gradient: string }[] = [
  { mode: "减脂", desc: "降低体脂率", emoji: "🔥", gradient: "from-orange-400 to-rose-400" },
  { mode: "增肌", desc: "增加肌肉量", emoji: "💪", gradient: "from-blue-400 to-indigo-400" },
  { mode: "保持", desc: "维持当前状态", emoji: "⚖️", gradient: "from-emerald-400 to-teal-400" },
];

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, userProfile, dailyTarget, updateProfile, logout } = useAuth();
  const [goalMode, setGoalMode] = useState<GoalMode>(userProfile?.goal_mode ?? "保持");
  const [height, setHeight] = useState(String(userProfile?.height_cm ?? ""));
  const [weight, setWeight] = useState(String(userProfile?.weight_kg ?? ""));
  const [age, setAge] = useState(String(userProfile?.age ?? ""));
  const [saved, setSaved] = useState(false);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [isAuthenticated, router]);

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

  const handleSave = () => {
    if (!height.trim() || !weight.trim() || !age.trim()) return;
    updateProfile({
      goal_mode: goalMode,
      height_cm: Number(height),
      weight_kg: Number(weight),
      age: Number(age),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const canSave = height.trim() && weight.trim() && age.trim();

  return (
    <main className="min-h-dvh px-5 pt-7 pb-10">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center rounded-full bg-white/70 p-2 text-[var(--color-muted)] shadow-sm backdrop-blur-sm transition-colors hover:text-[var(--color-primary)] active:scale-[0.98]"
          >
            <IconBack />
          </Link>
          <h1 className="text-lg font-bold tracking-tight">个人资料</h1>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-emerald-600 disabled:opacity-40 active:scale-[0.97] shadow-[0_4px_12px_rgba(46,184,114,0.3)]"
          >
            {saved ? "已保存 ✓" : "保存"}
          </button>
        </div>
      </header>

      <div className="space-y-5">
        {/* Goal mode */}
        <section className="card-elevated rounded-[22px] p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              🎯
            </span>
            <h2 className="text-[16px] font-semibold tracking-tight">目标模式</h2>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {GOAL_MODES.map(({ mode, desc, emoji, gradient }) => {
              const active = goalMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setGoalMode(mode)}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl py-3.5 text-sm font-semibold transition-all duration-200 ${
                    active
                      ? `bg-gradient-to-b ${gradient} text-white shadow-[0_4px_14px_rgba(46,184,114,0.3)] scale-[1.03]`
                      : "bg-gray-100/90 text-[var(--color-text)] hover:bg-gray-100 active:scale-[0.98]"
                  }`}
                >
                  <span className="text-lg">{emoji}</span>
                  <span className="text-[13px]">{mode}</span>
                  <span className={`text-[10px] font-normal ${active ? "text-white/80" : "text-[var(--color-muted)]"}`}>
                    {desc}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Body data */}
        <section className="card-elevated rounded-[22px] p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              📐
            </span>
            <h2 className="text-[16px] font-semibold tracking-tight">身体数据</h2>
          </div>
          <div className="space-y-3">
            <InputRow
              label="身高"
              value={height}
              onChange={setHeight}
              placeholder="厘米"
              unit="cm"
              icon="📏"
            />
            <InputRow
              label="体重"
              value={weight}
              onChange={setWeight}
              placeholder="公斤"
              unit="kg"
              icon="⚖️"
            />
            <InputRow
              label="年龄"
              value={age}
              onChange={setAge}
              placeholder="年龄"
              unit="岁"
              icon="🎂"
            />
          </div>
        </section>

        {/* Target range preview */}
        {dailyTarget && (
          <section className="card-elevated rounded-[22px] p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                📊
              </span>
              <h2 className="text-[16px] font-semibold tracking-tight">每日目标范围</h2>
            </div>
            <div className="space-y-2 text-sm">
              <RangePreviewRow label="蛋白质" range={dailyTarget.protein_g} unit="g"
                color="emerald" maxBar={200} />
              <RangePreviewRow label="碳水" range={dailyTarget.carbs_g} unit="g"
                color="amber" maxBar={400} />
              <RangePreviewRow label="蔬菜" range={dailyTarget.vegetables_g} unit="g"
                color="lime" maxBar={600} />
              <RangePreviewRow label="油脂" range={dailyTarget.fat_g} unit="g"
                color="orange" maxBar={100} />
              <RangePreviewRow label="热量" range={dailyTarget.calories_kcal} unit="kcal"
                color="rose" maxBar={3000} />
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-[var(--color-muted)] text-center">
              此目标范围将用于每日对比和每周策略调整
            </p>
          </section>
        )}

        {/* AI Assistant Settings */}
        <AISettings />

        {/* Memory Management */}
        <MemoryManager />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full rounded-2xl py-3.5 text-sm font-medium text-red-500 transition-all hover:bg-red-50 active:scale-[0.98]"
        >
          退出登录
        </button>
      </div>
    </main>
  );
}

function InputRow({
  label, value, onChange, placeholder, unit, icon,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; unit: string; icon: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-sm font-medium text-[var(--color-text)]">{label}</span>
      <div className="relative flex-1">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-[var(--color-border)] bg-gray-50/80 pl-9 pr-14 py-2.5 text-sm outline-none transition-all focus:border-emerald-300 focus:bg-white focus:shadow-[0_0_0_3px_rgba(46,184,114,0.12)]"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">{icon}</span>
      </div>
      <span className="w-8 text-right text-xs text-[var(--color-muted)]">{unit}</span>
    </div>
  );
}

function RangePreviewRow({
  label, range, unit, color, maxBar,
}: {
  label: string; range: { min: number; max: number }; unit: string; color: string; maxBar: number;
}) {
  const minPct = (range.min / maxBar) * 100;
  const maxPct = (range.max / maxBar) * 100;

  return (
    <div className="rounded-xl bg-gray-50/60 px-3.5 py-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--color-muted)]">{label}</span>
        <span className="text-xs font-semibold tabular-nums text-[var(--color-text)]">
          {range.min} – {range.max} {unit}
        </span>
      </div>
      <div className="mt-2 h-[6px] overflow-hidden rounded-full bg-white shadow-[inset_0_1px_2px_rgba(26,46,36,0.06)]">
        <div
          className="h-full rounded-full bg-current opacity-25"
          style={{
            marginLeft: `${minPct}%`,
            width: `${maxPct - minPct}%`,
            color: `var(--color-${color}, #10b981)`,
          }}
        />
      </div>
    </div>
  );
}

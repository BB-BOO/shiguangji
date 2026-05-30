"use client";

import { useMemo } from "react";

function getGreeting(): { emoji: string; text: string } {
  const hour = new Date().getHours();
  if (hour < 10) return { emoji: "☀️", text: "早上好" };
  if (hour < 14) return { emoji: "🌤️", text: "中午好" };
  if (hour < 18) return { emoji: "🌿", text: "下午好" };
  return { emoji: "🌙", text: "晚上好" };
}

function getGreetingText(mealCount: number, hasSummary: boolean): string {
  const hour = new Date().getHours();
  if (mealCount === 0) {
    if (hour < 10) return "早上好，今天早餐蛋白质达标了吗？";
    if (hour < 14) return "中午好，该记录午餐了";
    if (hour < 18) return "下午好，今天还没记录饮食哦";
    return "晚上好，别忘了记录今天的饮食";
  }
  if (!hasSummary) {
    if (hour < 14) return `上午好，已记录 ${mealCount} 餐，还差午餐`;
    if (hour < 18) return `下午好，已记录 ${mealCount} 餐，还差晚餐`;
    return `晚上好，已记录 ${mealCount} 餐`;
  }
  if (hour < 10) return "早上好，今天早餐蛋白质达标了吗？";
  if (hour < 14) return "中午好，记得均衡搭配哦";
  if (hour < 18) return "下午好，今天的热量控制得不错～";
  return "晚上好，今天的热量控制得不错～";
}

function getGreetingEmoji(): string {
  const hour = new Date().getHours();
  if (hour < 10) return "☀️";
  if (hour < 14) return "☀️";
  if (hour < 18) return "☀️";
  return "🌙";
}

interface GreetingBannerProps {
  mealCount: number;
  hasSummary: boolean;
  weeklyDays: number;
}

export function GreetingBanner({ mealCount, hasSummary }: GreetingBannerProps) {
  const text = useMemo(() => getGreetingText(mealCount, hasSummary), [mealCount, hasSummary]);
  const emoji = useMemo(() => getGreetingEmoji(), []);

  return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-lime-50 px-4 py-3">
      <span className="text-xl">{emoji}</span>
      <p className="text-[14px] leading-relaxed text-[var(--color-text)]">{text}</p>
    </div>
  );
}

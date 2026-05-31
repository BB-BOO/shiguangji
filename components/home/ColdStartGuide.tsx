"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { loadMeals, loadTodayMeals } from "@/lib/storage";

interface GuideCard {
  icon: string;
  text: string;
  href: string;
  action: string;
}

async function buildCards(): Promise<GuideCard[]> {
  const todayMeals = await loadTodayMeals();
  const mainMeals = todayMeals.filter((m) => m.meal_type !== "加餐");
  const mainCount = mainMeals.length;
  const allMeals = await loadMeals();
  const totalMeals = allMeals.length;
  const totalDays = new Set(allMeals.map((m) => m.date)).size;

  const cards: GuideCard[] = [];

  if (mainCount === 0) {
    cards.push({
      icon: "🥗",
      text: "记录你的第一餐，AI 帮你分析营养 →",
      href: "/meal",
      action: "去记录",
    });
  } else if (mainCount < 3) {
    cards.push({
      icon: "📊",
      text: `已记录 ${mainCount} 餐正餐，再记 ${3 - mainCount} 餐就能看到每日营养总结啦`,
      href: "/meal",
      action: "继续记录",
    });
  }

  cards.push({
    icon: "🤝",
    text: "想让我更懂你？告诉我你的口味偏好和忌口 →",
    href: "/assistant",
    action: "去聊聊",
  });

  if (totalDays > 0 && totalDays < 7) {
    cards.push({
      icon: "📈",
      text: `已坚持记录 ${totalDays} 天，再记 ${7 - totalDays} 天解锁每周分析报告`,
      href: "/weekly",
      action: "去看看",
    });
  }

  if (totalMeals >= 3) {
    cards.push({
      icon: "💡",
      text: "每餐都有蛋白质、蔬菜和碳水，搭配更均衡哦",
      href: "/assistant",
      action: "问食小光",
    });
  }

  if (totalMeals >= 10) {
    cards.push({
      icon: "🎉",
      text: `你已经记录了 ${totalMeals} 餐，食小光越来越了解你了`,
      href: "/history",
      action: "看历史",
    });
  }

  return cards;
}

export function ColdStartGuide() {
  const [cards, setCards] = useState<GuideCard[]>([]);
  const [index, setIndex] = useState(0);
  const [smooth, setSmooth] = useState(true);

  const refresh = useCallback(async () => {
    const newCards = await buildCards();
    setCards(newCards);
    if (newCards.length === 0) return;
    setIndex((prev) => (prev >= newCards.length ? 0 : prev));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onFocus);
    };
  }, [refresh]);

  // Auto-rotate: slide up every 4 seconds
  useEffect(() => {
    if (cards.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => prev + 1);
    }, 4000);
    return () => clearInterval(timer);
  }, [cards.length]);

  // Seamless infinite loop: transition to cloned card first, then jump back
  useEffect(() => {
    if (index >= cards.length && cards.length > 0) {
      const timeout = setTimeout(() => {
        setSmooth(false);
        setIndex(0);
        requestAnimationFrame(() => setSmooth(true));
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [index, cards.length]);

  if (cards.length === 0) return null;

  const loopCards = cards.length > 1 ? [...cards, cards[0]] : cards;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-50 to-lime-50">
      <div className="relative h-[48px] overflow-hidden">
        <div
          className={smooth ? "transition-transform duration-500 ease-in-out" : ""}
          style={{ transform: `translateY(-${index * 48}px)` }}
        >
          {loopCards.map((c, i) => (
            <div key={i} className="flex h-[48px] items-center px-4 py-3">
              <div className="flex items-center gap-3 w-full">
                <span className="text-xl">{c.icon}</span>
                <p className="flex-1 text-[14px] leading-relaxed text-[var(--color-text)]">
                  {c.text}
                </p>
                <Link
                  href={c.href}
                  className="flex-none rounded-full bg-emerald-500 px-3.5 py-1.5 text-[12px] font-semibold text-white transition-all hover:bg-emerald-600 active:scale-[0.96]"
                >
                  {c.action}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  loadTodayMeals,
  loadMeals,
  loadMemory,
  loadProactiveConfig,
  loadProactiveLogs,
  saveProactiveLog,
  dismissProactiveLog,
  createMealId,
  loadConversations,
  saveConversation,
  getTodayKey,
} from "@/lib/storage";
import type { ProactiveLog, AssistantMessage } from "@/lib/types";

export function ProactiveCard() {
  const { userProfile, dailyTarget } = useAuth();
  const [message, setMessage] = useState<ProactiveLog | null>(null);
  const [loading, setLoading] = useState(false);

  const checkProactive = useCallback(async () => {
    if (!userProfile || !dailyTarget) return;

    // 检查今天是否已经显示过
    const logs = loadProactiveLogs();
    const today = new Date().toISOString().split("T")[0];
    const todayDismissed = logs.some(
      (l) => l.pushed_at.startsWith(today) && l.dismissed,
    );
    if (todayDismissed) return;

    // 检查今天已有未关闭的
    const existing = logs
      .filter((l) => !l.dismissed)
      .sort((a, b) => b.pushed_at.localeCompare(a.pushed_at))[0];
    if (existing) {
      setMessage(existing);
      return;
    }

    setLoading(true);
    try {
      const todayMeals = loadTodayMeals();
      const allMeals = loadMeals();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const cutoff = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth() + 1).padStart(2, "0")}-${String(sevenDaysAgo.getDate()).padStart(2, "0")}`;
      const recentMeals = allMeals.filter((m) => m.date >= cutoff);

      const memory = loadMemory();
      const config = loadProactiveConfig();

      const res = await fetch("/api/proactive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          todayMeals,
          recentMeals,
          memoryDimensionCount: new Set(memory.map((e) => e.field)).size,
          proactiveConfig: config,
          lastProactiveLogs: logs,
          memoryText: memory.map((e) => `${e.field}：${e.value}`).join("；"),
        }),
      });

      const data = await res.json();
      if (data.triggered && data.message) {
        const log: ProactiveLog = {
          id: createMealId(),
          event_type: data.event_type || "漏餐关怀",
          message: data.message,
          pushed_at: new Date().toISOString(),
          dismissed: false,
        };
        saveProactiveLog(log);
        setMessage(log);

        // 同时写入 AI 助手对话，作为食小光的主动消息
        const aiMsg: AssistantMessage = {
          role: "ai",
          content: `💬 ${log.message}`,
          timestamp: log.pushed_at,
        };
        const convs = loadConversations();
        const todayConv = convs.find((c) => c.date === getTodayKey());
        if (todayConv) {
          todayConv.messages.push(aiMsg);
          saveConversation(todayConv);
        } else {
          saveConversation({
            id: createMealId(),
            date: getTodayKey(),
            message_preview: log.message.slice(0, 30),
            messages: [aiMsg],
          });
        }
      }
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  }, [userProfile, dailyTarget]);

  useEffect(() => {
    checkProactive();
  }, [checkProactive]);

  if (!message || loading) return null;

  const handleDismiss = () => {
    dismissProactiveLog(message.id);
    setMessage(null);
  };

  return (
    <Link
      href="/assistant"
      className="card-elevated relative overflow-hidden rounded-[22px] bg-gradient-to-r from-blue-50 to-emerald-50 p-4 block transition-all active:scale-[0.98]"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-blue-100 text-sm">
          💬
        </span>
        <p className="flex-1 text-[13px] leading-relaxed text-[var(--color-text)]">
          {message.message.length > 30 ? message.message.slice(0, 30) + "…" : message.message}
        </p>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDismiss(); }}
          className="flex-none rounded-full p-1 text-[var(--color-muted)] hover:bg-black/5 transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </Link>
  );
}

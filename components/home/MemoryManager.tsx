"use client";

import { useEffect, useState } from "react";
import { loadMemory, deleteMemoryEntry } from "@/lib/storage";
import type { MemoryEntry, MemoryDimension } from "@/lib/types";

const DIMENSIONS: { key: MemoryDimension; icon: string; desc: string }[] = [
  { key: "身体数据", icon: "📐", desc: "身高、体重、年龄" },
  { key: "目标", icon: "🎯", desc: "减脂/增肌/保持" },
  { key: "饮食偏好", icon: "🥬", desc: "忌口食物、喜好口味" },
  { key: "生活习惯", icon: "🏃", desc: "作息、运动频率、工作节奏" },
  { key: "饮食模式", icon: "🍽️", desc: "常吃食物、高频餐次" },
];

function classifyEntries(entries: MemoryEntry[]): Record<string, MemoryEntry[]> {
  const map: Record<string, MemoryEntry[]> = {
    身体数据: [],
    目标: [],
    饮食偏好: [],
    生活习惯: [],
    饮食模式: [],
  };
  for (const e of entries) {
    if (e.field.includes("偏好") || e.field.includes("忌口") || e.field.includes("喜欢") || e.field.includes("不吃")) {
      map["饮食偏好"].push(e);
    } else if (e.field.includes("习惯") || e.field.includes("作息") || e.field.includes("运动") || e.field.includes("加班") || e.field.includes("工作")) {
      map["生活习惯"].push(e);
    } else if (e.field.includes("食物") || e.field.includes("常吃") || e.field.includes("餐次")) {
      map["饮食模式"].push(e);
    } else if (e.field.includes("目标") || e.field.includes("减脂") || e.field.includes("增肌")) {
      map["目标"].push(e);
    } else if (e.field.includes("身高") || e.field.includes("体重") || e.field.includes("年龄")) {
      map["身体数据"].push(e);
    } else {
      map["饮食偏好"].push(e);
    }
  }
  return map;
}

function calcPercentage(entries: MemoryEntry[]): number {
  const classified = classifyEntries(entries);
  const filled = Object.values(classified).filter((v) => v.length > 0).length;
  return Math.round((filled / 5) * 100);
}

export function MemoryManager() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setEntries(loadMemory());
  }, []);

  const classified = classifyEntries(entries);
  const percentage = calcPercentage(entries);

  const handleDelete = (field: string, value: string) => {
    deleteMemoryEntry(field, value);
    setEntries(loadMemory());
  };

  return (
    <section className="card-elevated rounded-[22px] p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
          🧠
        </span>
        <h2 className="text-[16px] font-semibold tracking-tight">AI 对我的了解</h2>
      </div>

      {/* 了解度环形图 */}
      <div className="mb-5 flex items-center gap-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 p-4">
        <div className="relative h-16 w-16 flex-none">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="6" />
            <circle
              cx="32" cy="32" r="28" fill="none" stroke="url(#memGrad)" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${percentage * 1.76} 176`}
            />
            <defs>
              <linearGradient id="memGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-purple-700">
            {percentage}%
          </span>
        </div>
        <p className="flex-1 text-[12px] leading-relaxed text-[var(--color-muted)]">
          食小光正在逐渐了解你，多和它聊天能让分析更准确哦～
        </p>
      </div>

      {/* 记忆维度列表 */}
      <div className="space-y-1">
        {DIMENSIONS.map(({ key, icon, desc }) => {
          const dimEntries = classified[key] || [];
          const isKnown = dimEntries.length > 0;
          const isExpanded = expanded === key;
          return (
            <div key={key}>
              <button
                onClick={() => setExpanded(isExpanded ? null : key)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
              >
                <span className="text-lg">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[var(--color-text)]">{key}</p>
                  <p className="text-[11px] text-[var(--color-muted)]">{desc}</p>
                </div>
                {isKnown ? (
                  <span className="text-[12px] font-medium text-emerald-600">已了解 ✓</span>
                ) : (
                  <span className="text-[12px] text-[var(--color-muted)]">待发现 —</span>
                )}
              </button>
              {isExpanded && isKnown && (
                <div className="ml-12 mt-1 space-y-1">
                  {dimEntries.map((e, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] text-[var(--color-text)]">
                          {e.field}：{e.value}
                        </p>
                        <p className="text-[10px] text-[var(--color-muted)]">
                          {e.source === "profile" ? "来自个人资料" : `来自 ${new Date(e.extracted_at).toLocaleDateString("zh-CN")} 对话`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(e.field, e.value)}
                        className="flex-none rounded-lg px-2 py-1 text-[11px] text-red-400 hover:bg-red-50 transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 底部引导 */}
      <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-center">
        <p className="text-[12px] text-[var(--color-muted)]">
          和食小光多聊聊，让它更懂你
        </p>
      </div>
    </section>
  );
}

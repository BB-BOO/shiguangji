"use client";

import { useEffect, useState } from "react";
import { loadProactiveConfig, saveProactiveConfig } from "@/lib/storage";
import type { ProactiveConfig } from "@/lib/types";

export function AISettings() {
  const [config, setConfig] = useState<ProactiveConfig>({
    daily_limit: 2,
    quiet_start: "22:00",
    quiet_end: "08:00",
    master_switch: true,
  });

  useEffect(() => {
    setConfig(loadProactiveConfig());
  }, []);

  const update = (partial: Partial<ProactiveConfig>) => {
    const next = { ...config, ...partial };
    setConfig(next);
    saveProactiveConfig(next);
  };

  return (
    <section className="card-elevated rounded-[22px] p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          ⚙️
        </span>
        <h2 className="text-[16px] font-semibold tracking-tight">AI 助手设置</h2>
      </div>

      <div className="space-y-4">
        {/* 每日消息上限 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-medium text-[var(--color-text)]">每日消息上限</p>
            <span className="text-sm font-semibold text-emerald-600">{config.daily_limit} 条</span>
          </div>
          <p className="text-[11px] text-[var(--color-muted)] mb-2">控制 AI 每天最多发送几条主动关怀消息</p>
          <input
            type="range"
            min={0}
            max={5}
            value={config.daily_limit}
            onChange={(e) => update({ daily_limit: Number(e.target.value) })}
            className="w-full h-2 rounded-full appearance-none bg-gray-200 accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between mt-1">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <span key={n} className="text-[10px] text-[var(--color-muted)]">{n}</span>
            ))}
          </div>
        </div>

        {/* 免打扰时段 */}
        <div>
          <p className="text-[13px] font-medium text-[var(--color-text)] mb-1">免打扰时段</p>
          <p className="text-[11px] text-[var(--color-muted)] mb-2.5">此时段内不推送任何消息</p>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={config.quiet_start}
              onChange={(e) => update({ quiet_start: e.target.value })}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none"
            />
            <span className="text-xs text-[var(--color-muted)] shrink-0">至</span>
            <input
              type="time"
              value={config.quiet_end}
              onChange={(e) => update({ quiet_end: e.target.value })}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none"
            />
          </div>
        </div>

        {/* 总开关 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-[var(--color-text)]">主动触达总开关</p>
            <p className="text-[11px] text-[var(--color-muted)]">关闭后不推送任何主动消息</p>
          </div>
          <button
            onClick={() => update({ master_switch: !config.master_switch })}
            className={`relative h-7 w-12 rounded-full transition-colors ${
              config.master_switch ? "bg-emerald-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                config.master_switch ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </div>
    </section>
  );
}

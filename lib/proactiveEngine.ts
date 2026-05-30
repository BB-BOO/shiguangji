// ========== 主动触达引擎 ==========
// PRD 流程四：系统规则判断触发条件 → LLM 生成文案 → 频控三道闸门

import type { MealRecord, MealType, ProactiveConfig, ProactiveLog } from "./types";

// ---- 事件类型 ----

export type ProactiveEventType = "漏餐关怀" | "营养素提醒" | "建议跟进" | "里程碑鼓励" | "偏好收集" | "日常问候" | "首次招呼";

export interface ProactiveTrigger {
  type: ProactiveEventType;
  context: string; // 注入 LLM 的上下文，如"晚餐未记录"、"蛋白质连续3天不足"
}

// ---- 频控检查 ----

export function checkFrequencyGate(
  config: ProactiveConfig,
  todayLogs: ProactiveLog[],
): boolean {
  if (!config.master_switch) return false;

  // 每日上限
  const todayCount = todayLogs.filter((l) => {
    const d = new Date(l.pushed_at);
    const today = new Date();
    return d.toDateString() === today.toDateString() && !l.dismissed;
  }).length;
  if (todayCount >= config.daily_limit) return false;

  // 免打扰时段
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const [qh, qm] = config.quiet_start.split(":").map(Number);
  const [eh, em] = config.quiet_end.split(":").map(Number);
  const quietStart = qh * 60 + qm;
  const quietEnd = eh * 60 + em;

  if (quietStart <= quietEnd) {
    // 同一天内（如 22:00-08:00 跨天，这个分支不适用）
    if (currentMin >= quietStart && currentMin < quietEnd) return false;
  } else {
    // 跨天（如 22:00-08:00）
    if (currentMin >= quietStart || currentMin < quietEnd) return false;
  }

  return true;
}

// ---- 触发检测 ----

export function detectTriggers(
  todayMeals: MealRecord[],
  recentMeals: MealRecord[],   // 近7天
  memoryDimensionCount: number, // 已有记忆的维度数
  lastProactiveLogs: ProactiveLog[], // 近期推送记录
): ProactiveTrigger[] {
  const triggers: ProactiveTrigger[] = [];

  // 0. 首次招呼（每天第一次打开时触发）
  const todayFirstGreetPushed = lastProactiveLogs.some(
    (l) => l.event_type === "首次招呼" && l.pushed_at.split("T")[0] === now.toISOString().split("T")[0],
  );
  if (!todayFirstGreetPushed) {
    triggers.push({ type: "首次招呼", context: "用户今天第一次打开应用，食小光主动打招呼" });
  }

  // 1. 漏餐关怀
  const mealHours: Array<{ type: MealType; hour: number; label: string }> = [
    { type: "早餐", hour: 9, label: "早餐" },
    { type: "午餐", hour: 13, label: "午餐" },
    { type: "晚餐", hour: 19, label: "晚餐" },
  ];
  const now = new Date();
  const currentHour = now.getHours();
  const recordedTypes = new Set(todayMeals.map((m) => m.meal_type));

  for (const { type, hour, label } of mealHours) {
    // 已过餐点1小时以上仍未记录
    if (currentHour >= hour + 1 && !recordedTypes.has(type)) {
      // 该餐今天还没推送过
      const alreadyPushed = lastProactiveLogs.some(
        (l) => l.event_type === "漏餐关怀" && l.pushed_at.split("T")[0] === now.toISOString().split("T")[0],
      );
      if (!alreadyPushed) {
        triggers.push({ type: "漏餐关怀", context: `${label}时段已过，用户尚未记录${label}` });
      }
      break; // 一次只关心一餐
    }
  }

  // 2. 营养素提醒（某营养素连续 2 天以上持续超标或不足）
  if (recentMeals.length >= 2) {
    const byDate = new Map<string, MealRecord[]>();
    for (const m of recentMeals) {
      const list = byDate.get(m.date) || [];
      list.push(m);
      byDate.set(m.date, list);
    }
    const dates = Array.from(byDate.keys()).sort().slice(-3); // 最近3天

    if (dates.length >= 2) {
      const dayTotals = dates.map((date) => {
        const meals = byDate.get(date)!;
        return meals.reduce(
          (acc, m) => ({
            protein_g: acc.protein_g + m.nutrition_estimate.protein_g,
            calories_kcal: acc.calories_kcal + m.nutrition_estimate.calories_kcal,
          }),
          { protein_g: 0, calories_kcal: 0 },
        );
      });

      // 简单判定：连续2天蛋白质<40g视为不足
      const lowProteinDays = dayTotals.filter((d) => d.protein_g < 40).length;
      if (lowProteinDays >= 2) {
        const alreadyPushed = lastProactiveLogs.some(
          (l) => l.event_type === "营养素提醒" && l.message.includes("蛋白质"),
        );
        if (!alreadyPushed) {
          triggers.push({ type: "营养素提醒", context: `蛋白质连续${lowProteinDays}天偏低，日均不足40g` });
        }
      }
    }
  }

  // 3. 建议跟进（上条 AI 建议已超 24h，用户未响应）
  const lastSuggestion = lastProactiveLogs
    .filter((l) => l.event_type === "建议跟进" || l.event_type === "营养素提醒")
    .sort((a, b) => b.pushed_at.localeCompare(a.pushed_at))[0];
  if (lastSuggestion) {
    const hoursSince = (now.getTime() - new Date(lastSuggestion.pushed_at).getTime()) / 3600000;
    if (hoursSince > 24 && !lastSuggestion.dismissed) {
      triggers.push({ type: "建议跟进", context: `上次建议（${lastSuggestion.message}）已超24小时，用户未响应` });
    }
  }

  // 4. 里程碑鼓励（某营养素连续 7 天达标）
  // 需要至少7天数据，这里简化：近7天都有记录且每天都有蛋白质摄入
  const uniqueDates = new Set(recentMeals.map((m) => m.date));
  if (uniqueDates.size >= 7) {
    const alreadyPushed = lastProactiveLogs.some((l) => l.event_type === "里程碑鼓励");
    if (!alreadyPushed) {
      triggers.push({ type: "里程碑鼓励", context: "用户已连续7天记录饮食，达成了持续记录里程碑" });
    }
  }

  // 5. 偏好收集（新用户使用 1-2 天后，memory 空白维度 > 3）
  if (memoryDimensionCount < 3 && recentMeals.length >= 3) {
    const alreadyPushed = lastProactiveLogs.some((l) => l.event_type === "偏好收集");
    if (!alreadyPushed) {
      triggers.push({ type: "偏好收集", context: `用户记忆维度仅${memoryDimensionCount}项，偏好、习惯等维度待发现` });
    }
  }

  // 6. 日常问候（时段性自然关怀）
  const todayGreetingPushed = lastProactiveLogs.some(
    (l) => l.event_type === "日常问候" && l.pushed_at.split("T")[0] === now.toISOString().split("T")[0],
  );
  if (!todayGreetingPushed && recentMeals.length >= 1) {
    if (currentHour >= 8 && currentHour < 10) {
      triggers.push({ type: "日常问候", context: "早晨时段，用户刚开启新的一天" });
    } else if (currentHour >= 14 && currentHour < 16) {
      triggers.push({ type: "日常问候", context: "午后时段，用户可能有些疲惫" });
    } else if (currentHour >= 20 && currentHour < 22) {
      triggers.push({ type: "日常问候", context: "晚间时段，用户即将结束一天" });
    }
  }

  return triggers;
}

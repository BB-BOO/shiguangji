// ========== Agent 工具定义（AI 助手专用） ==========
// PRD 4.4.3 定义的 8 个 Agent 工具
// localStorage 限制：工具不直接读 localStorage，而是从请求上下文（AgentContext）中取数据

import type { DailyStatus, DailyTargetRange, MealRecord, NutritionEstimate, UserProfile } from "./types";
import { computeDailyStatus } from "./nutritionStatus";

// ---- 上下文：前端把用户数据打包传入 ----

export interface AgentContext {
  profile: UserProfile | null;
  targets: DailyTargetRange | null;
  todayMeals: MealRecord[];
  recentMeals: MealRecord[]; // 近 7 天
  memoryText: string;        // 已格式化的 memory 文本
}

// ---- Tool 实现函数 ----

function accumulate(meals: MealRecord[]): NutritionEstimate {
  return meals.reduce(
    (acc, m) => ({
      protein_g: acc.protein_g + m.nutrition_estimate.protein_g,
      carbs_g: acc.carbs_g + m.nutrition_estimate.carbs_g,
      fat_g: acc.fat_g + m.nutrition_estimate.fat_g,
      vegetables_g: acc.vegetables_g + m.nutrition_estimate.vegetables_g,
      calories_kcal: acc.calories_kcal + m.nutrition_estimate.calories_kcal,
    }),
    { protein_g: 0, carbs_g: 0, fat_g: 0, vegetables_g: 0, calories_kcal: 0 },
  );
}

const MEAL_LABELS: Record<string, string> = { "早餐": "早餐", "午餐": "午餐", "晚餐": "晚餐", "加餐": "加餐" };

export type ToolHandler = (args: Record<string, unknown>, ctx: AgentContext) => Promise<string> | string;

export const AGENT_TOOLS: { name: string; description: string; parameters: Record<string, unknown>; handler: ToolHandler }[] = [
  // ---- 1. get_user_profile ----
  {
    name: "get_user_profile",
    description: "获取用户身体资料（身高/体重/年龄）和目标模式（减脂/增肌/维持）及当前每日营养目标范围",
    parameters: { type: "object", properties: {}, required: [] },
    handler: (_args, ctx) => {
      if (!ctx.profile || !ctx.targets) return "用户尚未完善个人资料，建议先去设置页填写";
      const t = ctx.targets;
      return [
        `目标模式：${ctx.profile.goal_mode}`,
        `身高：${ctx.profile.height_cm}cm  体重：${ctx.profile.weight_kg}kg  年龄：${ctx.profile.age}岁`,
        `每日目标范围：热量 ${t.calories_kcal.min}-${t.calories_kcal.max}kcal，蛋白质 ${t.protein_g.min}-${t.protein_g.max}g，碳水 ${t.carbs_g.min}-${t.carbs_g.max}g，蔬菜 ${t.vegetables_g.min}-${t.vegetables_g.max}g，油脂 ${t.fat_g.min}-${t.fat_g.max}g`,
      ].join("\n");
    },
  },

  // ---- 2. get_today_meals ----
  {
    name: "get_today_meals",
    description: "查询今日已记录的餐食，返回每餐的食物描述和营养素估算",
    parameters: { type: "object", properties: {}, required: [] },
    handler: (_args, ctx) => {
      if (ctx.todayMeals.length === 0) return "今天还没有记录任何餐食";
      const nutrition = accumulate(ctx.todayMeals);
      const lines = ctx.todayMeals.map((m) =>
        `${MEAL_LABELS[m.meal_type] || m.meal_type}：${m.meal_record_text}（热量${m.nutrition_estimate.calories_kcal}kcal，蛋白质${m.nutrition_estimate.protein_g}g，碳水${m.nutrition_estimate.carbs_g}g，蔬菜${m.nutrition_estimate.vegetables_g}g，油脂${m.nutrition_estimate.fat_g}g）`,
      );
      lines.push(`\n今日累计：热量${nutrition.calories_kcal}kcal，蛋白质${nutrition.protein_g}g，碳水${nutrition.carbs_g}g，蔬菜${nutrition.vegetables_g}g，油脂${nutrition.fat_g}g`);
      return lines.join("\n");
    },
  },

  // ---- 3. get_recent_meals ----
  {
    name: "get_recent_meals",
    description: "查询近 N 天的饮食记录，返回每天每餐的食物描述和营养素估算。参数 days 默认 7",
    parameters: {
      type: "object",
      properties: { days: { type: "number", description: "查询天数，默认7" } },
      required: [],
    },
    handler: (args, ctx) => {
      const days = (args.days as number) || 7;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().split("T")[0];
      const meals = ctx.recentMeals.filter((m) => m.date >= cutoffStr);
      if (meals.length === 0) return `近${days}天没有饮食记录`;

      const byDate = new Map<string, MealRecord[]>();
      for (const m of meals) {
        const list = byDate.get(m.date) || [];
        list.push(m);
        byDate.set(m.date, list);
      }
      const dates = Array.from(byDate.keys()).sort();
      return dates.map((date) => {
        const dayMeals = byDate.get(date)!;
        const nut = accumulate(dayMeals);
        const mealTexts = dayMeals.map((m) =>
          `${MEAL_LABELS[m.meal_type] || m.meal_type}：${m.meal_record_text}（${m.nutrition_estimate.calories_kcal}kcal）`,
        ).join("；");
        return `${date}：${mealTexts} | 当日合计 ${nut.calories_kcal}kcal，蛋白质${nut.protein_g}g`;
      }).join("\n");
    },
  },

  // ---- 4. search_diet_knowledge ----
  {
    name: "search_diet_knowledge",
    description: "检索膳食指南知识库（暂未建设，当前返回空）",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "检索关键词或问题" } },
      required: ["query"],
    },
    handler: () => "膳食指南知识库暂未上线，建议基于通用营养常识回答",
  },

  // ---- 5. search_food_nutrition ----
  {
    name: "search_food_nutrition",
    description: "查询食物营养参考数据（暂未建设，当前返回空）",
    parameters: {
      type: "object",
      properties: { food_name: { type: "string", description: "食物名称" } },
      required: ["food_name"],
    },
    handler: () => "食物营养数据库暂未上线，建议基于常识估算",
  },

  // ---- 6. check_meal_missed ----
  {
    name: "check_meal_missed",
    description: "检测今日是否有漏餐（早/午/晚餐）",
    parameters: { type: "object", properties: {}, required: [] },
    handler: (_args, ctx) => {
      const recorded = new Set(ctx.todayMeals.map((m) => m.meal_type));
      const allMeals = ["早餐", "午餐", "晚餐"] as const;
      const missed = allMeals.filter((t) => !recorded.has(t));
      if (missed.length === 0) return "今日三餐均已记录，没有漏餐";
      return `今日已记录：${allMeals.filter((t) => recorded.has(t)).join("、") || "暂无"}。\n尚未记录：${missed.join("、")}`;
    },
  },

  // ---- 7. check_goal_status ----
  {
    name: "check_goal_status",
    description: "检测今日营养素达标状态（实际摄入 vs 目标范围）",
    parameters: { type: "object", properties: {}, required: [] },
    handler: (_args, ctx) => {
      if (!ctx.targets) return "尚未设置每日目标，无法对比";
      if (ctx.todayMeals.length === 0) return "今日无记录，无法计算达标状态";
      const nutrition = accumulate(ctx.todayMeals);
      const status = computeDailyStatus(nutrition, ctx.targets);
      return [
        `今日摄入：热量${nutrition.calories_kcal}kcal，蛋白质${nutrition.protein_g}g，碳水${nutrition.carbs_g}g，蔬菜${nutrition.vegetables_g}g，油脂${nutrition.fat_g}g`,
        `达标状态：`,
        `  热量：${status.calories}（目标 ${ctx.targets.calories_kcal.min}-${ctx.targets.calories_kcal.max}kcal）`,
        `  蛋白质：${status.protein}（目标 ${ctx.targets.protein_g.min}-${ctx.targets.protein_g.max}g）`,
        `  碳水：${status.carbs}（目标 ${ctx.targets.carbs_g.min}-${ctx.targets.carbs_g.max}g）`,
        `  蔬菜：${status.vegetables}（目标 ${ctx.targets.vegetables_g.min}-${ctx.targets.vegetables_g.max}g）`,
        `  油脂：${status.fat}（目标 ${ctx.targets.fat_g.min}-${ctx.targets.fat_g.max}g）`,
      ].join("\n");
    },
  },

  // ---- 8. extract_memory ----
  {
    name: "extract_memory",
    description: "从当前对话中提取用户透露的关键个人信息（忌口、偏好、生活习惯、职业等），写入长期记忆",
    parameters: {
      type: "object",
      properties: {
        extracted: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field: { type: "string", description: "记忆维度：忌口、偏好、生活习惯、职业、作息、常吃食物" },
              value: { type: "string", description: "提取的具体内容，如'不吃香菜'、'经常加班到很晚'" },
            },
            required: ["field", "value"],
          },
          description: "本轮对话中新发现的用户信息。没有新信息时为空数组",
        },
      },
      required: ["extracted"],
    },
    handler: () => {
      // extract_memory 特殊处理：不在多轮循环中执行，而是循环结束后单独调用
      return "memory extraction handled separately";
    },
  },
];

// ---- 将 8 个 Tool 转换为一组 DeepSeek 可用的 tool definitions ----

export function getAgentToolDefs(): Array<{ type: "function"; function: Record<string, unknown> }> {
  return AGENT_TOOLS.filter((t) => t.name !== "extract_memory").map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

export function getExtractMemoryToolDef(): { type: "function"; function: Record<string, unknown> } {
  const t = AGENT_TOOLS.find((t) => t.name === "extract_memory")!;
  return { type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } };
}

export function findToolHandler(name: string): ToolHandler | undefined {
  return AGENT_TOOLS.find((t) => t.name === name)?.handler;
}

import { callDeepSeekWithTool } from "@/lib/aiClient";
import { DAILY_SUMMARY_PROMPT } from "@/lib/prompts";
import { computeDailyStatus } from "@/lib/nutritionStatus";

const DAILY_SUMMARY_TOOL = {
  name: "daily_summary",
  description: "基于系统已判定的达标状态，生成每日总结的自然语言反馈",
  parameters: {
    type: "object",
    properties: {
      feedback: { type: "string", description: "每日综合反馈≤30字" },
      analysis_text: { type: "string", description: "完整分析描述" },
    },
    required: ["feedback", "analysis_text"],
  },
};

export async function POST(req: Request) {
  try {
    const inputs = (await req.json()) as {
      goal_mode: string;
      weight_kg: number;
      height_cm: number;
      age: number;
      protein_target_min: number;
      protein_target_max: number;
      carbs_target_min: number;
      carbs_target_max: number;
      vegetables_target_min: number;
      vegetables_target_max: number;
      fat_target_min: number;
      fat_target_max: number;
      calories_target_min: number;
      calories_target_max: number;
      protein_g: number;
      carbs_g: number;
      vegetables_g: number;
      fat_g: number;
      calories_kcal: number;
      meal_records: string;
      memory?: string;
    };

    // 系统计算 daily_status（不做 LLM 调用）
    const daily_status = computeDailyStatus(
      {
        protein_g: inputs.protein_g,
        carbs_g: inputs.carbs_g,
        vegetables_g: inputs.vegetables_g,
        fat_g: inputs.fat_g,
        calories_kcal: inputs.calories_kcal,
      },
      {
        protein_g: { min: inputs.protein_target_min, max: inputs.protein_target_max },
        carbs_g: { min: inputs.carbs_target_min, max: inputs.carbs_target_max },
        vegetables_g: { min: inputs.vegetables_target_min, max: inputs.vegetables_target_max },
        fat_g: { min: inputs.fat_target_min, max: inputs.fat_target_max },
        calories_kcal: { min: inputs.calories_target_min, max: inputs.calories_target_max },
      },
    );

    const lines = [
      `用户目标：${inputs.goal_mode}`,
      `体重：${inputs.weight_kg}kg  身高：${inputs.height_cm}cm  年龄：${inputs.age}岁`,
      "",
      "每日目标范围：",
      `  蛋白质：${inputs.protein_target_min} ~ ${inputs.protein_target_max}g`,
      `  碳水：${inputs.carbs_target_min} ~ ${inputs.carbs_target_max}g`,
      `  蔬菜：${inputs.vegetables_target_min} ~ ${inputs.vegetables_target_max}g`,
      `  油脂：${inputs.fat_target_min} ~ ${inputs.fat_target_max}g`,
      `  热量：${inputs.calories_target_min} ~ ${inputs.calories_target_max}kcal`,
      "",
      "今日实际摄入：",
      `  蛋白质：${inputs.protein_g}g`,
      `  碳水：${inputs.carbs_g}g`,
      `  蔬菜：${inputs.vegetables_g}g`,
      `  油脂：${inputs.fat_g}g`,
      `  热量：${inputs.calories_kcal}kcal`,
      "",
      "系统判定 daily_status：",
      `  蛋白质：${daily_status.protein}`,
      `  蔬菜：${daily_status.vegetables}`,
      `  碳水：${daily_status.carbs}`,
      `  油脂：${daily_status.fat}`,
      `  热量：${daily_status.calories}`,
      "",
      "今日饮食记录：",
      inputs.meal_records || "（暂无记录）",
    ];

    if (inputs.memory) {
      lines.push("", "用户记忆：", inputs.memory);
    }

    const userMessage = lines.join("\n");

    const llmResult = await callDeepSeekWithTool({
      systemPrompt: DAILY_SUMMARY_PROMPT,
      userMessage,
      tool: DAILY_SUMMARY_TOOL,
      onUsage: (u) => { import("@/lib/db").then((m) => m.logApiCall("daily-summary", u.prompt_tokens, u.completion_tokens, u.cache_hit_tokens, u.cache_miss_tokens)).catch(() => {}); },
    });

    // 合并系统计算的 status + LLM 生成的自然语言
    return Response.json({
      daily_status,
      feedback: (llmResult as { feedback: string; analysis_text: string }).feedback,
      analysis_text: (llmResult as { feedback: string; analysis_text: string }).analysis_text,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    import("@/lib/db").then(({ logError }) =>
      logError("daily-summary", e instanceof Error ? e.constructor.name : "UnknownError", msg, e instanceof Error ? e.stack : undefined)
    ).catch(() => {});
    console.error("[daily-summary] ERROR:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

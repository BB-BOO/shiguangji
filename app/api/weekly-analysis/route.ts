import { callDeepSeekWithTool } from "@/lib/aiClient";
import { WEEKLY_ANALYSIS_PROMPT } from "@/lib/prompts";
import { computeWeeklyStatus, computeGoalMatch } from "@/lib/nutritionStatus";

const WEEKLY_ANALYSIS_TOOL = {
  name: "weekly_analysis",
  description: "基于系统已判定的状态和吻合度，生成周度趋势文案和下周目标建议",
  parameters: {
    type: "object",
    properties: {
      feedback: { type: "string", description: "周度综合反馈≤40字" },
      analysis_text: { type: "string", description: "完整趋势分析描述" },
      next_week_target: {
        type: "object",
        properties: {
          calories_min: { type: "number" },
          calories_max: { type: "number" },
          protein_min: { type: "number" },
          protein_max: { type: "number" },
          carbs_min: { type: "number" },
          carbs_max: { type: "number" },
          vegetables_min: { type: "number" },
          vegetables_max: { type: "number" },
          fat_min: { type: "number" },
          fat_max: { type: "number" },
        },
        required: ["calories_min", "calories_max", "protein_min", "protein_max", "carbs_min", "carbs_max", "vegetables_min", "vegetables_max", "fat_min", "fat_max"],
      },
    },
    required: ["feedback", "analysis_text", "next_week_target"],
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
      weekly_avg_protein_g: number;
      weekly_avg_carbs_g: number;
      weekly_avg_vegetables_g: number;
      weekly_avg_fat_g: number;
      weekly_avg_calories_kcal: number;
      weekly_meal_records: string;
      memory?: string;
    };

    // 系统计算 weekly_status + goal_match（不做 LLM 调用）
    const weekly_status = computeWeeklyStatus(
      {
        protein_g: inputs.weekly_avg_protein_g,
        carbs_g: inputs.weekly_avg_carbs_g,
        vegetables_g: inputs.weekly_avg_vegetables_g,
        fat_g: inputs.weekly_avg_fat_g,
        calories_kcal: inputs.weekly_avg_calories_kcal,
      },
      {
        protein_g: { min: inputs.protein_target_min, max: inputs.protein_target_max },
        carbs_g: { min: inputs.carbs_target_min, max: inputs.carbs_target_max },
        vegetables_g: { min: inputs.vegetables_target_min, max: inputs.vegetables_target_max },
        fat_g: { min: inputs.fat_target_min, max: inputs.fat_target_max },
        calories_kcal: { min: inputs.calories_target_min, max: inputs.calories_target_max },
      },
    );
    const goal_match = computeGoalMatch(weekly_status);

    const lines = [
      `用户目标：${inputs.goal_mode}`,
      `体重：${inputs.weight_kg}kg  身高：${inputs.height_cm}cm  年龄：${inputs.age}岁`,
      "",
      "本周每日目标范围：",
      `  蛋白质：${inputs.protein_target_min} ~ ${inputs.protein_target_max}g`,
      `  碳水：${inputs.carbs_target_min} ~ ${inputs.carbs_target_max}g`,
      `  蔬菜：${inputs.vegetables_target_min} ~ ${inputs.vegetables_target_max}g`,
      `  油脂：${inputs.fat_target_min} ~ ${inputs.fat_target_max}g`,
      `  热量：${inputs.calories_target_min} ~ ${inputs.calories_target_max}kcal`,
      "",
      "本周日均摄入：",
      `  蛋白质：${inputs.weekly_avg_protein_g}g`,
      `  碳水：${inputs.weekly_avg_carbs_g}g`,
      `  蔬菜：${inputs.weekly_avg_vegetables_g}g`,
      `  油脂：${inputs.weekly_avg_fat_g}g`,
      `  热量：${inputs.weekly_avg_calories_kcal}kcal`,
      "",
      "系统判定 weekly_status：",
      `  蛋白质：${weekly_status.protein}`,
      `  蔬菜：${weekly_status.vegetables}`,
      `  碳水：${weekly_status.carbs}`,
      `  油脂：${weekly_status.fat}`,
      `  热量：${weekly_status.calories}`,
      "",
      `系统判定 goal_match：${goal_match}`,
      "",
      "本周饮食记录：",
      inputs.weekly_meal_records || "（暂无记录）",
    ];

    if (inputs.memory) {
      lines.push("", "用户记忆：", inputs.memory);
    }

    const userMessage = lines.join("\n");

    const llmResult = await callDeepSeekWithTool({
      systemPrompt: WEEKLY_ANALYSIS_PROMPT,
      userMessage,
      tool: WEEKLY_ANALYSIS_TOOL,
    });

    // 合并系统计算的 status + goal_match + LLM 生成的自然语言和目标建议
    const result = llmResult as { feedback: string; analysis_text: string; next_week_target: Record<string, number> };
    return Response.json({
      weekly_status,
      goal_match,
      feedback: result.feedback,
      analysis_text: result.analysis_text,
      next_week_target: result.next_week_target,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[weekly-analysis] ERROR:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

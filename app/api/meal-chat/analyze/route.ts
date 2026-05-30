import { callDeepSeekWithTool } from "@/lib/aiClient";
import { MEAL_ANALYSIS_PROMPT } from "@/lib/prompts";

const MEAL_ANALYSIS_TOOL = {
  name: "meal_analysis",
  description: "对用户这一餐的饮食进行营养分析",
  parameters: {
    type: "object",
    properties: {
      meal_record: { type: "string", description: "一句话总结该餐吃了什么" },
      meal_status: {
        type: "object",
        properties: {
          calories: { type: "string", enum: ["是", "否"], description: "是否高热预警" },
          protein: { type: "string", enum: ["较多", "正常", "较少"], description: "蛋白质相对于该餐正常水平" },
          carbs: { type: "string", enum: ["较多", "正常", "较少"], description: "碳水相对于该餐正常水平" },
          vegetables: { type: "string", enum: ["较多", "正常", "较少"], description: "蔬菜摄入量定性判断" },
          fat: { type: "string", enum: ["是", "否"], description: "是否高油预警" },
        },
        required: ["calories", "protein", "carbs", "vegetables", "fat"],
      },
      nutrition_estimate: {
        type: "object",
        properties: {
          protein_g: { type: "number", description: "估算蛋白质（克）" },
          carbs_g: { type: "number", description: "估算碳水化合物（克）" },
          fat_g: { type: "number", description: "估算油脂（克）" },
          vegetables_g: { type: "number", description: "估算蔬菜（克）" },
          calories_kcal: { type: "number", description: "估算热量（千卡）" },
        },
        required: ["protein_g", "carbs_g", "fat_g", "vegetables_g", "calories_kcal"],
      },
      feedback: { type: "string", description: "简短反馈≤20字，只给一个最值得关注的点" },
      analysis_text: { type: "string", description: "完整分析100-300字" },
    },
    required: ["meal_record", "meal_status", "nutrition_estimate", "feedback", "analysis_text"],
  },
};

export async function POST(req: Request) {
  try {
    const { allFoodText, goalMode, mealType, weightKg, heightCm, age, memory } = (await req.json()) as {
      allFoodText: string;
      goalMode: string;
      mealType: string;
      weightKg?: number;
      heightCm?: number;
      age?: number;
      memory?: string;
    };

    const memoryBlock = memory ? `\n【用户记忆】\n${memory}\n` : "";

    const userMessage = `【用户信息】
当前餐次：${mealType}
用户目标：${goalMode}
用户体重：${weightKg ?? "未知"}kg
用户身高：${heightCm ?? "未知"}cm
用户年龄：${age ?? "未知"}岁${memoryBlock}

【饮食描述】
${allFoodText}`;

    console.log("[meal-chat/analyze] Running analysis (tool calling)...");
    const analysis = await callDeepSeekWithTool({
      systemPrompt: MEAL_ANALYSIS_PROMPT,
      userMessage,
      tool: MEAL_ANALYSIS_TOOL,
    });
    console.log("[meal-chat/analyze] Done");

    return Response.json(analysis);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[meal-chat/analyze] ERROR:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

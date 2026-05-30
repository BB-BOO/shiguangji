import { callDeepSeekWithTool } from "@/lib/aiClient";
import { PROACTIVE_PROMPT } from "@/lib/prompts";
import { detectTriggers, checkFrequencyGate } from "@/lib/proactiveEngine";

const PROACTIVE_TOOL = {
  name: "proactive_message",
  description: "生成主动触达推送文案",
  parameters: {
    type: "object",
    properties: {
      message: { type: "string", description: "≤30字推送文案，语气轻松如朋友，每次只提一件事" },
    },
    required: ["message"],
  },
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      todayMeals = [],
      recentMeals = [],
      memoryDimensionCount = 0,
      proactiveConfig,
      lastProactiveLogs = [],
      memoryText = "",
    } = body as {
      todayMeals?: unknown[];
      recentMeals?: unknown[];
      memoryDimensionCount?: number;
      proactiveConfig?: { daily_limit: number; quiet_start: string; quiet_end: string; master_switch: boolean };
      lastProactiveLogs?: unknown[];
      memoryText?: string;
    };

    // 频控
    if (!proactiveConfig || !checkFrequencyGate(proactiveConfig, lastProactiveLogs as never[])) {
      // 也检查默认值以防前端没传
      const defaultConfig = { daily_limit: 2, quiet_start: "22:00", quiet_end: "08:00", master_switch: true };
      if (!checkFrequencyGate(proactiveConfig || defaultConfig, lastProactiveLogs as never[])) {
        return Response.json({ triggered: false });
      }
    }

    // 检测触发事件
    const triggers = detectTriggers(
      todayMeals as never[],
      recentMeals as never[],
      memoryDimensionCount,
      lastProactiveLogs as never[],
    );

    if (triggers.length === 0) {
      return Response.json({ triggered: false });
    }

    // 取最高优先级的一条
    const priority: Record<string, number> = {
      "漏餐关怀": 1,
      "首次招呼": 2,
      "营养素提醒": 3,
      "建议跟进": 4,
      "里程碑鼓励": 5,
      "偏好收集": 6,
      "日常问候": 7,
    };
    triggers.sort((a, b) => (priority[a.type] || 9) - (priority[b.type] || 9));
    const selected = triggers[0];

    // LLM 生成文案
    const userPrompt = [
      `事件类型：${selected.type}`,
      `事件上下文：${selected.context}`,
    ];
    if (memoryText) {
      userPrompt.push(`用户记忆：${memoryText}`);
    }

    const result = await callDeepSeekWithTool<{ message: string }>({
      systemPrompt: PROACTIVE_PROMPT,
      userMessage: userPrompt.join("\n"),
      tool: PROACTIVE_TOOL,
      temperature: 0.8,
    });

    return Response.json({
      triggered: true,
      event_type: selected.type,
      message: result.message,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[proactive] ERROR:", msg);
    // 静默失败，不影响用户体验
    return Response.json({ triggered: false });
  }
}

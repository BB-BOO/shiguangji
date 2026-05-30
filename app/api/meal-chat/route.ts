import { callDeepSeekWithTool } from "@/lib/aiClient";
import { INFO_CHECK_PROMPT } from "@/lib/prompts";

interface InfoCheckResult {
  is_enough: boolean;
  assistant_message: string;
}

const INFO_CHECK_TOOL = {
  name: "info_check",
  description: "判断用户提供的饮食信息是否足够进行单餐营养分析",
  parameters: {
    type: "object",
    properties: {
      is_enough: { type: "boolean", description: "信息是否足够进行营养分析" },
      assistant_message: { type: "string", description: "返回给用户的话。信息不足时追问缺失项（≤20字），信息足够时给一句确认（如'信息足够了，我来分析一下~'）" },
    },
    required: ["is_enough", "assistant_message"],
  },
};

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { query, messages } = body as {
      query: string;
      messages: ChatMessage[];
    };

    const apiMessages = messages
      .filter((m) => !("thinking" in m) || !(m as Record<string, unknown>).thinking)
      .filter((m) => m.content.trim().length > 0)
      .map((m) => ({
        role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      }));

    console.log("[meal-chat] Info check (tool calling)...");
    const infoCheck = await callDeepSeekWithTool<InfoCheckResult>({
      systemPrompt: INFO_CHECK_PROMPT,
      userMessage: query,
      messages: apiMessages,
      tool: INFO_CHECK_TOOL,
    });
    console.log("[meal-chat] Info check:", JSON.stringify(infoCheck));

    return Response.json({
      is_enough: infoCheck.is_enough,
      assistant_message: infoCheck.assistant_message || (infoCheck.is_enough ? "好的，我来分析一下~" : "能再说详细一点吗？"),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[meal-chat] ERROR:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

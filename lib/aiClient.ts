const DEEPSEEK_BASE = "https://api.deepseek.com/v1";
const MODEL = "deepseek-chat";

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY 环境变量未设置");
  return key;
}

interface CallDeepSeekParams {
  systemPrompt: string;
  userMessage: string;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
  temperature?: number;
  onUsage?: (usage: { prompt_tokens: number; completion_tokens: number; cache_hit_tokens: number; cache_miss_tokens: number }) => void;
}

interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/**
 * 使用 tool calling 强制模型按 schema 输出 JSON。
 * 这是比 response_format 更可靠的方法——模型必须调用指定函数，
 * 参数自动符合 schema，不会出现空白或字段名漂移。
 */
export async function callDeepSeekWithTool<T>(
  params: CallDeepSeekParams & { tool: ToolDef },
): Promise<T> {
  const { systemPrompt, userMessage, messages = [], temperature = 0.3, tool } = params;

  const apiMessages = [
    { role: "system", content: systemPrompt },
    ...messages.filter((m) => m.content.trim().length > 0),
    { role: "user", content: userMessage },
  ];

  const body: Record<string, unknown> = {
    model: MODEL,
    messages: apiMessages,
    temperature,
    max_tokens: 4096,
    tools: [{ type: "function", function: tool }],
    tool_choice: { type: "function", function: { name: tool.name } },
  };

  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data) {
    const errText = JSON.stringify(data).slice(0, 500);
    throw new Error(`DeepSeek API error ${res.status}: ${errText}`);
  }

  // tool calling 模式下，参数在 tool_calls 里
  const toolCalls = data.choices?.[0]?.message?.tool_calls;
  if (!toolCalls || toolCalls.length === 0) {
    // 降级：尝试从 content 解析（模型可能忽略 tool_choice）
    const content = data.choices?.[0]?.message?.content;
    if (content && content.trim()) {
      try {
        return JSON.parse(content) as T;
      } catch {
        throw new Error(`模型未调用 tool，原始输出: ${String(content).slice(0, 300)}`);
      }
    }
    throw new Error(`DeepSeek 未调用 tool 且无内容`);
  }

  const args = toolCalls[0].function.arguments;

  // 记录 token 用量
  if (params.onUsage && data.usage) {
    params.onUsage({
      prompt_tokens: data.usage.prompt_tokens ?? 0,
      completion_tokens: data.usage.completion_tokens ?? 0,
      cache_hit_tokens: data.usage.prompt_cache_hit_tokens ?? 0,
      cache_miss_tokens: data.usage.prompt_cache_miss_tokens ?? (data.usage.prompt_tokens ?? 0),
    });
  }

  try {
    return JSON.parse(args) as T;
  } catch {
    throw new Error(`Tool 参数 JSON 解析失败: ${String(args).slice(0, 300)}`);
  }
}

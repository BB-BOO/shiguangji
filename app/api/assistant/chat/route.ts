import { ASSISTANT_PROMPT } from "@/lib/prompts";
import { getAgentToolDefs, getExtractMemoryToolDef, findToolHandler, type AgentContext } from "@/lib/agentTools";

const MODEL = "deepseek-chat";
const MAX_AGENT_ROUNDS = 5;

const PROGRESS_MAP: Record<string, string> = {
  get_user_profile: "正在读取你的个人资料...",
  get_today_meals: "正在查看你今天的饮食记录...",
  get_recent_meals: "正在回顾近期的饮食记录...",
  search_diet_knowledge: "正在查阅营养知识...",
  search_food_nutrition: "正在查询食物营养信息...",
  check_meal_missed: "正在检查是否有漏餐...",
  check_goal_status: "正在对比你的目标达成情况...",
  extract_memory: "正在整理你的偏好信息...",
};

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY 未设置");
  return key;
}

async function extractMemory(
  userMessage: string,
  finalReply: string,
  existingMemory: string,
  conversationContext: string,
  apiKey: string,
): Promise<Array<{ field: string; value: string }>> {
  try {
    const extractTool = getExtractMemoryToolDef();
    const memMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: `你负责从对话中提取用户的新个人信息。只提取明确、有价值的信息。
字段类型：忌口（不吃什么）、偏好（喜欢什么）、生活习惯（作息/运动/工作）、常吃食物。
不要编造，只提取用户明确说出的信息。没有新信息时返回空数组。
如果用户提及的信息与已有记忆相同或高度相似，不要重复提取。` },
    ];
    if (existingMemory) memMessages.push({ role: "user", content: `【用户已有记忆，不要重复提取】\n${existingMemory}` });
    memMessages.push({ role: "user", content: `【对话上下文】\n${conversationContext}\n\n【助手最终回复】\n"${finalReply}"\n\n请从以上对话中提取用户新透露的个人信息。` });

    const memRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, messages: memMessages, temperature: 0.1, max_tokens: 512, tools: [extractTool], tool_choice: { type: "function", function: { name: "extract_memory" } } }),
    });
    const memData = await memRes.json().catch(() => null);
    if (memData?.usage) {
      import("@/lib/db").then((m) => m.logApiCall("assistant/chat-memory", memData.usage.prompt_tokens ?? 0, memData.usage.completion_tokens ?? 0, memData.usage.prompt_cache_hit_tokens ?? 0, memData.usage.prompt_cache_miss_tokens ?? (memData.usage.prompt_tokens ?? 0))).catch(() => {});
    }
    if (memRes.ok && memData) {
      const args = memData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (args) {
        const parsed = JSON.parse(args);
        if (parsed.extracted?.length > 0) return parsed.extracted;
      }
    }
  } catch (e) {
    import("@/lib/db").then(({ logError }) => logError("assistant/chat-extractMemory", "MemoryExtractionError", e instanceof Error ? e.message : String(e))).catch(() => {});
  }
  return [];
}

function logTokens(source: string, data: { usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_cache_hit_tokens?: number; prompt_cache_miss_tokens?: number } }) {
  if (data.usage) {
    import("@/lib/db").then((m) => m.logApiCall(source, data.usage!.prompt_tokens ?? 0, data.usage!.completion_tokens ?? 0, data.usage!.prompt_cache_hit_tokens ?? 0, data.usage!.prompt_cache_miss_tokens ?? (data.usage!.prompt_tokens ?? 0))).catch(() => {});
  }
}

function sendEvent(encoder: TextEncoder, controller: ReadableStreamDefaultController, event: Record<string, unknown>) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userMessage, context } = body as { userMessage: string; context: AgentContext };
    const apiKey = getApiKey();

    const messages: Array<{ role: string; content: string | null; tool_call_id?: string; tool_calls?: unknown[] }> = [
      { role: "system", content: ASSISTANT_PROMPT },
    ];
    if (context.memoryText) messages.push({ role: "user", content: `【用户长期记忆】\n${context.memoryText}` });
    messages.push({ role: "user", content: userMessage });

    const toolDefs = getAgentToolDefs();
    const toolsCalled: string[] = [];

    // ---- 立即返回流，agent loop + stream 全在流内完成 ----
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const emit = (e: Record<string, unknown>) => sendEvent(encoder, controller, e);

        let finalReply = "";
        let directAnswer = false; // 首轮直接回答，无需二次流式调用

        try {
          // ---- Agent 多轮循环（在流内执行，每轮可发进度） ----
          for (let round = 0; round < MAX_AGENT_ROUNDS; round++) {
            const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({ model: MODEL, messages, temperature: 0.7, max_tokens: 2048, tools: toolDefs, tool_choice: "auto" }),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok || !data) throw new Error(`DeepSeek API error ${res.status}`);
            logTokens("assistant/chat-agent", data);

            const choice = data.choices?.[0]?.message;
            if (!choice) throw new Error("DeepSeek 返回为空");

            // LLM 决定直接回答
            if (choice.content && !choice.tool_calls) {
              finalReply = choice.content;
              if (round === 0) {
                // 首轮直接回答，无工具调用 → 模拟流式输出，省一次 API 调用
                directAnswer = true;
                for (const ch of finalReply) {
                  emit({ type: "text", content: ch });
                  // 微小延迟让浏览器逐字渲染
                  await new Promise((r) => setTimeout(r, 3));
                }
              }
              break;
            }

            // 工具调用
            if (choice.tool_calls?.length > 0) {
              messages.push({ role: "assistant", content: null, tool_calls: choice.tool_calls });

              // 并行执行所有工具
              const results = await Promise.all(choice.tool_calls.map(async (tc: { id: string; function?: { name?: string; arguments?: string } }) => {
                const fnName = tc.function?.name;
                if (fnName) toolsCalled.push(fnName);
                const progressText = PROGRESS_MAP[fnName ?? ""] ?? `正在调用 ${fnName ?? "未知工具"}...`;
                emit({ type: "progress", text: progressText });

                const handler = findToolHandler(fnName ?? "");
                if (handler) {
                  try {
                    const args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
                    return { tool_call_id: tc.id, role: "tool", content: await Promise.resolve(handler(args, context)) };
                  } catch {
                    return { tool_call_id: tc.id, role: "tool", content: `工具 ${fnName} 执行失败` };
                  }
                }
                return { tool_call_id: tc.id, role: "tool", content: `未知工具：${fnName}` };
              }));

              messages.push(...results);
              continue;
            }

            break;
          }

          if (!finalReply) finalReply = "抱歉，我需要更多信息才能回答这个问题，请说得更具体一些。";

          // ---- Memory 提取（并行，不阻塞） ----
          const userMessages = messages.filter((m) => m.role === "user").map((m) => m.content as string);
          const memoryPromise = extractMemory(userMessage, finalReply, context.memoryText ?? "", userMessages.join("\n---\n"), apiKey);

          // ---- 二次流式输出（调用了工具时，用流式 API 输出最终回复） ----
          if (!directAnswer) {
            if (toolsCalled.length > 0) {
              const streamRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
                method: "POST",
                headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({ model: MODEL, messages, temperature: 0.7, max_tokens: 2048, stream: true }),
              });

              if (streamRes.ok && streamRes.body) {
                const reader = streamRes.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split("\n");
                  buffer = lines.pop() || "";
                  for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const raw = line.slice(6).trim();
                    if (raw === "[DONE]" || !raw) continue;
                    try {
                      const parsed = JSON.parse(raw);
                      const delta = parsed.choices?.[0]?.delta?.content;
                      if (delta) {
                        const clean = delta.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
                        if (clean.length > 0) emit({ type: "text", content: clean });
                      }
                    } catch { /* skip */ }
                  }
                }
              } else {
                // 流式失败，用非流式回答兜底
                for (const ch of finalReply) {
                  emit({ type: "text", content: ch });
                  await new Promise((r) => setTimeout(r, 3));
                }
              }
            } else {
              // 无工具也无直接回答（兜底），逐字输出
              for (const ch of finalReply) {
                emit({ type: "text", content: ch });
                await new Promise((r) => setTimeout(r, 3));
              }
            }
          }

          // ---- 发送 memory + tools 事件 ----
          try {
            const extracted = await memoryPromise;
            if (extracted.length > 0) emit({ type: "memory", extracted });
          } catch { /* 静默失败 */ }

          if (toolsCalled.length > 0) {
            emit({ type: "tools", tools: [...new Set(toolsCalled)] });
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          import("@/lib/db").then(({ logError }) => logError("assistant/chat-stream", "StreamError", msg, e instanceof Error ? e.stack : undefined)).catch(() => {});
          console.error("[assistant/chat] Stream error:", msg);
          emit({ type: "error", content: msg });
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    import("@/lib/db").then(({ logError }) => logError("assistant/chat", e instanceof Error ? e.constructor.name : "UnknownError", msg, e instanceof Error ? e.stack : undefined)).catch(() => {});
    console.error("[assistant/chat] ERROR:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

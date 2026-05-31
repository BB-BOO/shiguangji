import { ASSISTANT_PROMPT } from "@/lib/prompts";
import { getAgentToolDefs, getExtractMemoryToolDef, findToolHandler, type AgentContext } from "@/lib/agentTools";

const MODEL = "deepseek-chat";
const MAX_AGENT_ROUNDS = 5;

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
      {
        role: "system",
        content: `你负责从对话中提取用户的新个人信息。只提取明确、有价值的信息。
字段类型：忌口（不吃什么）、偏好（喜欢什么）、生活习惯（作息/运动/工作）、常吃食物。
不要编造，只提取用户明确说出的信息。没有新信息时返回空数组。

如果用户提及的信息与已有记忆相同或高度相似，不要重复提取。`,
      },
    ];

    if (existingMemory) {
      memMessages.push({
        role: "user",
        content: `【用户已有记忆，不要重复提取】\n${existingMemory}`,
      });
    }

    memMessages.push({
      role: "user",
      content: `【对话上下文】
${conversationContext}

【助手最终回复】
"${finalReply}"

请从以上对话中提取用户新透露的个人信息。`,
    });

    const memRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: memMessages,
        temperature: 0.1,
        max_tokens: 512,
        tools: [extractTool],
        tool_choice: { type: "function", function: { name: "extract_memory" } },
      }),
    });

    const memData = await memRes.json().catch(() => null);
    if (memRes.ok && memData) {
      const args = memData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (args) {
        const parsed = JSON.parse(args);
        if (parsed.extracted?.length > 0) {
          return parsed.extracted;
        }
      }
    }
  } catch {
    // Memory 提取失败不影响主回复
  }
  return [];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userMessage, context } = body as {
      userMessage: string;
      context: AgentContext;
    };

    const apiKey = getApiKey();

    // ---- 构建消息列表 ----
    const messages: Array<{ role: string; content: string | null; tool_call_id?: string; tool_calls?: unknown[] }> = [
      { role: "system", content: ASSISTANT_PROMPT },
    ];

    if (context.memoryText) {
      messages.push({ role: "user", content: `【用户长期记忆】\n${context.memoryText}` });
    }

    messages.push({ role: "user", content: userMessage });

    const toolDefs = getAgentToolDefs();
    let preliminaryReply = ""; // 非流式回复仅用于 memory 提取，不入 messages

    // ---- Agent 多轮循环（非流式，仅做工具调用决策） ----
    for (let round = 0; round < MAX_AGENT_ROUNDS; round++) {
      const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 2048,
          tools: toolDefs,
          tool_choice: "auto",
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        throw new Error(`DeepSeek API error ${res.status}`);
      }

      const choice = data.choices?.[0]?.message;
      if (!choice) throw new Error("DeepSeek 返回为空");

      // LLM 决定直接回答 → 记下回复（仅用于 memory），不推入 messages
      if (choice.content && !choice.tool_calls) {
        preliminaryReply = choice.content;
        break;
      }

      // LLM 决定调用工具
      if (choice.tool_calls?.length > 0) {
        // content 必须为 null：有 tool_calls 时非空 content 会污染后续轮次上下文
        messages.push({
          role: "assistant",
          content: null,
          tool_calls: choice.tool_calls,
        });

        for (const tc of choice.tool_calls) {
          const fnName = tc.function?.name;
          const handler = findToolHandler(fnName);
          let result: string;
          if (handler) {
            try {
              const args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
              result = await Promise.resolve(handler(args, context));
            } catch {
              result = `工具 ${fnName} 执行失败`;
            }
          } else {
            result = `未知工具：${fnName}`;
          }
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: result,
          });
        }
        continue;
      }

      // 兜底
      break;
    }

    if (!preliminaryReply) {
      preliminaryReply = "抱歉，我需要更多信息才能回答这个问题，请说得更具体一些。";
    }

    // 构建对话上下文（收集所有用户消息，用于 memory 提取）
    const userMessages = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content as string);
    const conversationContext = userMessages.join("\n---\n");

    // ---- Memory 提取（并行跑，不阻塞流） ----
    const memoryPromise = extractMemory(
      userMessage,
      preliminaryReply,
      context.memoryText ?? "",
      conversationContext,
      apiKey,
    );

    // ---- 流式输出：用干净的 messages（无 assistant 回复）调用 stream API ----
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const streamRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: MODEL,
              messages,
              temperature: 0.7,
              max_tokens: 2048,
              stream: true,
            }),
          });

          if (!streamRes.ok) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", content: "AI 响应失败" })}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }

          const reader = streamRes.body?.getReader();
          if (!reader) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", content: "无法读取响应流" })}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }

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
                  // 过滤控制字符（防御性，避免 DeepSeek 偶发输出乱码字节）
                  const clean = delta.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
                  if (clean.length > 0) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", content: clean })}\n\n`));
                  }
                }
              } catch {
                // 跳过无法解析的行
              }
            }
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[assistant/chat] Stream error:", msg);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", content: msg })}\n\n`));
        }

        // 发送 memory 事件
        try {
          const extracted = await memoryPromise;
          if (extracted.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "memory", extracted })}\n\n`));
          }
        } catch {
          // 静默失败
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[assistant/chat] ERROR:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

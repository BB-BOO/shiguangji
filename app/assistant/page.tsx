"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { loadTodayMeals, loadMemory, createMealId, addMemoryEntry, loadConversations, saveConversation, getTodayKey, loadMeals } from "@/lib/storage";
import type { AssistantMessage, Conversation, MealRecord } from "@/lib/types";
import type { AgentContext } from "@/lib/agentTools";
import { IconSparkle } from "@/components/ui/Icons";
import { MarkdownText } from "@/components/ui/MarkdownText";

const EXAMPLE_QUESTIONS = [
  "我今天蛋白质够了吗",
  "晚上饿了吃什么好",
  "我不爱吃香菜，有什么替代",
  "最近总想吃零食怎么办",
];

export default function AssistantPage() {
  const router = useRouter();
  const { isAuthenticated, userProfile, dailyTarget } = useAuth();

  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [lastFailedMessage, setLastFailedMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // 认证检查
  useEffect(() => {
    if (!isAuthenticated) { router.replace("/login"); return; }
    if (!userProfile || !dailyTarget) { router.replace("/profile"); return; }

    // 加载今天对话
    const convs = loadConversations();
    setConversations(convs);
    const todayConv = convs.find((c) => c.date === getTodayKey());
    if (todayConv) {
      setMessages(todayConv.messages);
      setConversationId(todayConv.id);
    }
  }, [isAuthenticated, userProfile, dailyTarget, router]);

  // 滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildContext = useCallback((): AgentContext => {
    const todayMeals = loadTodayMeals();
    const allMeals = loadMeals();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth() + 1).padStart(2, "0")}-${String(sevenDaysAgo.getDate()).padStart(2, "0")}`;
    const recentMeals = allMeals.filter((m) => m.date >= cutoff);
    const memory = loadMemory();
    const memoryText = memory.length > 0
      ? memory.map((e) => `- ${e.field}：${e.value}`).join("\n")
      : "";

    return {
      profile: userProfile || null,
      targets: dailyTarget || null,
      todayMeals,
      recentMeals,
      memoryText,
    };
  }, [userProfile, dailyTarget]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: AssistantMessage = { role: "user", content: text, timestamp: new Date().toISOString() };
    const initialMessages = [...messages, userMsg];
    setMessages(initialMessages);
    setInput("");
    setLoading(true);
    setLastFailedMessage("");

    try {
      const context = buildContext();
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: text, context }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "请求失败" }));
        throw new Error(data.error || "请求失败");
      }

      // 添加空的 AI 消息占位，后续流式填充
      const aiPlaceholder: AssistantMessage = { role: "ai", content: "", timestamp: new Date().toISOString() };
      setMessages([...initialMessages, aiPlaceholder]);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("无法读取响应流");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      const extractedItems: Array<{ field: string; value: string }> = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]" || !json) continue;

          try {
            const event = JSON.parse(json);
            if (event.type === "text") {
              fullContent += event.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullContent };
                return updated;
              });
            } else if (event.type === "memory" && event.extracted?.length > 0) {
              for (const item of event.extracted) {
                extractedItems.push(item);
                addMemoryEntry({
                  field: item.field,
                  value: item.value,
                  source: conversationId || "new",
                  extracted_at: new Date().toISOString(),
                });
              }
            }
          } catch {
            // 跳过无法解析的事件
          }
        }
      }

      // 流结束，保存对话
      const finalAiMsg: AssistantMessage = { role: "ai", content: fullContent, timestamp: new Date().toISOString() };
      const finalMessages = [...initialMessages, finalAiMsg];
      const conv: Conversation = {
        id: conversationId || createMealId(),
        date: getTodayKey(),
        message_preview: finalMessages[0]?.content.slice(0, 30) || "",
        messages: finalMessages,
      };
      if (!conversationId) setConversationId(conv.id);
      saveConversation(conv);
      setMessages(finalMessages);
    } catch (e) {
      setMessages([...initialMessages, { role: "ai", content: "回答生成失败，请重试", timestamp: new Date().toISOString() }]);
      setLastFailedMessage(text);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, conversationId, buildContext]);

  const loadConversation = (id: string) => {
    const convs = loadConversations();
    const conv = convs.find((c) => c.id === id);
    if (conv) {
      setMessages(conv.messages);
      setConversationId(conv.id);
      setShowHistory(false);
    }
  };

  const isFirstUse = messages.length === 0;

  return (
    <main className="flex h-dvh flex-col bg-[#f8faf7]">
      {/* 顶部导航 */}
      <header className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="flex items-center gap-2">
          <IconSparkle className="h-4 w-4 text-emerald-500" />
          <span className="text-lg font-bold">食小光 · AI 助手</span>
        </div>
        <button
          onClick={() => { setConversations(loadConversations()); setShowHistory(!showHistory); }}
          className="rounded-xl p-2 text-[var(--color-muted)] hover:bg-white/80 transition-colors"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4l2.5 2.5" />
          </svg>
        </button>
      </header>

      {/* 历史列表 */}
      {showHistory && (
        <div className="border-b border-gray-100 bg-white px-4 py-3">
          <p className="mb-2 text-xs font-medium text-[var(--color-muted)]">近 7 天对话</p>
          {conversations.length === 0 ? (
            <p className="py-4 text-center text-xs text-[var(--color-muted)]">暂无历史对话</p>
          ) : (
            <div className="space-y-1">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => loadConversation(c.id)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium truncate">{c.message_preview || "新对话"}</p>
                    <p className="text-[11px] text-[var(--color-muted)]">{c.date} · {c.messages.length} 条消息</p>
                  </div>
                  <svg className="h-4 w-4 flex-none text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 对话区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isFirstUse ? (
          <div className="flex flex-col items-center pt-12">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
              <IconSparkle className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-[15px] font-semibold text-[var(--color-text)]">你好，我是食小光</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">告诉我你的饮食习惯，我会越来越懂你</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2 px-4">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-[13px] text-emerald-700 transition-all hover:bg-emerald-50 active:scale-[0.97]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-emerald-500 text-white rounded-br-md"
                      : "bg-white text-[var(--color-text)] rounded-bl-md shadow-sm"
                  }`}
                >
                  {msg.role === "ai" ? <MarkdownText content={msg.content} /> : msg.content}
                  {msg.role === "ai" && msg.content === "回答生成失败，请重试" && lastFailedMessage && (
                    <button
                      onClick={() => send(lastFailedMessage)}
                      className="mt-2 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-emerald-600 active:scale-[0.97]"
                    >
                      重试
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-white px-5 py-3 shadow-sm">
                  <span className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* 底部输入区 */}
      <div className="border-t border-gray-100 bg-white px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
            }}
            placeholder="随时问我任何饮食问题..."
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-colors focus:border-emerald-300 focus:bg-white min-h-[48px]"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-emerald-500 text-white transition-all hover:bg-emerald-600 active:scale-[0.95] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </main>
  );
}

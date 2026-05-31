"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { analyzeMealChat, runMealAnalysis } from "@/lib/difyService";
import { createMealId, getTodayKey, loadTodayMeals, saveMeal, loadMemory, syncMealRating } from "@/lib/storage";
import type { MealAnalysisResponse, MealType } from "@/lib/types";
import { MealNutritionCard } from "@/components/meal/MealNutritionCard";
import { MealResultCard } from "@/components/meal/MealResultCard";
import { IconBack, IconSparkle } from "@/components/ui/Icons";
import Link from "next/link";

const MEAL_TYPES: MealType[] = ["早餐", "午餐", "晚餐", "加餐"];

const MEAL_EMOJI: Record<MealType, string> = {
  早餐: "🌅",
  午餐: "☀️",
  晚餐: "🌙",
  加餐: "🍎",
};

interface ChatMessage {
  role: "user" | "ai";
  content: string;
  thinking?: boolean;
}

export default function MealPage() {
  const router = useRouter();
  const { isAuthenticated, userProfile } = useAuth();

  const [mealType, setMealType] = useState<MealType>("午餐");
  const [foodText, setFoodText] = useState("");
  const [loading, setLoading] = useState(false);

  // 对话状态
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [analysis, setAnalysis] = useState<MealAnalysisResponse | null>(null);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [mealId, setMealId] = useState("");
  const [rating, setRating] = useState<boolean | undefined>(undefined);
  const [followUpCount, setFollowUpCount] = useState(0);
  const [conversationId, setConversationId] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, analysis, errorMsg]);

  const [todayRecordedTypes, setTodayRecordedTypes] = useState<Set<MealType>>(new Set());

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!ready) return;
    async function load() {
      const meals = await loadTodayMeals();
      // 加餐允许多次记录，不纳入重复检查
      const recorded = new Set(
        meals.filter((m) => m.meal_type !== "加餐").map((m) => m.meal_type as MealType),
      );
      setTodayRecordedTypes(recorded);
      const firstAvailable = MEAL_TYPES.find((t) => !recorded.has(t));
      if (firstAvailable) setMealType(firstAvailable);
    }
    load();
  }, [ready]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-pulse rounded-full bg-emerald-200/60" />
          <p className="text-sm text-[var(--color-muted)]">加载中…</p>
        </div>
      </div>
    );
  }

  const typeAlreadyRecorded = todayRecordedTypes.has(mealType);
  const canSubmit = foodText.trim().length > 0 && !loading && !typeAlreadyRecorded;

  const handleAnalyze = async () => {
    if (!canSubmit) return;

    // 新对话生成 conversation_id
    const convId = conversationId || createMealId();
    if (!conversationId) setConversationId(convId);

    const userMsg = foodText.trim();
    // 构造当前轮对话历史（包含刚发送的用户消息）
    const history: ChatMessage[] = [
      ...messages.filter((m) => !m.thinking),
      { role: "user", content: userMsg },
    ];
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMsg },
      { role: "ai", content: "", thinking: true },
    ]);
    setFoodText("");
    setLoading(true);
    setErrorMsg("");

    try {
      // 步骤1：信息完整性判断（立即返回）
      const checkResult = await analyzeMealChat(userMsg, history, convId);

      if (!checkResult.is_enough) {
        // 信息不足 → 显示追问，等待用户继续输入
        setFollowUpCount((c) => c + 1);
        setMessages((prev) => [
          ...prev.filter((m) => !m.thinking),
          { role: "ai", content: checkResult.assistant_message },
        ]);
        setLoading(false);
        return;
      }

      // 信息足够 → 进入分析
      setMessages((prev) => {
        const cleaned = prev.filter((m) => !m.thinking);
        if (checkResult.assistant_message) {
          cleaned.push({ role: "ai", content: checkResult.assistant_message });
        }
        cleaned.push({ role: "ai", content: "", thinking: true });
        return cleaned;
      });

      const allFoodText = history
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .join("。");

      const analysis = await runMealAnalysis(allFoodText, {
        goal_mode: userProfile?.goal_mode ?? "保持",
        meal_type: mealType,
        weight_kg: userProfile?.weight_kg,
        height_cm: userProfile?.height_cm,
        age: userProfile?.age,
      }, (await loadMemory()).map((e) => `${e.field}：${e.value}`).join("；"));

      if (analysis?.nutrition_estimate) {
        setMessages((prev) => prev.filter((m) => !m.thinking));
        setAnalysis(analysis);
      } else {
        setMessages((prev) => prev.filter((m) => !m.thinking));
        setErrorMsg("AI 返回数据不完整，请重试");
      }
    } catch (e) {
      setMessages((prev) => prev.filter((m) => !m.thinking));
      const msg = e instanceof Error ? e.message : "未知错误";
      setErrorMsg(`分析失败：${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!analysis) return;
    try {
      const id = createMealId();
      setMealId(id);
      saveMeal({
        id,
        date: getTodayKey(),
        meal_type: mealType,
        meal_record_text: analysis.meal_record,
        nutrition_estimate: analysis.nutrition_estimate,
        meal_status: analysis.meal_status,
        conversation_id: conversationId || undefined,
        follow_up_count: followUpCount,
        rating,
        created_at: new Date().toISOString(),
      });
      setSaved(true);
    } catch {
      setErrorMsg("保存失败，请重试");
    }
  };

  const handleRating = (value: boolean) => {
    setRating(value);
    // 已保存：直接更新 DB
    if (mealId) {
      syncMealRating(mealId, value);
    }
    // 同步 localStorage（兼容旧逻辑）
    const meals = JSON.parse(localStorage.getItem("shiguangji-meals") || "[]") as Array<{ id: string; rating?: boolean }>;
    const idx = meals.findIndex((m) => m.id === mealId);
    if (idx >= 0) {
      meals[idx].rating = value;
      localStorage.setItem("shiguangji-meals", JSON.stringify(meals));
    }
  };

  const resetConversation = () => {
    setAnalysis(null);
    setMessages([]);
    setFoodText("");
    setErrorMsg("");
  };

  const handleMealTypeChange = (type: MealType) => {
    setMealType(type);
    resetConversation();
  };

  return (
    <div className="flex h-dvh flex-col">
      {/* 顶部导航 */}
      <header className="shrink-0 flex items-center justify-between px-5 pt-7">
        <Link
          href="/"
          className="inline-flex items-center rounded-full bg-white/70 p-2 text-[var(--color-muted)] shadow-sm backdrop-blur-sm transition-colors hover:text-[var(--color-primary)] active:scale-[0.98]"
        >
          <IconBack />
        </Link>
        <h1 className="text-lg font-bold tracking-tight">单餐分析</h1>
        <div className="w-8" />
      </header>

      {/* 聊天区域 */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 pt-4">
        {messages.length === 0 && (
          <div className="card-elevated flex flex-col items-center rounded-[22px] border border-dashed border-emerald-200/60 px-6 py-16 text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl">
              🥗
            </span>
            <p className="text-sm font-medium text-[var(--color-text)]">
              与 AI 营养师聊聊你吃了什么
            </p>
            <p className="mt-2 max-w-[240px] text-xs leading-relaxed text-[var(--color-muted)]">
              用自然语言描述饮食，AI 会自动分析营养并给出建议
            </p>
          </div>
        )}

        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "ai" && (
                <span className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <IconSparkle className="h-3.5 w-3.5" />
                </span>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-emerald-400 to-[#2eb872] text-white"
                    : "bg-white/90 border border-[var(--color-border)] text-[var(--color-text)]"
                }`}
              >
                {msg.thinking ? (
                  <span className="flex items-center gap-2">
                    <span className="text-[var(--color-muted)]">正在分析中</span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: "0s" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: "0.15s" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: "0.3s" }} />
                    </span>
                  </span>
                ) : (
                  msg.content
                )}
              </div>
              {msg.role === "user" && (
                <span className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold">
                  我
                </span>
              )}
            </div>
          ))}

          {/* 错误提示 */}
          {errorMsg && (
            <div className="rounded-2xl border border-red-100 bg-red-50/80 px-4 py-3 text-center text-xs text-red-500">
              {errorMsg}
              <button
                onClick={() => setErrorMsg("")}
                className="ml-2 underline hover:text-red-600"
              >
                关闭
              </button>
            </div>
          )}

          {/* 分析结果卡片 */}
          {analysis && (
            <div className="space-y-4 pt-2">
              <MealNutritionCard analysis={analysis} />
              <MealResultCard analysis={analysis} />

              {/* 满意度评价 - 位于结果卡片底部 */}
              <div className="card-elevated rounded-2xl p-4 text-center">
                <p className="mb-3 text-sm font-medium text-[var(--color-text)]">本次分析对你有帮助吗？</p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => handleRating(true)}
                    className={`flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-medium transition-all active:scale-[0.97] ${
                      rating === true
                        ? "bg-emerald-500 text-white shadow-[0_4px_12px_rgba(46,184,114,0.3)]"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    😊 满意
                  </button>
                  <button
                    onClick={() => handleRating(false)}
                    className={`flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-medium transition-all active:scale-[0.97] ${
                      rating === false
                        ? "bg-emerald-500 text-white shadow-[0_4px_12px_rgba(46,184,114,0.3)]"
                        : "bg-gray-100 text-[var(--color-muted)] hover:bg-gray-200"
                    }`}
                  >
                    😐 不满意
                  </button>
                </div>
              </div>

              {!saved ? (
                <button
                  onClick={handleSave}
                  className="btn-primary w-full rounded-[24px] py-3.5 text-base font-semibold text-white"
                >
                  保存此餐
                </button>
              ) : (
                <div className="text-center space-y-2">
                  <p className="text-sm text-emerald-600 font-medium">保存成功</p>
                  <button
                    onClick={() => router.push("/")}
                    className="text-xs text-[var(--color-muted)] underline hover:text-[var(--color-text)] transition-colors"
                  >
                    返回首页
                  </button>
                </div>
              )}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* 底部输入区域 */}
      <div className="shrink-0 border-t border-white/60 bg-white/85 px-5 pb-7 pt-4 shadow-[0_-8px_32px_rgba(26,46,36,0.06)] backdrop-blur-xl">
        <div className="mx-auto max-w-md space-y-3">
          {/* 餐次选择器 */}
          <div className="grid grid-cols-4 gap-2">
            {MEAL_TYPES.map((type) => {
              const recorded = todayRecordedTypes.has(type);
              const active = mealType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => !recorded && handleMealTypeChange(type)}
                  disabled={loading}
                  className={`relative flex flex-col items-center gap-0.5 rounded-2xl py-2 text-sm font-semibold transition-all duration-200 ${
                    recorded
                      ? "cursor-not-allowed bg-gray-50/60 text-[var(--color-muted)] opacity-50"
                      : active
                        ? "bg-gradient-to-b from-emerald-400 to-[#2eb872] text-white shadow-[0_4px_14px_rgba(46,184,114,0.35)] scale-[1.02]"
                        : "bg-gray-100/90 text-[var(--color-text)] hover:bg-gray-100 active:scale-[0.98]"
                  }`}
                >
                  <span className="text-sm leading-none">{MEAL_EMOJI[type]}</span>
                  <span className="text-[11px]">{recorded ? "已记录" : type}</span>
                  {recorded && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-bold text-white">✓</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 输入框 + 发送 */}
          {typeAlreadyRecorded ? (
            <p className="text-center text-xs text-[var(--color-muted)] py-2">
              今日{mealType}已记录，请选择其他餐次
            </p>
          ) : (
            <div className="flex gap-2">
              <textarea
                value={foodText}
                onChange={(e) => setFoodText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAnalyze();
                  }
                }}
                placeholder="例如：中午吃了一碗牛肉面，加了个蛋"
                rows={2}
                className="flex-1 resize-none rounded-2xl border border-[var(--color-border)] bg-gray-50/80 px-4 py-3 text-sm leading-relaxed outline-none transition-all focus:border-emerald-300 focus:bg-white focus:shadow-[0_0_0_3px_rgba(46,184,114,0.12)] h-[80px]"
              />
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!canSubmit}
                className="btn-primary shrink-0 self-end rounded-[24px] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40 disabled:shadow-none disabled:transform-none"
              >
                {loading ? "分析中..." : "开始分析"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

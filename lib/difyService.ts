import type {
  DailySummaryInputs,
  DailySummaryResponse,
  MealAnalysisResponse,
  MealChatInputs,
  WeeklyAnalysisInputs,
  WeeklyAnalysisResponse,
} from "./types";

// ========== 单餐分析 ==========

export interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

export interface MealCheckResult {
  is_enough: boolean;
  assistant_message: string;
}

/** 步骤1：信息完整性判断（立即返回） */
export async function analyzeMealChat(
  query: string,
  messages: ChatMessage[],
  conversationId?: string,
): Promise<MealCheckResult> {
  const res = await fetch("/api/meal-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, messages, conversation_id: conversationId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

/** 步骤2：单餐营养分析（信息足够后调用，可单独等待） */
export async function runMealAnalysis(
  allFoodText: string,
  inputs: MealChatInputs,
  memory?: string,
): Promise<MealAnalysisResponse> {
  const res = await fetch("/api/meal-chat/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      allFoodText,
      goalMode: inputs.goal_mode,
      mealType: inputs.meal_type,
      weightKg: inputs.weight_kg,
      heightCm: inputs.height_cm,
      age: inputs.age,
      memory,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

// ========== 每日总结 ==========

export async function fetchDailySummary(
  inputs: Record<string, unknown>,
): Promise<DailySummaryResponse> {
  const res = await fetch("/api/daily-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inputs),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

// ========== 每周分析 ==========

export async function fetchWeeklyAnalysis(
  inputs: Record<string, unknown>,
): Promise<WeeklyAnalysisResponse> {
  const res = await fetch("/api/weekly-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inputs),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

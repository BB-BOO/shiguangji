import { supabase } from "./supabase";
import type {
  MealRecord,
  UserProfile,
  DailyTargetRange,
  DailySummaryResponse,
  MemoryEntry,
  ProactiveConfig,
  ProactiveLog,
  Conversation,
} from "./types";

// ========== 注册 / 登录 ==========

export async function registerUser(username: string): Promise<string> {
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existing) throw new Error("用户名已存在");

  const { data, error } = await supabase
    .from("users")
    .insert({ username })
    .select("id")
    .single();

  if (error || !data) throw new Error("注册失败");
  return data.id as string;
}

export async function loginUser(username: string): Promise<string> {
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (!data) throw new Error("用户不存在");
  return data.id as string;
}

// ========== 餐记录 ==========

export async function syncMealToDb(userId: string, record: MealRecord): Promise<void> {
  await supabase.from("meal_records").upsert({
    id: record.id,
    user_id: userId,
    date: record.date,
    meal_type: record.meal_type,
    meal_record_text: record.meal_record_text,
    nutrition_estimate: record.nutrition_estimate,
    meal_status: record.meal_status,
    conversation_id: record.conversation_id ?? null,
    rating: record.rating ?? null,
    created_at: record.created_at,
  });
}

export async function deleteMealFromDb(mealId: string): Promise<void> {
  await supabase.from("meal_records").delete().eq("id", mealId);
}

export async function deleteMealsFromDb(mealIds: string[]): Promise<void> {
  await supabase.from("meal_records").delete().in("id", mealIds);
}

// ========== 用户资料 ==========

export async function syncProfileToDb(userId: string, profile: UserProfile): Promise<void> {
  await supabase
    .from("users")
    .update({
      goal_mode: profile.goal_mode,
      height_cm: profile.height_cm,
      weight_kg: profile.weight_kg,
      age: profile.age,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}

// ========== 目标范围 ==========

export async function syncTargetsToDb(userId: string, targets: DailyTargetRange): Promise<void> {
  await supabase.from("daily_targets").delete().eq("user_id", userId);
  await supabase.from("daily_targets").insert({
    user_id: userId,
    protein_min: targets.protein_g.min,
    protein_max: targets.protein_g.max,
    carbs_min: targets.carbs_g.min,
    carbs_max: targets.carbs_g.max,
    vegetables_min: targets.vegetables_g.min,
    vegetables_max: targets.vegetables_g.max,
    fat_min: targets.fat_g.min,
    fat_max: targets.fat_g.max,
    calories_min: targets.calories_kcal.min,
    calories_max: targets.calories_kcal.max,
  });
}

// ========== 每日总结 ==========

export async function syncDailySummaryToDb(
  userId: string,
  date: string,
  fingerprint: string,
  summary: DailySummaryResponse,
): Promise<void> {
  await supabase.from("daily_summaries").upsert(
    {
      user_id: userId,
      date,
      fingerprint,
      daily_status: summary.daily_status,
      feedback: summary.feedback,
      analysis_text: summary.analysis_text,
    },
    { onConflict: "user_id,date" },
  );
}

// ========== 长期记忆 ==========

export async function syncMemoryToDb(userId: string, entries: MemoryEntry[]): Promise<void> {
  await supabase.from("memories").delete().eq("user_id", userId);
  if (entries.length === 0) return;
  await supabase.from("memories").insert(
    entries.map((e) => ({
      user_id: userId,
      field: e.field,
      value: e.value,
      source: e.source,
      extracted_at: e.extracted_at,
    })),
  );
}

// ========== 主动触达设置 ==========

export async function syncProactiveConfigToDb(userId: string, config: ProactiveConfig): Promise<void> {
  await supabase.from("proactive_configs").upsert({
    user_id: userId,
    daily_limit: config.daily_limit,
    quiet_start: config.quiet_start,
    quiet_end: config.quiet_end,
    master_switch: config.master_switch,
  });
}

// ========== 主动触达记录 ==========

export async function syncProactiveLogToDb(userId: string, log: ProactiveLog): Promise<void> {
  await supabase.from("proactive_logs").insert({
    id: log.id,
    user_id: userId,
    event_type: log.event_type,
    message: log.message,
    pushed_at: log.pushed_at,
    dismissed: log.dismissed,
  });
}

export async function dismissProactiveLogInDb(logId: string): Promise<void> {
  await supabase.from("proactive_logs").update({ dismissed: true }).eq("id", logId);
}

// ========== 每周总结 ==========

export async function syncWeeklySummaryToDb(
  userId: string,
  weekStart: string,
  fingerprint: string,
  summary: import("./types").WeeklyAnalysisResponse,
): Promise<void> {
  await supabase.from("weekly_summaries").upsert(
    {
      user_id: userId,
      week_start: weekStart,
      fingerprint,
      weekly_status: summary.weekly_status,
      goal_match: summary.goal_match,
      feedback: summary.feedback,
      analysis_text: summary.analysis_text,
      next_week_target: summary.next_week_target,
    },
    { onConflict: "user_id,week_start" },
  );
}

// ========== AI 助手对话 ==========

export async function syncConversationToDb(userId: string, conv: Conversation): Promise<void> {
  await supabase.from("conversations").upsert({
    id: conv.id,
    user_id: userId,
    date: conv.date,
    message_preview: conv.message_preview,
    messages: conv.messages,
  });
}

// ========== 读取（替代 localStorage） ==========

export async function loadProfileFromDb(userId: string): Promise<UserProfile | null> {
  const { data } = await supabase.from("users").select("goal_mode, height_cm, weight_kg, age").eq("id", userId).maybeSingle();
  if (!data?.goal_mode) return null;
  return { goal_mode: data.goal_mode as UserProfile["goal_mode"], height_cm: data.height_cm as number, weight_kg: data.weight_kg as number, age: data.age as number };
}

export async function loadTargetsFromDb(userId: string): Promise<DailyTargetRange | null> {
  const { data } = await supabase.from("daily_targets").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return null;
  return { protein_g: { min: data.protein_min as number, max: data.protein_max as number }, carbs_g: { min: data.carbs_min as number, max: data.carbs_max as number }, vegetables_g: { min: data.vegetables_min as number, max: data.vegetables_max as number }, fat_g: { min: data.fat_min as number, max: data.fat_max as number }, calories_kcal: { min: data.calories_min as number, max: data.calories_max as number } };
}

export async function loadMealsFromDb(userId: string): Promise<MealRecord[]> {
  const { data } = await supabase.from("meal_records").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  return (data ?? []) as unknown as MealRecord[];
}

export async function loadMealsByDateRangeFromDb(userId: string, startDate: string, endDate: string): Promise<MealRecord[]> {
  const { data } = await supabase.from("meal_records").select("*").eq("user_id", userId).gte("date", startDate).lte("date", endDate).order("date", { ascending: false });
  return (data ?? []) as unknown as MealRecord[];
}

export async function loadDailySummaryFromDb(userId: string, date: string): Promise<DailySummaryResponse | null> {
  const { data } = await supabase.from("daily_summaries").select("daily_status, feedback, analysis_text").eq("user_id", userId).eq("date", date).maybeSingle();
  if (!data) return null;
  return { daily_status: data.daily_status as DailySummaryResponse["daily_status"], feedback: data.feedback as string, analysis_text: data.analysis_text as string };
}

export async function loadMemoryFromDb(userId: string): Promise<MemoryEntry[]> {
  const { data } = await supabase.from("memories").select("field, value, source, extracted_at").eq("user_id", userId).order("created_at", { ascending: false });
  return (data ?? []) as MemoryEntry[];
}

export async function loadProactiveConfigFromDb(userId: string): Promise<ProactiveConfig> {
  const { data } = await supabase.from("proactive_configs").select("*").eq("user_id", userId).maybeSingle();
  return { daily_limit: (data?.daily_limit as number) ?? 2, quiet_start: (data?.quiet_start as string) ?? "22:00", quiet_end: (data?.quiet_end as string) ?? "08:00", master_switch: (data?.master_switch as boolean) ?? true };
}

export async function loadProactiveLogsFromDb(userId: string): Promise<ProactiveLog[]> {
  const { data } = await supabase.from("proactive_logs").select("*").eq("user_id", userId).order("pushed_at", { ascending: false });
  return (data ?? []) as ProactiveLog[];
}

export async function loadConversationsFromDb(userId: string): Promise<Conversation[]> {
  const { data } = await supabase.from("conversations").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(20);
  return (data ?? []) as Conversation[];
}

export async function loadWeeklySummaryFromDb(userId: string, weekStart: string): Promise<import("./types").WeeklyAnalysisResponse | null> {
  const { data } = await supabase.from("weekly_summaries").select("*").eq("user_id", userId).eq("week_start", weekStart).maybeSingle();
  if (!data) return null;
  return { weekly_status: data.weekly_status as import("./types").WeeklyAnalysisResponse["weekly_status"], goal_match: data.goal_match as import("./types").GoalMatch, feedback: data.feedback as string, analysis_text: data.analysis_text as string, next_week_target: data.next_week_target as import("./types").NextWeekTarget };
}

// ========== Admin 查询 ==========

type DbRow = Record<string, unknown>;

export async function adminGetAllUsers(): Promise<DbRow[]> {
  const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

export async function adminGetMealsByDateRange(startDate: string, endDate: string): Promise<DbRow[]> {
  const { data } = await supabase
    .from("meal_records")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });
  return data ?? [];
}

export async function adminGetDailySummaries(date: string): Promise<DbRow[]> {
  const { data } = await supabase.from("daily_summaries").select("*").eq("date", date);
  return data ?? [];
}

export async function adminGetAllMemories(): Promise<DbRow[]> {
  const { data } = await supabase
    .from("memories")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function adminGetProactiveLogs(limit = 50): Promise<DbRow[]> {
  const { data } = await supabase
    .from("proactive_logs")
    .select("*")
    .order("pushed_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function adminGetStats(): Promise<{
  totalUsers: number;
  totalMeals: number;
  mealsPerUser: number;
  recentActivity: DbRow[];
}> {
  const { count: totalUsers } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  const { count: totalMeals } = await supabase
    .from("meal_records")
    .select("*", { count: "exact", head: true });

  const { data: recentActivity } = await supabase
    .from("meal_records")
    .select("id, date, meal_type, user_id")
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    totalUsers: totalUsers ?? 0,
    totalMeals: totalMeals ?? 0,
    mealsPerUser: totalUsers ? (totalMeals ?? 0) / (totalUsers || 1) : 0,
    recentActivity: recentActivity ?? [],
  };
}

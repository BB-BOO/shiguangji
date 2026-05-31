import type {
  Conversation,
  DailySummaryResponse,
  DailyTargetRange,
  MealRecord,
  MemoryEntry,
  ProactiveConfig,
  ProactiveLog,
  UserProfile,
} from "./types";

// Supabase 双写（异步，不阻塞 UI）
function getUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("shiguangji-user-id");
}

function sync<T>(fn: (userId: string) => Promise<T>): void {
  const uid = getUserId();
  if (uid) fn(uid).catch(() => {});
}

const STORAGE_KEYS = {
  meals: "shiguangji-meals",
  profile: "shiguangji-profile",
  targets: "shiguangji-targets",
  auth: "shiguangji-auth",
  dailySummary: "shiguangji-daily-summary",
  memory: "shiguangji-memory",
  proactiveConfig: "shiguangji-proactive-config",
  proactiveLogs: "shiguangji-proactive-logs",
  conversations: "shiguangji-conversations",
} as const;

// ========== 认证 ==========

export function getAuth(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEYS.auth) === "true";
}

export function setAuth(value: boolean): void {
  localStorage.setItem(STORAGE_KEYS.auth, String(value));
}

// ========== 用户资料 ==========

export function loadProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.profile);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
  sync((uid) => import("./db").then((m) => m.syncProfileToDb(uid, profile)));
}

// ========== 每日目标范围 ==========

export function loadTargets(): DailyTargetRange | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.targets);
    return raw ? (JSON.parse(raw) as DailyTargetRange) : null;
  } catch {
    return null;
  }
}

export function saveTargets(targets: DailyTargetRange): void {
  localStorage.setItem(STORAGE_KEYS.targets, JSON.stringify(targets));
  sync((uid) => import("./db").then((m) => m.syncTargetsToDb(uid, targets)));
}

// ========== 餐记录 ==========

export function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function loadMeals(): MealRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.meals);
    return raw ? (JSON.parse(raw) as MealRecord[]) : [];
  } catch {
    return [];
  }
}

export function loadTodayMeals(): MealRecord[] {
  const today = getTodayKey();
  return loadMeals().filter((m) => m.date === today);
}

export function loadMealsByDateRange(startDate: string, endDate: string): MealRecord[] {
  return loadMeals().filter((m) => m.date >= startDate && m.date <= endDate);
}

export function saveMeal(record: MealRecord): void {
  const meals = loadMeals();
  const idx = meals.findIndex((m) => m.id === record.id);
  if (idx >= 0) meals[idx] = record;
  else meals.push(record);
  localStorage.setItem(STORAGE_KEYS.meals, JSON.stringify(meals));
  sync((uid) => import("./db").then((m) => m.syncMealToDb(uid, record)));
}

export function deleteMeal(id: string): void {
  const meals = loadMeals().filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEYS.meals, JSON.stringify(meals));
  sync((uid) => import("./db").then((m) => m.deleteMealFromDb(id)));
}

export function deleteMeals(ids: string[]): void {
  const idSet = new Set(ids);
  const meals = loadMeals().filter((m) => !idSet.has(m.id));
  localStorage.setItem(STORAGE_KEYS.meals, JSON.stringify(meals));
  sync((uid) => import("./db").then((m) => m.deleteMealsFromDb(ids)));
}

export function createMealId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ========== 每日总结缓存 ==========

interface CachedDailySummary {
  date: string;
  fingerprint: string;
  summary: DailySummaryResponse;
}

export function loadDailySummaryCache(date: string): CachedDailySummary | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.dailySummary);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedDailySummary;
    return cached.date === date ? cached : null;
  } catch {
    return null;
  }
}

export function saveDailySummaryCache(
  date: string,
  fingerprint: string,
  summary: DailySummaryResponse,
): void {
  const cached: CachedDailySummary = { date, fingerprint, summary };
  localStorage.setItem(STORAGE_KEYS.dailySummary, JSON.stringify(cached));
  sync((uid) => import("./db").then((m) => m.syncDailySummaryToDb(uid, date, fingerprint, summary)));
}

// ========== 长期记忆 ==========

export function loadMemory(): MemoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.memory);
    return raw ? (JSON.parse(raw) as MemoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveMemory(entries: MemoryEntry[]): void {
  localStorage.setItem(STORAGE_KEYS.memory, JSON.stringify(entries));
  sync((uid) => import("./db").then((m) => m.syncMemoryToDb(uid, entries)));
}

export function addMemoryEntry(entry: MemoryEntry): void {
  const entries = loadMemory();
  const idx = entries.findIndex((e) => e.field === entry.field && e.value === entry.value);
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  saveMemory(entries);
}

export function deleteMemoryEntry(field: string, value: string): void {
  const entries = loadMemory().filter((e) => !(e.field === field && e.value === value));
  saveMemory(entries);
}

// ========== 主动触达设置 ==========

export function loadProactiveConfig(): ProactiveConfig {
  if (typeof window === "undefined") {
    return { daily_limit: 2, quiet_start: "22:00", quiet_end: "08:00", master_switch: true };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.proactiveConfig);
    return raw
      ? (JSON.parse(raw) as ProactiveConfig)
      : { daily_limit: 2, quiet_start: "22:00", quiet_end: "08:00", master_switch: true };
  } catch {
    return { daily_limit: 2, quiet_start: "22:00", quiet_end: "08:00", master_switch: true };
  }
}

export function saveProactiveConfig(config: ProactiveConfig): void {
  localStorage.setItem(STORAGE_KEYS.proactiveConfig, JSON.stringify(config));
  sync((uid) => import("./db").then((m) => m.syncProactiveConfigToDb(uid, config)));
}

// ========== 主动触达记录 ==========

export function loadProactiveLogs(): ProactiveLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.proactiveLogs);
    return raw ? (JSON.parse(raw) as ProactiveLog[]) : [];
  } catch {
    return [];
  }
}

export function saveProactiveLog(log: ProactiveLog): void {
  const logs = loadProactiveLogs();
  logs.push(log);
  localStorage.setItem(STORAGE_KEYS.proactiveLogs, JSON.stringify(logs));
  sync((uid) => import("./db").then((m) => m.syncProactiveLogToDb(uid, log)));
}

export function dismissProactiveLog(id: string): void {
  const logs = loadProactiveLogs().map((l) => (l.id === id ? { ...l, dismissed: true } : l));
  localStorage.setItem(STORAGE_KEYS.proactiveLogs, JSON.stringify(logs));
  sync(() => import("./db").then((m) => m.dismissProactiveLogInDb(id)));
}

// ========== AI 助手对话 ==========

export function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.conversations);
    return raw ? (JSON.parse(raw) as Conversation[]) : [];
  } catch {
    return [];
  }
}

export function saveConversation(conv: Conversation): void {
  const convs = loadConversations();
  const idx = convs.findIndex((c) => c.id === conv.id);
  if (idx >= 0) convs[idx] = conv;
  else convs.push(conv);
  // 保留近7天对话
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  const filtered = convs.filter((c) => c.date >= cutoffStr);
  localStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify(filtered));
  sync((uid) => import("./db").then((m) => m.syncConversationToDb(uid, conv)));
}

export function loadConversation(id: string): Conversation | null {
  return loadConversations().find((c) => c.id === id) ?? null;
}

export function getTodayConversation(): Conversation | null {
  const today = getTodayKey();
  return loadConversations().find((c) => c.date === today) ?? null;
}

// ========== 每周总结缓存 ==========

interface CachedWeeklySummary {
  weekStart: string;
  fingerprint: string;
  summary: import("./types").WeeklyAnalysisResponse;
}

export function loadWeeklySummaryCache(weekStart: string): CachedWeeklySummary | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("shiguangji-weekly-summary");
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedWeeklySummary;
    return cached.weekStart === weekStart ? cached : null;
  } catch {
    return null;
  }
}

export function saveWeeklySummaryCache(
  weekStart: string,
  fingerprint: string,
  summary: import("./types").WeeklyAnalysisResponse,
): void {
  const cached: CachedWeeklySummary = { weekStart, fingerprint, summary };
  localStorage.setItem("shiguangji-weekly-summary", JSON.stringify(cached));
  sync((uid) => import("./db").then((m) => m.syncWeeklySummaryToDb(uid, weekStart, fingerprint, summary)));
}

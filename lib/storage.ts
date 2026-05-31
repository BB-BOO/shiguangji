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

// ========== 内存缓存（5 分钟 TTL，页面切换秒开） ==========
const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map<string, { data: unknown; ts: number }>();

function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data as T;
  cache.delete(key);
  return null;
}

function cacheSet(key: string, data: unknown): void {
  cache.set(key, { data, ts: Date.now() });
}

function cacheDel(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

// ========== 认证 ==========

export function getAuth(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("shiguangji-auth") === "true";
}

export function setAuth(value: boolean): void {
  localStorage.setItem("shiguangji-auth", String(value));
}

// ========== 用户资料 ==========

export async function loadProfile(): Promise<UserProfile | null> {
  const uid = getUserId();
  if (!uid) return null;
  const ck = `profile:${uid}`;
  const cached = cacheGet<UserProfile | null>(ck);
  if (cached !== null) return cached;
  try {
    const { loadProfileFromDb } = await import("./db");
    const data = await loadProfileFromDb(uid);
    cacheSet(ck, data);
    return data;
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem("shiguangji-profile", JSON.stringify(profile));
  const uid = getUserId();
  if (uid) cacheSet(`profile:${uid}`, profile);
  sync((uid) => import("./db").then((m) => m.syncProfileToDb(uid, profile)));
}

// ========== 每日目标范围 ==========

export async function loadTargets(): Promise<DailyTargetRange | null> {
  const uid = getUserId();
  if (!uid) return null;
  const ck = `targets:${uid}`;
  const cached = cacheGet<DailyTargetRange | null>(ck);
  if (cached !== undefined) return cached;
  try {
    const { loadTargetsFromDb } = await import("./db");
    const data = await loadTargetsFromDb(uid);
    cacheSet(ck, data);
    return data;
  } catch {
    return null;
  }
}

export function saveTargets(targets: DailyTargetRange): void {
  localStorage.setItem("shiguangji-targets", JSON.stringify(targets));
  const uid = getUserId();
  if (uid) cacheSet(`targets:${uid}`, targets);
  sync((uid) => import("./db").then((m) => m.syncTargetsToDb(uid, targets)));
}

// ========== 餐记录 ==========

export function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function loadMeals(): Promise<MealRecord[]> {
  const uid = getUserId();
  if (!uid) return [];
  const ck = `meals:${uid}`;
  const cached = cacheGet<MealRecord[]>(ck);
  if (cached) return cached;
  try {
    const { loadMealsFromDb } = await import("./db");
    const data = await loadMealsFromDb(uid);
    cacheSet(ck, data);
    return data;
  } catch {
    return [];
  }
}

export async function loadTodayMeals(): Promise<MealRecord[]> {
  const today = getTodayKey();
  return (await loadMeals()).filter((m) => m.date === today);
}

export async function loadMealsByDateRange(startDate: string, endDate: string): Promise<MealRecord[]> {
  const uid = getUserId();
  if (!uid) return [];
  try {
    const { loadMealsByDateRangeFromDb } = await import("./db");
    return await loadMealsByDateRangeFromDb(uid, startDate, endDate);
  } catch {
    return [];
  }
}

export function saveMeal(record: MealRecord): void {
  const uid = getUserId();
  if (uid) cacheDel(`meals:${uid}`);
  sync((uid) => import("./db").then((m) => m.syncMealToDb(uid, record)));
}

export function deleteMeal(id: string): void {
  const uid = getUserId();
  if (uid) cacheDel(`meals:${uid}`);
  sync(() => import("./db").then((m) => m.deleteMealFromDb(id)));
}

export function deleteMeals(ids: string[]): void {
  const uid = getUserId();
  if (uid) cacheDel(`meals:${uid}`);
  sync(() => import("./db").then((m) => m.deleteMealsFromDb(ids)));
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

export async function loadDailySummaryCache(date: string): Promise<CachedDailySummary | null> {
  const uid = getUserId();
  if (!uid) return null;
  try {
    const { loadDailySummaryFromDb } = await import("./db");
    const result = await loadDailySummaryFromDb(uid, date);
    if (result) return { date, fingerprint: result.fingerprint, summary: result.summary };
  } catch { /* fall through */ }
  return null;
}

export function saveDailySummaryCache(
  date: string,
  fingerprint: string,
  summary: DailySummaryResponse,
): void {
  sync((uid) => import("./db").then((m) => m.syncDailySummaryToDb(uid, date, fingerprint, summary)));
}

// ========== 长期记忆 ==========

export async function loadMemory(): Promise<MemoryEntry[]> {
  const uid = getUserId();
  if (!uid) return [];
  const ck = `memory:${uid}`;
  const cached = cacheGet<MemoryEntry[]>(ck);
  if (cached) return cached;
  try {
    const { loadMemoryFromDb } = await import("./db");
    const data = await loadMemoryFromDb(uid);
    cacheSet(ck, data);
    return data;
  } catch {
    return [];
  }
}

export function saveMemory(entries: MemoryEntry[]): void {
  const uid = getUserId();
  if (uid) cacheSet(`memory:${uid}`, entries);
  sync((uid) => import("./db").then((m) => m.syncMemoryToDb(uid, entries)));
}

export function addMemoryEntry(entry: MemoryEntry): void {
  loadMemory().then((entries) => {
    const idx = entries.findIndex((e) => e.field === entry.field && e.value === entry.value);
    if (idx >= 0) entries[idx] = entry;
    else entries.push(entry);
    saveMemory(entries);
  });
}

export function deleteMemoryEntry(field: string, value: string): void {
  loadMemory().then((entries) => {
    const filtered = entries.filter((e) => !(e.field === field && e.value === value));
    saveMemory(filtered);
  });
}

// ========== 主动触达设置 ==========

export async function loadProactiveConfig(): Promise<ProactiveConfig> {
  const uid = getUserId();
  if (!uid) return { daily_limit: 2, quiet_start: "22:00", quiet_end: "08:00", master_switch: true };
  const ck = `pconfig:${uid}`;
  const cached = cacheGet<ProactiveConfig>(ck);
  if (cached) return cached;
  try {
    const { loadProactiveConfigFromDb } = await import("./db");
    const data = await loadProactiveConfigFromDb(uid);
    cacheSet(ck, data);
    return data;
  } catch {
    return { daily_limit: 2, quiet_start: "22:00", quiet_end: "08:00", master_switch: true };
  }
}

export function saveProactiveConfig(config: ProactiveConfig): void {
  const uid = getUserId();
  if (uid) cacheSet(`pconfig:${uid}`, config);
  sync((uid) => import("./db").then((m) => m.syncProactiveConfigToDb(uid, config)));
}

// ========== 主动触达记录 ==========

export async function loadProactiveLogs(): Promise<ProactiveLog[]> {
  const uid = getUserId();
  if (!uid) return [];
  const ck = `plogs:${uid}`;
  const cached = cacheGet<ProactiveLog[]>(ck);
  if (cached) return cached;
  try {
    const { loadProactiveLogsFromDb } = await import("./db");
    const data = await loadProactiveLogsFromDb(uid);
    cacheSet(ck, data);
    return data;
  } catch {
    return [];
  }
}

export function saveProactiveLog(log: ProactiveLog): void {
  const uid = getUserId();
  if (uid) cacheDel(`plogs:${uid}`);
  sync((uid) => import("./db").then((m) => m.syncProactiveLogToDb(uid, log)));
}

export function dismissProactiveLog(id: string): void {
  const uid = getUserId();
  if (uid) cacheDel(`plogs:${uid}`);
  sync(() => import("./db").then((m) => m.dismissProactiveLogInDb(id)));
}

// ========== AI 助手对话 ==========

export async function loadConversations(): Promise<Conversation[]> {
  const uid = getUserId();
  if (!uid) return [];
  const ck = `convos:${uid}`;
  const cached = cacheGet<Conversation[]>(ck);
  if (cached) return cached;
  try {
    const { loadConversationsFromDb } = await import("./db");
    const data = await loadConversationsFromDb(uid);
    cacheSet(ck, data);
    return data;
  } catch {
    return [];
  }
}

export function saveConversation(conv: Conversation): void {
  const uid = getUserId();
  if (uid) cacheDel(`convos:${uid}`);
  sync((uid) => import("./db").then((m) => m.syncConversationToDb(uid, conv)).catch((e) => {
    console.error("[storage] saveConversation failed:", e instanceof Error ? e.message : String(e));
  }));
}

export async function loadConversation(id: string): Promise<Conversation | null> {
  return (await loadConversations()).find((c) => c.id === id) ?? null;
}

export async function getTodayConversation(): Promise<Conversation | null> {
  const today = getTodayKey();
  return (await loadConversations()).find((c) => c.date === today) ?? null;
}

// ========== 每周总结缓存 ==========

interface CachedWeeklySummary {
  weekStart: string;
  fingerprint: string;
  summary: import("./types").WeeklyAnalysisResponse;
}

export async function loadWeeklySummaryCache(weekStart: string): Promise<CachedWeeklySummary | null> {
  const uid = getUserId();
  if (!uid) return null;
  try {
    const { loadWeeklySummaryFromDb } = await import("./db");
    const result = await loadWeeklySummaryFromDb(uid, weekStart);
    if (result) return { weekStart, fingerprint: result.fingerprint, summary: result.summary };
  } catch { /* fall through */ }
  return null;
}

export function saveWeeklySummaryCache(
  weekStart: string,
  fingerprint: string,
  summary: import("./types").WeeklyAnalysisResponse,
): void {
  sync((uid) => import("./db").then((m) => m.syncWeeklySummaryToDb(uid, weekStart, fingerprint, summary)));
}

// ========== 评分同步 ==========

export function syncMealRating(mealId: string, rating: boolean): void {
  import("./db").then((m) => m.updateMealRating(mealId, rating)).catch(() => {});
}

export function syncDailyRating(date: string, rating: boolean): void {
  sync((uid) => import("./db").then((m) => m.syncDailyRating(uid, date, rating)));
}

export function syncWeeklyRating(weekStart: string, rating: boolean): void {
  sync((uid) => import("./db").then((m) => m.syncWeeklyRating(uid, weekStart, rating)));
}

export function syncGoalAdoption(weekStart: string): void {
  sync((uid) => import("./db").then((m) => m.syncGoalAdoption(uid, weekStart)));
}

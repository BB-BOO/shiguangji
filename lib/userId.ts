import { supabase } from "./supabase";

export async function getOrCreateUserId(): Promise<string> {
  if (typeof window === "undefined") return "";

  const stored = localStorage.getItem("shiguangji-user-id");
  if (stored) return stored;

  // 首次访问：在 Supabase 创建用户
  const { data } = await supabase
    .from("users")
    .insert({})
    .select("id")
    .single();

  if (data) {
    localStorage.setItem("shiguangji-user-id", data.id);
    return data.id;
  }

  // 兜底
  const fallback = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem("shiguangji-user-id", fallback);
  return fallback;
}

const KEY = "shiguangji-user-id";

export function getStoredUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function setStoredUserId(id: string): void {
  localStorage.setItem(KEY, id);
}

export function clearStoredUserId(): void {
  localStorage.removeItem(KEY);
}

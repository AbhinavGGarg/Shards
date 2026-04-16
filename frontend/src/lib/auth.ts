export const SHARDS_AUTH_SESSION_KEY = "shards-auth-session-v1";
export const SHARDS_USER_KEY = "shards-user-v1";

export type ShardsSession = {
  email: string;
  name: string;
  role: "owner" | "analyst" | "viewer";
  loginAt: string;
};

export function readSession(): ShardsSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SHARDS_AUTH_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ShardsSession;
    if (!parsed?.email || !parsed?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(session: ShardsSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SHARDS_AUTH_SESSION_KEY, JSON.stringify(session));
  window.localStorage.setItem(SHARDS_USER_KEY, session.name);
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SHARDS_AUTH_SESSION_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(readSession());
}

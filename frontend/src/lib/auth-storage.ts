import type { AuthUser } from "@/lib/types";

const AUTH_KEY = "pharmacie-malik-beniddir-auth";
const AUTH_CHANGE_EVENT = "pharmacie-malik-beniddir-auth-change";

type AuthSession = {
  token: string;
  user: AuthUser;
};

export function getAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function setAuthSession(token: string, user: AuthUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_KEY, JSON.stringify({ token, user }));
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function getAuthChangeEventName() {
  return AUTH_CHANGE_EVENT;
}

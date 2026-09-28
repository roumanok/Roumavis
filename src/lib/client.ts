export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const value = await response.json();
  if (!response.ok)
    throw new Error(value.error ?? "No pudimos completar la operación.");
  return value as T;
}
export const KEY = "roumavis:v1:";
export function loadLocal<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(KEY + key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}
export function saveLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(KEY + key, JSON.stringify(value));
  } catch {
    /* Private mode/full storage: keep the current session usable. */
  }
}

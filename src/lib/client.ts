export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: init?.signal ?? AbortSignal.timeout(45_000),
    });
  } catch {
    throw new Error(
      "No hubo respuesta. Revisá la conexión e intentá otra vez.",
    );
  }
  const value = await response.json().catch(() => ({}));
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
/**
 * If the admin reset the experience since this device last synced, forget all
 * local progress (story, survey draft…) so it starts from scratch.
 */
export async function syncReset() {
  try {
    const { resetAt } = await api<{ resetAt: string | null }>("/api/reset");
    if (!resetAt || loadLocal<string | null>("reset-at", null) === resetAt)
      return;
    Object.keys(localStorage)
      .filter((key) => key.startsWith(KEY))
      .forEach((key) => localStorage.removeItem(key));
    saveLocal("reset-at", resetAt);
  } catch {
    /* Offline or no storage: keep whatever progress exists. */
  }
}

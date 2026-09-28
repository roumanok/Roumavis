import { createHmac, timingSafeEqual } from "node:crypto";
export type Role = "admin" | "guest";
function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32)
    throw new Error("SESSION_SECRET must have at least 32 characters");
  return value;
}
export function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function sign(role: Role, now = Date.now()) {
  const payload = `${role}.${now + (role === "admin" ? 8 * 3600 : 60 * 86400) * 1000}`;
  return `${payload}.${createHmac("sha256", secret()).update(payload).digest("base64url")}`;
}
export function verify(
  token: string | undefined,
  role: Role,
  now = Date.now(),
) {
  if (!token) return false;
  try {
    const [claimed, expires, signature, extra] = token.split(".");
    if (
      extra ||
      claimed !== role ||
      !/^\d+$/.test(expires) ||
      Number(expires) <= now
    )
      return false;
    return equal(
      signature ?? "",
      createHmac("sha256", secret())
        .update(`${claimed}.${expires}`)
        .digest("base64url"),
    );
  } catch {
    return false;
  }
}

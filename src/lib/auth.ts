import "server-only";
import { cookies } from "next/headers";
import { sign, verify, type Role } from "./session";
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};
export async function authenticated(role: Role = "guest") {
  const jar = await cookies();
  return (
    verify(jar.get("roumavis-admin")?.value, "admin") ||
    (role === "guest" && verify(jar.get("roumavis-guest")?.value, "guest"))
  );
}
export async function setSession(role: Role) {
  (await cookies()).set(`roumavis-${role}`, sign(role), {
    ...cookieOptions,
    // QR links may arrive from another app/site; allow the top-level redirect.
    sameSite: role === "guest" ? "lax" : "strict",
    maxAge: role === "admin" ? 8 * 3600 : 60 * 86400,
  });
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function authorize(request: Request, role: Role = "guest") {
  if (!(await authenticated(role)))
    throw new HttpError(401, "Abrí el enlace de tu tarjeta para continuar.");
  if (!["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin)
      throw new HttpError(403, "No pudimos verificar esta solicitud.");
  }
}

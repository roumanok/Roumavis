import { NextResponse } from "next/server";
import { equal } from "@/lib/session";
import { setSession } from "@/lib/auth";
export async function GET(request: Request) {
  const url = new URL(request.url),
    key = url.searchParams.get("k") ?? "";
  const expected = process.env.EXPERIENCE_KEY;
  if (!expected || expected.length < 32 || !equal(key, expected))
    return new Response("Este enlace no está disponible.", {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  await setSession("guest");
  const requested = url.searchParams.get("destino") ?? "/";
  const path = [
    "/",
    "/vista",
    "/cama",
    "/mesita",
    "/encuesta",
    "/trivia",
  ].includes(requested)
    ? requested
    : "/";
  const response = NextResponse.redirect(new URL(path, url.origin), 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

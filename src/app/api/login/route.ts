import { equal } from "@/lib/session";
import { setSession, HttpError } from "@/lib/auth";
import { endpoint, json, limitedJSON } from "@/lib/http";
import { z } from "zod";
export async function POST(request: Request) {
  return endpoint(async () => {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      throw new HttpError(403, "Solicitud inválida.");
    const { password } = z
      .object({ password: z.string().max(512) })
      .parse(await limitedJSON(request));
    if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 16)
      throw new HttpError(503, "Falta configurar el acceso de administración.");
    if (!equal(password, process.env.ADMIN_PASSWORD)) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      throw new HttpError(401, "La contraseña no es correcta.");
    }
    await setSession("admin");
    return json({ ok: true });
  });
}

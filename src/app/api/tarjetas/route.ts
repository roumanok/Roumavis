import { authorize, HttpError } from "@/lib/auth";
import { endpoint, json } from "@/lib/http";
export const dynamic = "force-dynamic";
/** Static QR links for the printed cards (admin only: they carry the key). */
export async function GET(request: Request) {
  return endpoint(async () => {
    await authorize(request, "admin");
    const key = process.env.EXPERIENCE_KEY;
    if (!key) throw new HttpError(500, "Falta configurar EXPERIENCE_KEY.");
    const origin = new URL(request.url).origin;
    const link = (destino: string) =>
      `${origin}/acceso?k=${encodeURIComponent(key)}&destino=${encodeURIComponent(destino)}`;
    return json({
      cards: [
        { id: "cama", label: "Cama (bombones)", url: link("/cama") },
        { id: "historia", label: "Auto (nuestra historia)", url: link("/") },
        { id: "vista", label: "Ventana (la vista)", url: link("/vista") },
        {
          id: "encuesta",
          label: "Estrella (encuesta)",
          url: link("/encuesta"),
        },
        { id: "mesita", label: "Lámpara (mesita)", url: link("/mesita") },
        {
          id: "trivia",
          label: "Signo de pregunta (trivia)",
          url: link("/trivia"),
        },
      ],
    });
  });
}

import sharp from "sharp";
import { authorize, HttpError } from "@/lib/auth";
import { endpoint, json, noStore } from "@/lib/http";
import { slotSchema } from "@/lib/models";
import { readBlob, momentPath, writeMoment, deleteMoment } from "@/lib/storage";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ slot: string }> };
export async function GET(request: Request, { params }: Context) {
  return endpoint(async () => {
    await authorize(request);
    const slot = slotSchema.parse((await params).slot);
    const blob = await readBlob(momentPath(slot));
    if (new URL(request.url).searchParams.has("info")) {
      await blob?.stream?.cancel();
      return json({ exists: !!blob, version: blob?.blob.etag ?? null });
    }
    if (!blob || !blob.stream)
      return json({ error: "Todavía no hay una foto." }, 404);
    return new Response(blob.stream, {
      headers: { ...noStore, "Content-Type": "image/jpeg" },
    });
  });
}
export async function PUT(request: Request, { params }: Context) {
  return endpoint(async () => {
    await authorize(request);
    const slot = slotSchema.parse((await params).slot);
    if (Number(request.headers.get("content-length") ?? 0) > 4_000_000)
      throw new HttpError(413, "La foto es demasiado grande.");
    const form = await request.formData();
    const file = form.get("photo");
    if (!(file instanceof File) || file.size > 3_500_000 || file.size === 0)
      throw new HttpError(400, "Elegí una foto más pequeña.");
    const version = form.get("version");
    let data: Buffer;
    try {
      data = await sharp(Buffer.from(await file.arrayBuffer()), {
        limitInputPixels: 40_000_000,
      })
        .rotate()
        .resize({
          width: 1800,
          height: 1800,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 86 })
        .toBuffer();
    } catch {
      throw new HttpError(
        400,
        "No pudimos abrir esa foto. Probá con una imagen JPG o PNG.",
      );
    }
    return json({
      exists: true,
      version: await writeMoment(
        slot,
        data,
        typeof version === "string" && version ? version : null,
      ),
    });
  });
}
export async function DELETE(request: Request, { params }: Context) {
  return endpoint(async () => {
    await authorize(request, "admin");
    const slot = slotSchema.parse((await params).slot);
    await deleteMoment(slot, request.headers.get("if-match") ?? "");
    return json({ exists: false, version: null });
  });
}

import "server-only";
import sharp from "sharp";
import { HttpError } from "./auth";
/** Validates an uploaded photo and re-encodes it as a clean JPEG (no metadata). */
export async function readUploadedPhoto(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 4_000_000)
    throw new HttpError(413, "La foto es demasiado grande.");
  const form = await request.formData();
  const file = form.get("photo");
  if (!(file instanceof File) || file.size > 3_500_000 || file.size === 0)
    throw new HttpError(400, "Elegí una foto más pequeña.");
  const version = form.get("version");
  try {
    const data = await sharp(Buffer.from(await file.arrayBuffer()), {
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
    return {
      data,
      version: typeof version === "string" && version ? version : null,
    };
  } catch {
    throw new HttpError(
      400,
      "No pudimos abrir esa foto. Probá con una imagen JPG o PNG.",
    );
  }
}

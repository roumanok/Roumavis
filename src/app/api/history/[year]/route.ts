import { authorize } from "@/lib/auth";
import { endpoint, json } from "@/lib/http";
import { readUploadedPhoto } from "@/lib/image";
import { staticPhotoPath, yearSchema } from "@/lib/models";
import { deleteImage, historyPath, readBlob, writeImage } from "@/lib/storage";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ year: string }> };
/** Uploaded history photo (private Blob); falls back to the static file. */
export async function GET(request: Request, { params }: Context) {
  return endpoint(async () => {
    await authorize(request);
    const year = yearSchema.parse((await params).year);
    const url = new URL(request.url);
    const blob = await readBlob(historyPath(year));
    if (url.searchParams.has("info")) {
      await blob?.stream?.cancel();
      return json({ exists: !!blob, version: blob?.blob.etag ?? null });
    }
    if (!blob || !blob.stream)
      return Response.redirect(new URL(staticPhotoPath(year), url.origin), 302);
    return new Response(blob.stream, {
      headers: {
        // Versioned URLs (?v=) from the admin bust this short private cache.
        "Cache-Control": url.searchParams.has("v")
          ? "private, max-age=31536000, immutable"
          : "private, max-age=300",
        "Content-Type": "image/jpeg",
      },
    });
  });
}
export async function PUT(request: Request, { params }: Context) {
  return endpoint(async () => {
    await authorize(request, "admin");
    const year = yearSchema.parse((await params).year);
    const { data } = await readUploadedPhoto(request);
    return json({
      exists: true,
      version: await writeImage(historyPath(year), data),
    });
  });
}
export async function DELETE(request: Request, { params }: Context) {
  return endpoint(async () => {
    await authorize(request, "admin");
    const year = yearSchema.parse((await params).year);
    await deleteImage(historyPath(year));
    return json({ exists: false, version: null }, 200);
  });
}

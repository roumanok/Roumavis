import { authorize } from "@/lib/auth";
import { readUploadedPhoto } from "@/lib/image";
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
    const { data } = await readUploadedPhoto(request);
    return json({
      exists: true,
      version: await writeMoment(slot, data),
    });
  });
}
export async function DELETE(request: Request, { params }: Context) {
  return endpoint(async () => {
    await authorize(request, "admin");
    const slot = slotSchema.parse((await params).slot);
    await deleteMoment(slot);
    return json({ exists: false, version: null });
  });
}

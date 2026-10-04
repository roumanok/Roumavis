import { authorize } from "@/lib/auth";
import { endpoint, json } from "@/lib/http";
import { readUploadedPhoto } from "@/lib/image";
import { triviaIdSchema } from "@/lib/models";
import {
  deleteImage,
  readBlob,
  triviaBlobPath,
  writeImage,
} from "@/lib/storage";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
/** Photo for a trivia question (by id) or the prize ("premio"). */
export async function GET(request: Request, { params }: Context) {
  return endpoint(async () => {
    await authorize(request);
    const id = triviaIdSchema.parse((await params).id);
    const blob = await readBlob(triviaBlobPath(id));
    if (!blob || !blob.stream)
      return json({ error: "Todavía no hay una foto." }, 404);
    return new Response(blob.stream, {
      headers: {
        "Cache-Control": new URL(request.url).searchParams.has("v")
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
    const id = triviaIdSchema.parse((await params).id);
    const { data } = await readUploadedPhoto(request);
    return json({ version: await writeImage(triviaBlobPath(id), data) });
  });
}
export async function DELETE(request: Request, { params }: Context) {
  return endpoint(async () => {
    await authorize(request, "admin");
    const id = triviaIdSchema.parse((await params).id);
    await deleteImage(triviaBlobPath(id));
    return json({ ok: true });
  });
}

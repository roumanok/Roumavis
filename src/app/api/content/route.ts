import { authorize } from "@/lib/auth";
import { endpoint, json, limitedJSON } from "@/lib/http";
import { contentSchema } from "@/lib/models";
import { readContent, writeJSON } from "@/lib/storage";
import { z } from "zod";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return endpoint(async () => {
    await authorize(request);
    return json(await readContent());
  });
}
export async function PUT(request: Request) {
  return endpoint(async () => {
    await authorize(request, "admin");
    const body = z
      .object({ content: contentSchema, version: z.string().nullable() })
      .parse(await limitedJSON(request));
    return json({
      version: await writeJSON(
        "data/contenido.json",
        body.content,
        body.version,
      ),
    });
  });
}

import { authorize } from "@/lib/auth";
import { endpoint, json, limitedJSON } from "@/lib/http";
import { triviaResultSchema } from "@/lib/models";
import { writeJSON } from "@/lib/storage";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return endpoint(async () => {
    await authorize(request);
    const result = triviaResultSchema.parse(await limitedJSON(request));
    await writeJSON(
      "data/trivia-resultado.json",
      { ...result, finishedAt: new Date().toISOString() },
      true,
    );
    return json({ ok: true });
  });
}

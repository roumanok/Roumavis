import { authenticated, authorize } from "@/lib/auth";
import { endpoint, json, limitedJSON } from "@/lib/http";
import { triviaSchema } from "@/lib/models";
import { readTrivia, readTriviaResult, writeJSON } from "@/lib/storage";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return endpoint(async () => {
    await authorize(request);
    const [trivia, result] = await Promise.all([
      readTrivia(),
      readTriviaResult(),
    ]);
    return json({
      trivia,
      // Only the admin sees how she did.
      result: (await authenticated("admin"))
        ? (result?.data ?? null)
        : undefined,
    });
  });
}
export async function PUT(request: Request) {
  return endpoint(async () => {
    await authorize(request, "admin");
    const trivia = triviaSchema.parse(await limitedJSON(request));
    for (const q of trivia.questions)
      if (q.correct >= q.options.length) q.correct = 0;
    await writeJSON("data/trivia.json", trivia, true);
    return json({ ok: true });
  });
}

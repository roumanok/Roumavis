import { authorize, authenticated } from "@/lib/auth";
import { endpoint, json, limitedJSON } from "@/lib/http";
import { surveySchema } from "@/lib/models";
import { readSurvey, writeJSON } from "@/lib/storage";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return endpoint(async () => {
    await authorize(request);
    const existing = await readSurvey();
    return json({
      submitted: !!existing,
      survey: (await authenticated("admin"))
        ? (existing?.data ?? null)
        : undefined,
    });
  });
}
export async function POST(request: Request) {
  return endpoint(async () => {
    await authorize(request);
    const data = surveySchema.parse(await limitedJSON(request));
    const existing = await readSurvey();
    if (existing) return json({ submitted: true });
    try {
      await writeJSON(
        "data/encuesta.json",
        { ...data, submittedAt: new Date().toISOString() },
        null,
      );
    } catch (error) {
      if (!(await readSurvey())) throw error;
    }
    return json({ submitted: true });
  });
}

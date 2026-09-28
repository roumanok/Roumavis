import { z } from "zod";
import { authorize } from "@/lib/auth";
import { endpoint, json, limitedJSON } from "@/lib/http";
import { readResetAt, resetExperience } from "@/lib/storage";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return endpoint(async () => {
    await authorize(request);
    return json({ resetAt: await readResetAt() });
  });
}
export async function POST(request: Request) {
  return endpoint(async () => {
    await authorize(request, "admin");
    const { includeContent } = z
      .object({ includeContent: z.boolean().default(false) })
      .parse(await limitedJSON(request));
    return json({ resetAt: await resetExperience(includeContent) });
  });
}

import { z } from "zod";
import { authorize } from "@/lib/auth";
import { endpoint, json, limitedJSON } from "@/lib/http";
import { resetScopes } from "@/lib/models";
import { readResetInfo, resetExperience, resetOne } from "@/lib/storage";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return endpoint(async () => {
    await authorize(request);
    return json(await readResetInfo());
  });
}
/** Whole experience reset, or a single one with { scope }. */
export async function POST(request: Request) {
  return endpoint(async () => {
    await authorize(request, "admin");
    const body = z
      .object({
        includeContent: z.boolean().default(false),
        scope: z.enum(resetScopes).optional(),
      })
      .parse(await limitedJSON(request));
    if (body.scope) return json(await resetOne(body.scope));
    return json({ resetAt: await resetExperience(body.includeContent) });
  });
}

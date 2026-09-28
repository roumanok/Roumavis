import { cookies } from "next/headers";
import { authorize, cookieOptions } from "@/lib/auth";
import { endpoint, json } from "@/lib/http";
export async function POST(request: Request) {
  return endpoint(async () => {
    await authorize(request, "admin");
    (await cookies()).set("roumavis-admin", "", {
      ...cookieOptions,
      maxAge: 0,
    });
    return json({ ok: true });
  });
}

import { ZodError } from "zod";
import { HttpError } from "./auth";
export const noStore = { "Cache-Control": "private, no-store, max-age=0" };
export const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: noStore });
export async function endpoint(action: () => Promise<Response>) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof HttpError)
      return json({ error: error.message }, error.status);
    if (error instanceof ZodError || error instanceof SyntaxError)
      return json({ error: "Revisá los datos e intentá otra vez." }, 400);
    if (error instanceof Error && /Precondition|AlreadyExists/.test(error.name))
      return json(
        {
          error:
            "Hubo un cambio desde otro dispositivo. Volvé a cargar antes de guardar.",
        },
        409,
      );
    // Never return provider errors or credentials to the browser.
    console.error(
      "Roumavis request failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return json(
      {
        error:
          "No pudimos guardar o cargar este momento. Intentá otra vez en un ratito.",
      },
      503,
    );
  }
}
export async function limitedJSON(request: Request) {
  const text = await request.text();
  if (text.length > 100_000)
    throw new HttpError(413, "El texto es demasiado largo.");
  return JSON.parse(text);
}

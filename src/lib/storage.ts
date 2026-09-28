import "server-only";
import { get, put, del } from "@vercel/blob";
import { z } from "zod";
import {
  defaults,
  contentSchema,
  type MomentSlot,
  surveySchema,
} from "./models";
import { HttpError } from "./auth";
export const readBlob = (path: string) =>
  get(path, { access: "private", useCache: false });
export async function readJSON<T>(path: string, schema: z.ZodType<T>) {
  const result = await readBlob(path);
  if (!result) return null;
  if (result.statusCode !== 200 || !result.stream)
    throw new Error("Unexpected Blob response");
  const data = schema.parse(await new Response(result.stream).json());
  return { data, version: result.blob.etag };
}
export async function writeJSON(
  path: string,
  value: unknown,
  version: string | null,
) {
  const result = await put(path, JSON.stringify(value), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: version !== null,
    ...(version ? { ifMatch: version } : {}),
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
  return result.etag;
}
export async function readContent() {
  const value = await readJSON("data/contenido.json", contentSchema);
  return { content: value?.data ?? defaults, version: value?.version ?? null };
}
export const readSurvey = () =>
  readJSON(
    "data/encuesta.json",
    surveySchema.extend({ submittedAt: z.string().datetime() }),
  );
export const momentPath = (slot: MomentSlot) => `momentos/${slot}.jpg`;
export async function writeMoment(
  slot: MomentSlot,
  data: Buffer,
  version: string | null,
) {
  const result = await put(momentPath(slot), data, {
    access: "private",
    contentType: "image/jpeg",
    addRandomSuffix: false,
    allowOverwrite: version !== null,
    ...(version ? { ifMatch: version } : {}),
    cacheControlMaxAge: 60,
  });
  return result.etag;
}
export async function deleteMoment(slot: MomentSlot, version: string) {
  if (!version)
    throw new HttpError(400, "Actualizá la página antes de eliminar.");
  await del(momentPath(slot), { ifMatch: version });
}

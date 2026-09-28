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
export const historyPath = (year: number) => `historia/${year}.jpg`;
export const writeMoment = (
  slot: MomentSlot,
  data: Buffer,
  version: string | null,
) => writeImage(momentPath(slot), data, version);
export async function writeImage(
  path: string,
  data: Buffer,
  version: string | null,
) {
  const result = await put(path, data, {
    access: "private",
    contentType: "image/jpeg",
    addRandomSuffix: false,
    allowOverwrite: version !== null,
    ...(version ? { ifMatch: version } : {}),
    cacheControlMaxAge: 60,
  });
  return result.etag;
}
export const deleteMoment = (slot: MomentSlot, version: string) =>
  deleteImage(momentPath(slot), version);
export async function deleteImage(path: string, version: string) {
  if (!version)
    throw new HttpError(400, "Actualizá la página antes de eliminar.");
  await del(path, { ifMatch: version });
}
const resetSchema = z.object({ resetAt: z.string() });
export async function readResetAt() {
  return (await readJSON("data/reset.json", resetSchema))?.data.resetAt ?? null;
}
/**
 * Deletes every guest-generated piece of data (photos + survey) and, when
 * asked, the editable texts. Writes a new reset marker so devices clear their
 * local progress on the next visit.
 */
export async function resetExperience(includeContent: boolean) {
  const paths = [
    ...(["historia", "vista", "cama", "mesita", "encuesta"] as const).map(
      momentPath,
    ),
    "data/encuesta.json",
    ...(includeContent ? ["data/contenido.json"] : []),
  ];
  await del(paths);
  const resetAt = new Date().toISOString();
  await put("data/reset.json", JSON.stringify({ resetAt }), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
  return resetAt;
}

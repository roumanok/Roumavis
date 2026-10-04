import "server-only";
import { get, put, del } from "@vercel/blob";
import { z } from "zod";
import {
  defaults,
  contentSchema,
  type MomentSlot,
  slots,
  surveySchema,
  triviaDefaults,
  triviaResultSchema,
  triviaSchema,
} from "./models";
// The SDK retries "unknown" errors up to 10 times with exponential backoff,
// which can leave a request hanging for minutes. Fail fast instead.
process.env.VERCEL_BLOB_RETRIES ??= "2";
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
/**
 * Writes JSON. `overwrite: false` only creates (used for the one-time survey).
 * No ETag preconditions: there is a single admin, and ETags read via get()
 * don't reliably match what put() expects (saves would hang retrying).
 */
export async function writeJSON(
  path: string,
  value: unknown,
  overwrite: boolean,
) {
  const result = await put(path, JSON.stringify(value), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: overwrite,
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
export const writeMoment = (slot: MomentSlot, data: Buffer) =>
  writeImage(momentPath(slot), data);
export async function writeImage(path: string, data: Buffer) {
  const result = await put(path, data, {
    access: "private",
    contentType: "image/jpeg",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });
  return result.etag;
}
export const deleteMoment = (slot: MomentSlot) => deleteImage(momentPath(slot));
export async function deleteImage(path: string) {
  await del(path);
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
    ...slots.map(momentPath),
    "data/encuesta.json",
    "data/trivia-resultado.json",
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

/* ---------- Trivia ---------- */
export const triviaBlobPath = (id: string) => `trivia/${id}.jpg`;
export async function readTrivia() {
  return (
    (await readJSON("data/trivia.json", triviaSchema))?.data ?? triviaDefaults
  );
}
export const readTriviaResult = () =>
  readJSON(
    "data/trivia-resultado.json",
    triviaResultSchema.extend({ finishedAt: z.string().datetime() }),
  );

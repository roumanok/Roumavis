import { z } from "zod";
export const slots = [
  "historia",
  "vista",
  "cama",
  "mesita",
  "trivia",
  "encuesta",
] as const;
export type MomentSlot = (typeof slots)[number];
export const slotSchema = z.enum(slots);
export const labels: Record<MomentSlot, string> = {
  historia: "El comienzo",
  vista: "La vista",
  cama: "Nuestro momento",
  mesita: "Buen día ❤️",
  trivia: "Nuestra trivia",
  encuesta: "Y así terminamos...",
};
export const questions = [
  "A nivel general, ¿cómo calificarías el finde juntos?",
  "¿Cómo calificarías el lugar y la habitación?",
  "¿Cómo calificarías la comida del lugar?",
  "¿Qué tan rico estaba el vino?",
  "¿Qué tanto disfrutaste los bombones?",
  "¿Cómo calificarías a tu compañero de escapada?",
  "¿Qué tal estuvieron los mimos, besos, etc.?",
  "¿Qué tanto te desconectaste?",
  "¿Cómo calificarías las sorpresas y todo esto?",
] as const;
export const repeats = [
  "SÍ",
  "DEFINITIVAMENTE SÍ",
  "NO PUEDO ESPERAR",
] as const;
export const contentSchema = z.object({
  history: z
    .array(
      z.object({
        year: z.number().int().min(2004).max(2025),
        caption: z.string().max(1500),
      }),
    )
    .length(22)
    .refine((entries) => entries.every((e, i) => e.year === 2004 + i)),
  vista: z.object({ text: z.string().max(3000) }),
  cama: z.object({ text: z.string().max(3000) }),
  mesita: z.object({ text: z.string().max(3000) }),
});
export type EditableContent = z.infer<typeof contentSchema>;
export const defaults: EditableContent = {
  history: Array.from({ length: 22 }, (_, i) => ({
    year: 2004 + i,
    caption: "",
  })),
  vista: {
    text: "¿Ya viste la vista que tenemos?\n\nRevisá “por las dudas”....",
  },
  cama: {
    text: "Yo ya encontré mi bombón...\nahora vos encontrá los que traje para compartir ❤️",
  },
  mesita: {
    text: "Buen día hermosa... ❤️\n\nhoy no hay nada para hacer, sólo estar juntos.\n\nQué lindo plan, ¿no?",
  },
};
export const surveySchema = z.object({
  id: z.string().uuid(),
  ratings: z.array(z.number().int().min(1).max(5)).length(9),
  repeatTrip: z.enum(repeats),
  favorite: z.string().max(5000),
  missed: z.string().max(5000),
  message: z.string().max(5000),
});
export type SurveyInput = z.infer<typeof surveySchema>;
export type Survey = SurveyInput & { submittedAt: string };
export type ContentResponse = {
  content: EditableContent;
  version: string | null;
};
export type MomentInfo = { exists: boolean; version: string | null };
/** Static fallback bundled in /public (used when no photo was uploaded). */
export const staticPhotoPath = (year: number) =>
  `/historia/foto-${year - 2003}.png`;
/** Photo for a history year: uploaded (private Blob) or static fallback. */
export const photoPath = (year: number, version?: string | null) =>
  `/api/history/${year}${version ? `?v=${encodeURIComponent(version)}` : ""}`;
export const yearSchema = z.coerce.number().int().min(2004).max(2025);

/* ---------- Trivia ---------- */
export const triviaIdSchema = z
  .string()
  .regex(/^[a-z0-9-]{1,40}$/, "Identificador inválido");
export const triviaQuestionSchema = z.object({
  id: triviaIdSchema,
  text: z.string().max(1000),
  image: z.boolean(),
  options: z.array(z.string().max(300)).min(2).max(5),
  correct: z.number().int().min(0).max(4),
});
export const triviaSchema = z.object({
  questions: z.array(triviaQuestionSchema).max(40),
  prize: z.object({
    title: z.string().max(200),
    text: z.string().max(3000),
    image: z.boolean(),
  }),
  phrases: z.object({
    perfect: z.string().max(500),
    high: z.string().max(500),
    mid: z.string().max(500),
    low: z.string().max(500),
  }),
});
export type TriviaQuestion = z.infer<typeof triviaQuestionSchema>;
export type Trivia = z.infer<typeof triviaSchema>;
export const triviaDefaults: Trivia = {
  questions: [],
  prize: { title: "Tu premio", text: "", image: false },
  phrases: {
    perfect: "¡Perfecto! Me conocés más que nadie ❤️",
    high: "¡Casi perfecto! Se nota que estuviste atenta…",
    mid: "Nada mal… pero vamos a tener que repasar algunas cosas 😉",
    low: "Bueno… lo importante es que estamos juntos 😂",
  },
};
export const triviaResultSchema = z.object({
  answers: z.array(z.number().int().min(0).max(4)).max(40),
  score: z.number().int().min(0),
  total: z.number().int().min(0),
});
export type TriviaResult = z.infer<typeof triviaResultSchema> & {
  finishedAt: string;
};
/** Final phrase for a score: all right, ≥ 70 %, ≥ 40 %, or below. */
export function triviaTier(score: number, total: number) {
  if (total > 0 && score === total) return "perfect" as const;
  const r = total ? score / total : 0;
  return r >= 0.7
    ? ("high" as const)
    : r >= 0.4
      ? ("mid" as const)
      : ("low" as const);
}
export const triviaImagePath = (id: string) => `/api/trivia/image/${id}`;

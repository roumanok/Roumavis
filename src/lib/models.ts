import { z } from "zod";
export const slots = [
  "historia",
  "vista",
  "cama",
  "mesita",
  "encuesta",
] as const;
export type MomentSlot = (typeof slots)[number];
export const slotSchema = z.enum(slots);
export const labels: Record<MomentSlot, string> = {
  historia: "El comienzo",
  vista: "La vista",
  cama: "Nuestro momento",
  mesita: "Buen día ❤️",
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
export const photoPath = (year: number) => `/historia/foto-${year - 2003}.png`;

import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { defaults, triviaDefaults, type Trivia } from "../../src/lib/models";
import { playRitual } from "./ritual";
const key = "e2e-only-qr-key-not-for-production-123456789";
const trivia: Trivia = {
  questions: [
    {
      id: "q1",
      text: "¿Dónde fue nuestra primera cita?",
      image: false,
      options: ["En el cine", "En un bar", "En la playa"],
      correct: 1,
    },
    {
      id: "q2",
      text: "¿Qué lugar es este?",
      image: true,
      options: ["Salta", "Mendoza"],
      correct: 0,
    },
    {
      id: "q3",
      text: "¿Cuál es mi comida favorita?",
      image: false,
      options: ["Pizza", "Asado", "Sushi", "Pastas"],
      correct: 3,
    },
  ],
  prize: {
    title: "Una cena a elección",
    text: "Elegís el lugar y yo invito ❤️",
    image: true,
  },
  phrases: triviaDefaults.phrases,
};
test("guest plays the trivia and gets the prize", async ({ page }) => {
  const img = await readFile("public/logo_roumavis.png");
  let posted: unknown = null;
  await page.route("**/api/reset", (r) =>
    r.fulfill({ json: { resetAt: null } }),
  );
  await page.route("**/api/trivia", (r) => r.fulfill({ json: { trivia } }));
  await page.route("**/api/trivia/result", (r) => {
    posted = r.request().postDataJSON();
    return r.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/trivia/image/**", (r) =>
    r.fulfill({ contentType: "image/png", body: img }),
  );
  await page.route("**/api/moments/**", (r) =>
    r.fulfill({ json: { exists: false, version: null } }),
  );
  await page.goto(`/acceso?k=${key}&destino=/trivia`);
  await playRitual(page, /signo de pregunta/, 7, "question");
  await expect(
    page.getByRole("heading", { name: "¡Llegó la hora de nuestra trivia!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "¡OBVIO!" }).click();
  // Q1 right
  await page.getByRole("button", { name: /En un bar/ }).click();
  await expect(page.getByText("¡Correcto!")).toBeVisible();
  await page.screenshot({ path: "test-results/trivia-right.png" });
  await page.getByRole("button", { name: "Siguiente pregunta" }).click();
  // Q2 wrong (with photo)
  await page.getByRole("button", { name: /Mendoza/ }).click();
  await expect(page.getByText("Ouch! No era esa")).toBeVisible();
  await page.screenshot({ path: "test-results/trivia-wrong.png" });
  // Reload mid-game keeps progress
  await page.getByRole("button", { name: "Siguiente pregunta" }).click();
  await page.reload();
  await expect(page.getByText("Pregunta 3 de 3")).toBeVisible();
  await page.getByRole("button", { name: /Pastas/ }).click();
  await page.getByRole("button", { name: "Ver resultado" }).click();
  await expect(page.getByText("Puntaje final")).toBeVisible();
  await expect(page.getByText(triviaDefaults.phrases.mid)).toBeVisible();
  await page.screenshot({ path: "test-results/trivia-score.png" });
  await expect
    .poll(() => posted)
    .toEqual({
      answers: [1, 1, 3],
      score: 2,
      total: 3,
    });
  await page.getByRole("button", { name: "¡VER EL PREMIO!" }).click();
  await expect(
    page.getByRole("heading", { name: "Una cena a elección" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /REGISTRAR MOMENTO/ }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/trivia-prize.png" });
});

test("admin builds the trivia", async ({ page }) => {
  let saved: Trivia | null = null;
  await page.route("**/api/content", (r) =>
    r.fulfill({ json: { content: defaults, version: null } }),
  );
  await page.route("**/api/survey", (r) =>
    r.fulfill({ json: { submitted: false, survey: null } }),
  );
  await page.route("**/api/history/**", (r) =>
    r.fulfill({ json: { exists: false, version: null } }),
  );
  await page.route("**/api/trivia", (r) => {
    if (r.request().method() === "PUT") {
      saved = r.request().postDataJSON();
      return r.fulfill({ json: { ok: true } });
    }
    return r.fulfill({ json: { trivia: triviaDefaults, result: null } });
  });
  await page.goto("/admin");
  await page.getByLabel("Contraseña").fill("e2e-only-admin-password");
  await page.getByRole("button", { name: "INGRESAR", exact: true }).click();
  await page.getByRole("button", { name: "Trivia", exact: true }).click();
  await page.getByRole("button", { name: "+ AGREGAR PREGUNTA" }).click();
  await page.getByLabel("Pregunta", { exact: true }).fill("¿Color favorito?");
  await page.getByLabel("Opción A", { exact: true }).fill("Rojo");
  await page.getByLabel("Opción B", { exact: true }).fill("Verde");
  await page.getByRole("button", { name: "+ Agregar opción" }).click();
  await page.getByLabel("Opción C", { exact: true }).fill("Bordó");
  await page.getByLabel("Opción C es la correcta").check();
  await page.getByLabel("Título").fill("Un masaje");
  await page.screenshot({
    path: "test-results/trivia-admin.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "GUARDAR TRIVIA" }).click();
  await expect(page.getByText("Trivia guardada.")).toBeVisible();
  expect(saved!.questions[0]).toMatchObject({
    text: "¿Color favorito?",
    options: ["Rojo", "Verde", "Bordó"],
    correct: 2,
  });
  expect(saved!.prize.title).toBe("Un masaje");
});

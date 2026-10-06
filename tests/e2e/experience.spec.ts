import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { defaults, questions } from "../../src/lib/models";
import { playRitual } from "./ritual";
const key = "e2e-only-qr-key-not-for-production-123456789";
async function enter(page: Page, path = "/") {
  await page.goto(`/acceso?k=${key}&destino=${encodeURIComponent(path)}`);
}
async function fixtures(page: Page, { photos = false } = {}) {
  let submitted = false,
    failSubmit = true,
    content = structuredClone(defaults),
    version = "v1";
  const image = await readFile("public/logo_roumavis.png");
  const saved = new Set(
    photos ? ["historia", "vista", "cama", "mesita", "trivia", "encuesta"] : [],
  );
  await page.route("**/api/reset", async (route) => {
    if (route.request().method() === "POST") {
      saved.clear();
      submitted = false;
    }
    await route.fulfill({ json: { resetAt: null } });
  });
  await page.route("**/api/content", async (route) => {
    if (route.request().method() === "PUT") {
      content = route.request().postDataJSON().content;
      version = "v2";
      await route.fulfill({ json: { version } });
    } else await route.fulfill({ json: { content, version } });
  });
  await page.route("**/api/survey", async (route) => {
    if (route.request().method() === "POST") {
      if (failSubmit) {
        failSubmit = false;
        await route.fulfill({
          status: 503,
          json: { error: "No hay conexión. Intentá otra vez." },
        });
        return;
      }
      submitted = true;
    }
    await route.fulfill({ json: { submitted, survey: null } });
  });
  await page.route("**/api/moments/**", async (route) => {
    const url = new URL(route.request().url()),
      slot = url.pathname.split("/").pop()!;
    if (route.request().method() === "PUT") {
      saved.add(slot);
      await route.fulfill({ json: { exists: true, version: "saved-v1" } });
    } else if (route.request().method() === "DELETE") {
      saved.delete(slot);
      await route.fulfill({ json: { exists: false, version: null } });
    } else if (url.searchParams.has("info"))
      await route.fulfill({
        json: {
          exists: saved.has(slot),
          version: saved.has(slot) ? "saved-v1" : null,
        },
      });
    else await route.fulfill({ contentType: "image/png", body: image });
  });
}
test("unauthenticated endpoints reject access and guest cannot write admin content", async ({
  page,
  request,
}) => {
  for (const path of ["/api/content", "/api/survey", "/api/moments/historia"])
    expect((await request.get(path)).status()).toBe(401);
  await page.goto("/");
  await expect(
    page.getByText("Abrí el enlace de tu tarjeta para comenzar."),
  ).toBeVisible();
  await enter(page);
  expect(
    await page.evaluate(
      async () => (await fetch("/api/moments/not-a-slot")).status,
    ),
  ).toBe(400);
  const status = await page.evaluate(
    async () =>
      (
        await fetch("/api/content", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        })
      ).status,
  );
  expect(status).toBe(401);
  expect((await request.get("/acceso?k=wrong")).status()).toBe(403);
});
test("mobile story, calendar counter, camera fallback, completion and revisit", async ({
  page,
}) => {
  await fixtures(page);
  await enter(page);
  // Opening: the padlock opens with the date it all started (09/07/2004).
  await expect(page.getByRole("heading", { name: /Bienvenida/ })).toHaveCount(
    0,
  );
  await expect(page.getByText("¿Cuándo empezó todo?")).toBeVisible();
  await page.screenshot({ path: "test-results/lock-closed.png" });
  for (let i = 0; i < 8; i++)
    await page.getByRole("button", { name: "Subir día" }).click();
  for (let i = 0; i < 6; i++)
    await page.getByRole("button", { name: "Subir mes" }).click();
  for (let i = 0; i < 22; i++)
    await page.getByRole("button", { name: "Bajar año" }).click();
  await expect(page.getByText("Ahí empezó todo…")).toBeVisible();
  await page.screenshot({ path: "test-results/lock-open.png" });
  await expect(page.getByRole("heading", { name: /Bienvenida/ })).toBeVisible();
  await page.waitForTimeout(1200);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/welcome-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "¡SÍ!", exact: true }).click();
  await expect(page.getByRole("button", { name: "¡LISTO!" })).toBeDisabled();
  await page.getByRole("button", { name: "PROBAR", exact: true }).click();
  await page.getByRole("button", { name: "¡LISTO!" }).click();
  await expect(page.getByLabel("Tiempo juntos")).toBeVisible();
  await page.getByRole("button", { name: "¡WOW!" }).click();
  await page.getByRole("button", { name: "¡OBVIO!" }).click();
  for (let year = 2004; year <= 2025; year++) {
    await expect(
      page.getByRole("heading", { name: String(year), exact: true }),
    ).toBeVisible();
    if (year === 2006) {
      // Swipe left → next year; swipe right → back.
      const swipe = async (dx: number) => {
        const box = (await page.locator(".carousel-viewport").boundingBox())!;
        const x = box.x + box.width / 2,
          y = box.y + box.height / 2;
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + dx / 2, y + 2, { steps: 4 });
        await page.mouse.move(x + dx, y + 4, { steps: 4 });
        await page.mouse.up();
      };
      await swipe(-120);
      await expect(
        page.getByRole("heading", { name: "2007", exact: true }),
      ).toBeVisible();
      await page.screenshot({ path: "test-results/history-swipe.png" });
      await page.locator(".history-caption").count();
      await swipe(120);
      await expect(
        page.getByRole("heading", { name: "2006", exact: true }),
      ).toBeVisible();
    }
    await page.getByRole("button", { name: "Año siguiente" }).click();
  }
  await expect(
    page.getByRole("heading", { name: "2026", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/history-2026.png" });
  await page.getByRole("button", { name: "¡SELFIE!" }).click();
  await page.screenshot({ path: "test-results/camera.png" });
  await expect(page.getByText("¿Te parece sumar")).toHaveCount(0);
  await page
    .locator("input[type=file]")
    .setInputFiles("public/logo_roumavis.png");
  await expect(
    page.getByText("Arrastrá o pellizcá para acomodarla"),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/crop.png" });
  await page.getByRole("button", { name: "❤️ GUARDAR" }).click();
  await expect(page.getByText("Cambiar foto")).toHaveCount(0);
  await page.screenshot({ path: "test-results/history-2026-saved.png" });
  await page.getByRole("button", { name: "¡LISTO!" }).click();
  await expect(page.getByText("Y seguimos escribiendo")).toBeVisible();
  await page.screenshot({ path: "test-results/closing-1.png" });
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByText("TE AMO ❤️", { exact: true })).toBeVisible();
  await expect(page.getByText(/única sorpresa/)).toHaveCount(0);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByText(/única sorpresa/)).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "¿Querés volver a recorrer nuestra historia?",
    }),
  ).toBeVisible();
});
test("survey survives reload and failed send; gallery exports a real story PNG", async ({
  page,
}) => {
  await fixtures(page, { photos: true });
  await enter(page, "/encuesta");
  await playRitual(page, /llenar el corazón/, 7);
  await page.getByRole("button", { name: "COMENZAR", exact: true }).click();
  for (let i = 0; i < questions.length; i++) {
    await expect(
      page.getByRole("heading", { name: questions[i], exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "5 corazones", exact: true })
      .click();
    if (i === 2) {
      await expect(
        page.getByRole("heading", { name: questions[3], exact: true }),
      ).toBeVisible();
      await page.reload();
    }
  }
  await page
    .getByRole("button", { name: "NO PUEDO ESPERAR", exact: true })
    .click();
  await page
    .getByLabel("¿Qué fue lo que más te gustó de esta escapada?")
    .fill("Estar juntos");
  await page.reload();
  await expect(
    page.getByLabel("¿Qué fue lo que más te gustó de esta escapada?"),
  ).toHaveValue("Estar juntos");
  await page.getByRole("button", { name: "CONTINUAR", exact: true }).click();
  await page.getByRole("button", { name: "ENVIAR EVALUACIÓN" }).click();
  await expect(
    page.getByText("No hay conexión. Intentá otra vez."),
  ).toBeVisible();
  await page.getByRole("button", { name: "ENVIAR EVALUACIÓN" }).click();
  // Final photo already registered: only logo, photo and the gallery button.
  await expect(
    page.getByRole("button", { name: "❤️ VER NUESTROS MOMENTOS" }),
  ).toBeVisible();
  await expect(page.getByText(/Gracias por participar/)).toHaveCount(0);
  await page.screenshot({ path: "test-results/thanks.png" });
  await page.getByRole("button", { name: "❤️ VER NUESTROS MOMENTOS" }).click();
  await expect(page.getByText("Nuestros momentos · 1 / 6")).toBeVisible();
  const vp = (await page.locator(".carousel-viewport").boundingBox())!;
  await page.mouse.move(vp.x + 250, vp.y + 200);
  await page.mouse.down();
  await page.mouse.move(vp.x + 170, vp.y + 202, { steps: 4 });
  await page.mouse.move(vp.x + 90, vp.y + 205, { steps: 4 });
  await page.mouse.up();
  await expect(
    page
      .locator('.carousel-slide[aria-hidden="false"]')
      .getByText("Nuestros momentos · 2 / 6"),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/moments.png" });
  for (let i = 0; i < 5; i++)
    await page.getByRole("button", { name: "Momento siguiente" }).click();
  await expect(page.getByText(/ahora a planear/)).toBeVisible();
  await page.screenshot({ path: "test-results/planear.png" });
  await page.getByRole("button", { name: "CREAR NUESTRO RECUERDO" }).click();
  const preview = page.getByAltText("Nuestro recuerdo en seis fotos");
  await expect(preview).toBeVisible();
  expect(
    await preview.evaluate((img: HTMLImageElement) => [
      img.naturalWidth,
      img.naturalHeight,
    ]),
  ).toEqual([1080, 1920]);
  const png = await preview.evaluate(async (img: HTMLImageElement) =>
    Array.from(
      new Uint8Array(await (await fetch(img.src)).arrayBuffer()).slice(0, 8),
    ),
  );
  expect(png).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "DESCARGAR PARA STORY" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("nuestro-finde.png");
  await download.saveAs("test-results/nuestro-finde.png");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "❤️ VER NUESTROS MOMENTOS" }),
  ).toBeVisible();
});
test("admin signs in on server, saves editable content and deletes a moment", async ({
  page,
}) => {
  await fixtures(page, { photos: true });
  await page.goto("/admin");
  await page.getByLabel("Contraseña").fill("e2e-only-admin-password");
  await page.getByRole("button", { name: "INGRESAR", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Historia", exact: true }),
  ).toBeVisible();
  // The admin opens on the summary of every experience.
  await expect(page.getByRole("heading", { name: "La trivia" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ABRIR" })).toHaveCount(6);
  await page.screenshot({ path: "test-results/admin-summary.png" });
  // Each experience can be reset on its own from the summary.
  const scoped: unknown[] = [];
  const scopedReset = async (route: import("@playwright/test").Route) => {
    if (route.request().method() === "POST")
      scoped.push(route.request().postDataJSON());
    await route.fulfill({ json: { resetAt: null, scopes: {} } });
  };
  await page.route("**/api/reset", scopedReset);
  page.once("dialog", (dialog) => {
    expect(dialog.message()).toContain("resultado de la trivia");
    void dialog.accept();
  });
  await page
    .locator(".summary-card", { hasText: "La trivia" })
    .getByRole("button", { name: "Reiniciar", exact: true })
    .click();
  await expect.poll(() => scoped).toEqual([{ scope: "trivia" }]);
  await page.unroute("**/api/reset", scopedReset);
  await page.getByRole("button", { name: "Historia", exact: true }).click();
  await page.getByLabel("Frase de 2004").fill("Nuestro primer año.");
  await page.getByRole("button", { name: "GUARDAR CAMBIOS" }).click();
  await expect(page.getByRole("status")).toHaveText("Cambios guardados.");
  await page.getByRole("button", { name: "Mensajes", exact: true }).click();
  await page
    .getByRole("textbox", { name: "/vista", exact: true })
    .fill("Un mensaje nuevo.");
  await page.getByRole("button", { name: "GUARDAR CAMBIOS" }).click();
  await page.getByRole("button", { name: "Momentos", exact: true }).click();
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Eliminar foto", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Eliminar foto", exact: true }),
  ).toHaveCount(5);
  await page.getByRole("button", { name: "Reiniciar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "¿Reiniciar toda la experiencia?" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/admin-reset.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "SÍ, BORRAR TODO" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Listo: la experiencia quedó como nueva.",
  );
  await expect(
    page.getByRole("button", { name: "Eliminar foto", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
});

import { test, expect } from "@playwright/test";
import { defaults } from "../../src/lib/models";
import { playRitual } from "./ritual";
const key = "e2e-only-qr-key-not-for-production-123456789";
test("surprise flow", async ({ page }) => {
  let exists = false;
  await page.route("**/api/content", (r) =>
    r.fulfill({ json: { content: defaults, version: null } }),
  );
  await page.route("**/api/moments/**", async (r) => {
    const u = new URL(r.request().url());
    if (r.request().method() === "PUT") {
      exists = true;
      return r.fulfill({ json: { exists: true, version: "v" } });
    }
    if (u.searchParams.has("info"))
      return r.fulfill({ json: { exists, version: exists ? "v" : null } });
    return r.fulfill({ path: "public/logo_roumavis.png" });
  });
  await page.goto(`/acceso?k=${key}&destino=/cama`);
  await playRitual(page, /caja de bombones/, 6, "bonbons");
  await expect(
    page.getByRole("button", { name: /REGISTRAR MOMENTO/ }),
  ).toBeVisible({ timeout: 8000 });
  await page.screenshot({ path: "test-results/s1.png" });
  await page.getByRole("button", { name: /REGISTRAR MOMENTO/ }).click();
  await expect(page.getByText(/Yo ya encontré/)).toHaveCount(0);
  await expect(page.locator(".corner-logo")).toBeVisible();
  await page.screenshot({ path: "test-results/s2.png" });
  await page.getByText("Cancelar").click();
  await expect(page.getByText(/Yo ya encontré/)).toBeVisible();
  await page.getByRole("button", { name: /REGISTRAR MOMENTO/ }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles("public/logo_roumavis.png");
  await page.getByRole("button", { name: "❤️ GUARDAR" }).click();
  await expect(page.getByRole("button", { name: "¡LISTO!" })).toBeVisible();
  await expect(page.getByText("Cambiar foto")).toHaveCount(0);
  await page.screenshot({ path: "test-results/s3.png" });
  await page.getByRole("button", { name: "¡LISTO!" }).click();
  await expect(page.getByText(/Hasta la próxima sorpresa/)).toBeVisible();
  await page.screenshot({ path: "test-results/s4.png" });
});

for (const [slot, label, shot] of [
  ["vista", /llenar la botella/, "bottle"],
  ["mesita", /despertar el sol/, "sun"],
] as const) {
  test(`ritual ${slot}`, async ({ page }) => {
    await page.route("**/api/content", (r) =>
      r.fulfill({ json: { content: defaults, version: null } }),
    );
    await page.route("**/api/moments/**", (r) =>
      r.fulfill({ json: { exists: false, version: null } }),
    );
    await page.goto(`/acceso?k=${key}&destino=/${slot}`);
    await playRitual(page, label, 7, shot);
    await expect(
      page.getByRole("button", { name: /REGISTRAR MOMENTO/ }),
    ).toBeVisible({ timeout: 8000 });
    // Second visit skips the ritual.
    await page.reload();
    await expect(
      page.getByRole("button", { name: /REGISTRAR MOMENTO/ }),
    ).toBeVisible({ timeout: 8000 });
  });
}

import { test, expect } from "@playwright/test";
import { defaults } from "../../src/lib/models";
test("admin downloads the printable QR cards PDF", async ({ page }) => {
  await page.route("**/api/content", (r) =>
    r.fulfill({ json: { content: defaults, version: null } }),
  );
  await page.route("**/api/survey", (r) =>
    r.fulfill({ json: { submitted: false, survey: null } }),
  );
  await page.route("**/api/history/**", (r) =>
    r.fulfill({ json: { exists: false, version: null } }),
  );
  await page.goto("/admin");
  await page.getByLabel("Contraseña").fill("e2e-only-admin-password");
  await page.getByRole("button", { name: "INGRESAR", exact: true }).click();
  await page.getByRole("button", { name: "Tarjetas", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "DESCARGAR PDF" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("roumavis-tarjetas-qr.pdf");
  await file.saveAs("test-results/tarjetas.pdf");
  await expect(page.getByRole("link", { name: "Probar enlace" })).toHaveCount(
    5,
  );
});

import { expect, type Page } from "@playwright/test";
/** Plays a tap ritual: taps until full, then (for hearts) taps once more. */
export async function playRitual(
  page: Page,
  label: RegExp,
  taps: number,
  shot?: string,
) {
  const stage = page.getByRole("button", { name: label });
  await expect(stage).toBeVisible();
  for (let i = 0; i < taps; i++) {
    await stage.click();
    if (shot && i === Math.floor(taps / 2))
      await page.screenshot({ path: `test-results/${shot}-half.png` });
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(500);
  if (shot) await page.screenshot({ path: `test-results/${shot}-full.png` });
  const more = page.getByRole("button", { name: "Tocalo para seguir" });
  if (/corazón/.test(label.source)) await more.click();
}

import { expect, test } from "@playwright/test";

test.describe("practitioner availability fixed grid", () => {
  test("loads the rolling weeks workspace without horizontal overflow", async ({ page }) => {
    test.skip(test.info().project.name === "mobile-ar", "desktop smoke is not part of the mobile project");
    await page.goto("/ar/practitioner/availability");
    await expect(page).toHaveURL(/\/ar\/practitioner\/availability/);
    await expect(page.getByRole("heading").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: "test-artifacts/screenshots/availability-ar-desktop.png", fullPage: true });
  });

  test("keeps the editor grid deterministic at mobile width", async ({ page }) => {
    test.skip(test.info().project.name !== "mobile-ar", "mobile smoke is isolated to the mobile project");
    await page.goto("/ar/practitioner/availability");
    await expect(page.getByTestId("availability-mobile-cards")).toBeVisible();
    await expect(page.getByTestId("availability-mobile-cards").locator("button").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: "test-artifacts/screenshots/availability-ar-mobile.png", fullPage: true });
  });
});

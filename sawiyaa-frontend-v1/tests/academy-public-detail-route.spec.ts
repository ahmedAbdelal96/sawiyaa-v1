import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const webRoot = resolve(__dirname, "..");
const detailPageSource = readFileSync(
  resolve(webRoot, "src/app/[locale]/(public)/academy/[slug]/page.tsx"),
  "utf8",
);
const detailScreenSource = readFileSync(
  resolve(webRoot, "src/features/academy/components/PublicAcademyDetailScreen.tsx"),
  "utf8",
);
const liveBaseUrl = process.env.ACADEMY_DETAIL_BASE_URL;

function liveRoute(locale: "en" | "ar", slug: string) {
  return `${liveBaseUrl}/${locale}/academy/${slug}`;
}

test.describe("Public Academy detail route contract", () => {
  test("declares the locale and slug route and forwards the exact slug to the detail screen", () => {
    expect(detailPageSource).toContain("params: Promise<{ locale: string; slug: string }>");
    expect(detailPageSource).toContain("const { locale, slug } = await params;");
    expect(detailPageSource).toContain("setRequestLocale(locale);");
    expect(detailPageSource).toContain(
      '<PublicAcademyDetailScreen locale={locale} slug={slug} />',
    );
  });

  test("keeps valid unavailable programs on their detail page and blocks only enrollment", () => {
    expect(detailScreenSource).toContain("usePublicAcademyProgram(slug");
    expect(detailScreenSource).toContain("tokenManager.isAuthenticated()");
    expect(detailScreenSource).toContain("mapAcademyPublicPrice");
    expect(detailScreenSource).toContain("<PriceDisplay price={price} />");
    expect(detailScreenSource).toContain('program.priceStatus === "PAID"');
    expect(detailScreenSource).not.toMatch(/priceEgp|priceUsd|formatLocalizedMoney/);
  });

  test.describe("live trusted-country rendering", () => {
    test.skip(!liveBaseUrl, "Set ACADEMY_DETAIL_BASE_URL to run live Academy detail verification.");

    test("renders paid and unavailable English detail pages without treating unavailable as not found", async ({ browser }) => {
      const context = await browser.newContext({
        extraHTTPHeaders: { "CF-IPCountry": "US" },
      });
      const page = await context.newPage();

      await page.goto(liveRoute("en", "qa-academy-payment-smoke"), { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "QA Academy Payment Smoke" })).toBeVisible();
      await expect(page.getByText("$20 USD", { exact: true }).first()).toBeVisible();
      await expect(page.locator("form")).toHaveCount(1);

      for (const slug of ["soft-cap-smoke-course", "smoke-course-1", "smoke-ui-image"]) {
        await page.goto(liveRoute("en", slug), { waitUntil: "networkidle" });
        await expect(page.getByText("Price unavailable", { exact: true }).first()).toBeVisible();
        await expect(page.getByText("Free", { exact: true })).toHaveCount(0);
        await expect(page.locator("form")).toHaveCount(0);
      }

      await context.close();
    });

    test("renders Arabic selected money and the Egyptian-only partial regional price", async ({ browser }) => {
      const context = await browser.newContext({
        extraHTTPHeaders: { "CF-IPCountry": "EG" },
      });
      const page = await context.newPage();

      await page.goto(liveRoute("ar", "qa-academy-payment-smoke"), { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: /QA Academy Payment Smoke/ })).toBeVisible();
      await expect(page.getByText("1,000 جنيه مصري", { exact: true }).first()).toBeVisible();
      await expect(page.locator("form")).toHaveCount(1);

      await page.goto(liveRoute("ar", "smoke-ui-image"), { waitUntil: "networkidle" });
      await expect(page.getByText("310 جنيه مصري", { exact: true }).first()).toBeVisible();
      await expect(page.locator("form")).toHaveCount(1);

      await context.close();
    });

    test("returns not found from the exact public data endpoint for a nonexistent Academy slug", async ({ request }) => {
      const response = await request.get(
        `${liveBaseUrl}/api/v1/academy/programs/academy-program-that-does-not-exist`,
        {
        headers: { "CF-IPCountry": "US" },
        },
      );

      expect(response.status()).toBe(404);
    });
  });
});

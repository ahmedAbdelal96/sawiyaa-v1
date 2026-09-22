import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const backendUrl = process.env.PACKAGE_QA_BACKEND_URL ?? "http://127.0.0.1:7000";
const webUrl = process.env.PACKAGE_QA_WEB_URL ?? "http://127.0.0.1:3000";
const outputDir = path.resolve(
  process.env.PACKAGE_DISCOVERY_QA_OUTPUT_DIR ??
    "../qa-artifacts/practitioner-package-discovery/visual/web",
);
const positiveSlug =
  process.env.PACKAGE_DISCOVERY_POSITIVE_SLUG ??
  "dev-b2f2-s3-partial-secondary";
const noPackageSlug =
  process.env.PACKAGE_DISCOVERY_NO_PACKAGE_SLUG ??
  "dev-b2f2-s4-legacy-only";

async function apiJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${options.method ?? "GET"} ${url} failed (${response.status})`);
  return body;
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const login = await apiJson(`${backendUrl}/api/v1/auth/patient/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: process.env.PACKAGE_QA_PATIENT_EMAIL ?? "ahmed.patient@hesba.local",
      password: process.env.PACKAGE_QA_PATIENT_PASSWORD ?? "Patient@12345",
    }),
  });
  const auth = login.data;
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const [name, slug, viewport, expected, forbidden] of [
    ["profile-desktop-ar", positiveSlug, { width: 1440, height: 1000 }, ["باقات", "جلسات", "ابدأ الشراء"], []],
    ["profile-mobile-ar", positiveSlug, { width: 390, height: 844 }, ["باقات", "جلسات", "ابدأ الشراء"], []],
    ["profile-no-package-ar", noPackageSlug, { width: 1440, height: 1000 }, [], ["باقات الجلسات"]],
  ]) {
    const context = await browser.newContext({
      viewport,
      locale: "ar-SA",
      timezoneId: "Africa/Cairo",
    });
    await context.addCookies([
      { name: "sawiyaa_access_token", value: auth.tokens.accessToken, url: webUrl, httpOnly: false, sameSite: "Lax" },
      { name: "sawiyaa_refresh_token", value: auth.tokens.refreshToken, url: webUrl, httpOnly: true, sameSite: "Lax" },
      { name: "sawiyaa_user_role", value: "PATIENT", url: webUrl, httpOnly: false, sameSite: "Lax" },
      {
        name: "sawiyaa_user_data",
        value: encodeURIComponent(JSON.stringify({
          id: auth.user.id,
          displayName: auth.user.displayName,
          roles: auth.user.roles,
          role: "PATIENT",
          primaryEmail: auth.user.primaryEmail,
          practitionerProfileId: null,
          practitionerStatus: null,
        })),
        url: webUrl,
        httpOnly: false,
        sameSite: "Lax",
      },
    ]);
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    const url = `${webUrl}/ar/practitioners/${slug}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(1_500);
    const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    const missingExpected = expected.filter((needle) => !bodyText.includes(needle));
    const forbiddenFound = forbidden.filter((needle) => bodyText.includes(needle));
    const screenshot = path.join(outputDir, `${name}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    let ctaStatus = "NOT_APPLICABLE";
    if (slug === positiveSlug) {
      const cta = page.locator("button").filter({ hasText: "ابدأ الشراء" }).first();
      if (await cta.count()) {
        await cta.click();
        await page.waitForTimeout(500);
        const modalText = (await page.locator("body").innerText()).replace(/\s+/g, " ");
        ctaStatus = modalText.includes("اختيار وحجز باقة") || modalText.includes("اختيار الباقة") ? "PASS" : "FAIL";
      } else {
        ctaStatus = "FAIL";
      }
    }
    results.push({
      name,
      slug,
      viewport,
      url,
      screenshot,
      status: missingExpected.length === 0 && forbiddenFound.length === 0 && consoleErrors.length === 0 && ctaStatus !== "FAIL" ? "PASS" : "CONDITIONAL",
      ctaStatus,
      missingExpected,
      forbiddenFound,
      consoleErrors,
      bodyPreview: bodyText.slice(0, 800),
    });
    await context.close();
  }
  await browser.close();
  const manifest = { capturedAt: new Date().toISOString(), positiveSlug, noPackageSlug, results };
  await fs.writeFile(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

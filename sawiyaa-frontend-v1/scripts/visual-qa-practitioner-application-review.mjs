import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const outputDir = path.resolve("d:/Web/full-projects/sawiyaa/qa-evidence/admin-practitioner-applications/2026-08-23-app-review");
await fs.mkdir(outputDir, { recursive: true });

const baseUrl = "http://localhost:3000";
const appId = "86433c47-89ec-4849-bb55-e8776cdddbad";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
    locale: "ar-EG",
    timezoneId: "Africa/Cairo",
  });

  const page = await context.newPage();

  // 1. Sign in as Admin
  await page.goto(`${baseUrl}/ar/signin/admin`, { waitUntil: "commit", timeout: 60000 });
  await page.waitForTimeout(2000);

  const emailInput = page.locator('input[type="email"], input[name="email"], #email').first();
  await emailInput.waitFor({ state: "visible", timeout: 15000 });
  await emailInput.fill("admin@hesba.local");

  const passInput = page.locator('input[type="password"], input[name="password"], #password').first();
  await passInput.fill("Admin@12345");

  const submitBtn = page.locator('button:has-text("تسجيل الدخول")').last();
  await submitBtn.click();
  await page.waitForTimeout(4000);

  // 2. Navigate to Application Review
  await page.goto(`${baseUrl}/ar/admin/practitioner-applications/${appId}`, { waitUntil: "commit", timeout: 60000 });
  await page.waitForTimeout(4000);

  // Wait for header name to appear
  const headerTitle = page.locator('h1').first();
  await headerTitle.waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(1000);

  // Capture Step 1
  await page.screenshot({ path: path.join(outputDir, "ar-app-review-step1.png"), fullPage: false });
  console.log("Captured ar-app-review-step1.png");

  // Click Step 2
  const step2Btn = page.locator('button:has-text("الملف المهني")').first();
  if (await step2Btn.count() > 0) {
    await step2Btn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outputDir, "ar-app-review-step2.png"), fullPage: false });
    console.log("Captured ar-app-review-step2.png");
  }

  // Click Step 3
  const step3Btn = page.locator('button:has-text("المستندات")').first();
  if (await step3Btn.count() > 0) {
    await step3Btn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outputDir, "ar-app-review-step3.png"), fullPage: false });
    console.log("Captured ar-app-review-step3.png");
  }

  // Click Step 4
  const step4Btn = page.locator('button:has-text("القرار النهائي")').first();
  if (await step4Btn.count() > 0) {
    await step4Btn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outputDir, "ar-app-review-step4.png"), fullPage: false });
    console.log("Captured ar-app-review-step4.png");
  }

  await context.close();
} finally {
  await browser.close();
}

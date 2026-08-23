import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const timestamp = "2026-08-23-114200";
const outputDir = path.resolve(`d:/Web/full-projects/sawiyaa/qa-evidence/platform-settings-notifications/${timestamp}`);
await fs.mkdir(outputDir, { recursive: true });

const baseUrl = "http://localhost:3000";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  async function captureLocaleScreenshots(locale, isMobile = false) {
    const isRtl = locale === "ar";
    const context = await browser.newContext({
      viewport: isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      locale: isRtl ? "ar-EG" : "en-US",
      timezoneId: "Africa/Cairo",
    });

    const page = await context.newPage();

    // 1. Perform admin login via quick fill
    await page.goto(`${baseUrl}/${locale}/signin/admin`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const quickFillBtn = page.locator('button:has-text("Quick QA"), button:has-text("بيانات الاختبار السريع")').first();
    if (await quickFillBtn.count() > 0) {
      await quickFillBtn.click();
      await page.waitForTimeout(400);

      const primaryAccountBtn = page.locator('button:has-text("Primary Test Account"), button:has-text("الحساب التجريبي الافتراضي")').first();
      if (await primaryAccountBtn.count() > 0) {
        await primaryAccountBtn.click();
        await page.waitForTimeout(300);
      }
    }

    const submitBtn = page.locator('button:has-text("تسجيل الدخول"), button:has-text("Sign in"), button:has-text("Sign In")').first();
    await submitBtn.click();
    await page.waitForURL(`**/${locale}/admin/**`, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const prefix = `${locale}${isMobile ? "-mobile" : ""}`;

    // 2. Navigate to Notifications Domain via Deep Link
    await page.goto(`${baseUrl}/${locale}/admin/platform-settings?domain=notifications`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outputDir, `${prefix}-notifications-domain.png`), fullPage: true });
    console.log(`Captured ${prefix}-notifications-domain.png`);

    // 3. Capture Confirmation Modal (Desktop only)
    if (!isMobile) {
      const switches = page.locator('button[role="switch"]');
      if (await switches.count() > 0) {
        // Click in-app push switch
        await switches.first().click();
        await page.waitForTimeout(500);

        await page.screenshot({ path: path.join(outputDir, `${prefix}-notifications-confirm-modal.png`), fullPage: false });
        console.log(`Captured ${prefix}-notifications-confirm-modal.png`);
      }
    }

    await context.close();
  }

  // Execute captures across Arabic and English, Desktop and Mobile
  console.log("Starting visual QA capture for Notifications Domain...");
  await captureLocaleScreenshots("ar", false);
  await captureLocaleScreenshots("ar", true);
  await captureLocaleScreenshots("en", false);
  await captureLocaleScreenshots("en", true);
  console.log("All Notifications Domain visual QA screenshots captured successfully!");
} finally {
  await browser.close();
}

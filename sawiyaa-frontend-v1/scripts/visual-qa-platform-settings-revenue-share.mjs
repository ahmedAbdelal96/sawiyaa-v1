import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const timestamp = "2026-08-23-105000";
const outputDir = path.resolve(`d:/Web/full-projects/sawiyaa/qa-evidence/platform-settings-revenue-share/${timestamp}`);
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

    // 2. Navigate to Revenue Share Domain via Deep Link
    await page.goto(`${baseUrl}/${locale}/admin/platform-settings?domain=revenue_share`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outputDir, `${prefix}-revenue-share-domain.png`), fullPage: true });
    console.log(`Captured ${prefix}-revenue-share-domain.png`);

    // 3. Capture Confirmation Modal (Desktop only)
    if (!isMobile) {
      const increaseBtn = page.locator('button[aria-label="Increase Local Platform Share"]').first();
      if (await increaseBtn.count() > 0) {
        await increaseBtn.click();
        await page.waitForTimeout(400);

        // Click Save Changes button
        const saveBtn = page.locator('button:has-text("حفظ"), button:has-text("Save")').first();
        if (await saveBtn.count() > 0) {
          await saveBtn.click();
          await page.waitForTimeout(500);

          await page.screenshot({ path: path.join(outputDir, `${prefix}-revenue-share-confirm-modal.png`), fullPage: false });
          console.log(`Captured ${prefix}-revenue-share-confirm-modal.png`);
        }
      }
    }

    await context.close();
  }

  // Execute captures across Arabic and English, Desktop and Mobile
  console.log("Starting visual QA capture for Revenue Share Domain...");
  await captureLocaleScreenshots("ar", false);
  await captureLocaleScreenshots("ar", true);
  await captureLocaleScreenshots("en", false);
  await captureLocaleScreenshots("en", true);
  console.log("All Revenue Share Domain visual QA screenshots captured successfully!");
} finally {
  await browser.close();
}

import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const timestamp = "2026-08-23-final-hardening";
const outputDir = path.resolve(`d:/Web/full-projects/sawiyaa/qa-evidence/platform-settings-final/${timestamp}`);
await fs.mkdir(outputDir, { recursive: true });

const baseUrl = "http://localhost:3000";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  async function setupAdminSession(locale, isMobile = false) {
    const isRtl = locale === "ar";
    const context = await browser.newContext({
      viewport: isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      locale: isRtl ? "ar-EG" : "en-US",
      timezoneId: "Africa/Cairo",
    });

    const page = await context.newPage();

    // Perform login
    await page.goto(`${baseUrl}/${locale}/signin/admin`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    const quickFillBtn = page.locator('button:has-text("Quick QA"), button:has-text("بيانات الاختبار السريع")').first();
    if (await quickFillBtn.count() > 0) {
      await quickFillBtn.click();
      await page.waitForTimeout(500);

      const primaryAccountBtn = page.locator('button:has-text("Primary Test Account"), button:has-text("الحساب التجريبي الافتراضي")').first();
      if (await primaryAccountBtn.count() > 0) {
        await primaryAccountBtn.click();
        await page.waitForTimeout(400);
      }
    }

    const submitBtn = page.locator('button:has-text("تسجيل الدخول"), button:has-text("Sign in"), button:has-text("Sign In")').first();
    await submitBtn.click();
    await page.waitForURL(`**/${locale}/admin/**`, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);

    return { context, page };
  }

  console.log("Starting Final Hardening Visual QA suite...");

  // 1. Landing Shell - Arabic Desktop & Mobile
  {
    const { context, page } = await setupAdminSession("ar", false);
    await page.goto(`${baseUrl}/ar/admin/platform-settings`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outputDir, "01-landing-ar-desktop.png"), fullPage: true });
    console.log("Captured 01-landing-ar-desktop.png");

    // All 6 Domain Desktop RTL Screenshots
    const domains = [
      { id: "sessions", name: "02-domain-sessions-ar-desktop.png" },
      { id: "revenue_share", name: "03-domain-revenue-share-ar-desktop.png" },
      { id: "payments", name: "04-domain-payments-ar-desktop.png" },
      { id: "notifications", name: "05-domain-notifications-ar-desktop.png" },
      { id: "storage", name: "06-domain-storage-ar-desktop.png" },
      { id: "general", name: "07-domain-general-ar-desktop.png" },
    ];

    for (const d of domains) {
      await page.goto(`${baseUrl}/ar/admin/platform-settings?domain=${d.id}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(outputDir, d.name), fullPage: true });
      console.log(`Captured ${d.name}`);
    }

    await context.close();
  }

  // 2. Landing Shell - Arabic Mobile
  {
    const { context, page } = await setupAdminSession("ar", true);
    await page.goto(`${baseUrl}/ar/admin/platform-settings`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outputDir, "08-landing-ar-mobile.png"), fullPage: true });
    console.log("Captured 08-landing-ar-mobile.png");
    await context.close();
  }

  // 3. Landing Shell - English Desktop & Mobile
  {
    const { context, page } = await setupAdminSession("en", false);
    await page.goto(`${baseUrl}/en/admin/platform-settings`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outputDir, "09-landing-en-desktop.png"), fullPage: true });
    console.log("Captured 09-landing-en-desktop.png");
    await context.close();
  }

  {
    const { context, page } = await setupAdminSession("en", true);
    await page.goto(`${baseUrl}/en/admin/platform-settings`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outputDir, "10-landing-en-mobile.png"), fullPage: true });
    console.log("Captured 10-landing-en-mobile.png");
    await context.close();
  }

  console.log("Final Hardening Visual QA suite completed successfully!");
} finally {
  await browser.close();
}

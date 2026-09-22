import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const outputDir = path.resolve(`d:/Web/full-projects/sawiyaa/qa-evidence/admin-patient-360/2026-08-23-patient-360`);
await fs.mkdir(outputDir, { recursive: true });

const baseUrl = "http://localhost:3000";
const patientId = "55555555-5555-4555-8555-555555555552";

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
  await page.goto(`${baseUrl}/ar/signin/admin`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1000);

  await page.locator('input[type="email"]').fill("admin@hesba.local");
  await page.locator('input[type="password"]').fill("Admin@12345");
  await page.waitForTimeout(300);

  const submitBtn = page.locator('button:has-text("تسجيل الدخول")').last();
  await submitBtn.click();
  await page.waitForTimeout(4000);

  // 2. Navigate to Patient 360
  await page.goto(`${baseUrl}/ar/admin/patients/${patientId}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);

  // Capture Tab 1: Profile Details (البيانات الأساسية)
  await page.screenshot({ path: path.join(outputDir, `ar-admin-patient-360-profile.png`), fullPage: false });
  console.log("Captured ar-admin-patient-360-profile.png");

  // Capture Tab 2: Sessions (الجلسات)
  const sessionsTabBtn = page.locator('button:has-text("الجلسات")').first();
  if (await sessionsTabBtn.count() > 0) {
    await sessionsTabBtn.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outputDir, `ar-admin-patient-360-sessions.png`), fullPage: false });
    console.log("Captured ar-admin-patient-360-sessions.png");
  }

  // Capture Tab 3: Payments (المدفوعات)
  const paymentsTabBtn = page.locator('button:has-text("المدفوعات")').first();
  if (await paymentsTabBtn.count() > 0) {
    await paymentsTabBtn.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outputDir, `ar-admin-patient-360-payments.png`), fullPage: false });
    console.log("Captured ar-admin-patient-360-payments.png");
  }

  // Capture Tab 4: Wallet (المحفظة)
  const walletTabBtn = page.locator('button:has-text("المحفظة")').first();
  if (await walletTabBtn.count() > 0) {
    await walletTabBtn.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outputDir, `ar-admin-patient-360-wallet.png`), fullPage: false });
    console.log("Captured ar-admin-patient-360-wallet.png");
  }

  await context.close();
} finally {
  await browser.close();
}

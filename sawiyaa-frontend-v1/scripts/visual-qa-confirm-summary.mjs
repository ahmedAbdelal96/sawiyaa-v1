import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const outputDir = path.resolve(`d:/Web/full-projects/sawiyaa/qa-evidence/booking-calendar-redesign/2026-08-23-booking-calendar`);
await fs.mkdir(outputDir, { recursive: true });

const baseUrl = "http://localhost:3000";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "ar-EG",
    timezoneId: "Africa/Cairo",
  });

  const page = await context.newPage();

  // Navigate directly to public practitioner profile
  await page.goto(`${baseUrl}/ar/practitioners/dr-mohamed-mahmoud`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const availabilityPanel = page.locator("#weekly-availability").first();
  await availabilityPanel.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  const slotBtn = page.locator('[data-testid="booking-slot-btn"]').first();
  console.log("Slot button visible count:", await slotBtn.count());

  if (await slotBtn.count() > 0) {
    await slotBtn.click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: path.join(outputDir, `ar-slot-confirm-summary.png`), fullPage: false });
    console.log("Captured ar-slot-confirm-summary.png successfully!");
  }

  await context.close();
} finally {
  await browser.close();
}

import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const timestamp = "2026-08-23-booking-calendar";
const outputDir = path.resolve(`d:/Web/full-projects/sawiyaa/qa-evidence/booking-calendar-redesign/${timestamp}`);
await fs.mkdir(outputDir, { recursive: true });

const baseUrl = "http://localhost:3000";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  async function captureProfileBooking(locale, isMobile = false) {
    const isRtl = locale === "ar";
    const context = await browser.newContext({
      viewport: isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      locale: isRtl ? "ar-EG" : "en-US",
      timezoneId: "Africa/Cairo",
    });

    const page = await context.newPage();
    const prefix = `${locale}${isMobile ? "-mobile" : ""}`;

    // Navigate directly to practitioner profile
    await page.goto(`${baseUrl}/${locale}/patient/practitioners/dr-mohamed-mahmoud`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Scroll to the weekly-availability panel
    const availabilityPanel = page.locator("#weekly-availability").first();
    if (await availabilityPanel.count() > 0) {
      await availabilityPanel.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
    }

    await page.screenshot({ path: path.join(outputDir, `${prefix}-profile-booking-calendar.png`), fullPage: false });
    console.log(`Captured ${prefix}-profile-booking-calendar.png`);

    // Click a slot to capture the confirm summary phase
    if (!isMobile && locale === "ar") {
      const slotBtn = page.locator('[data-testid="booking-slot-btn"]').first();
      if (await slotBtn.count() > 0) {
        await slotBtn.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(outputDir, `${prefix}-slot-confirm-summary.png`), fullPage: false });
        console.log(`Captured ${prefix}-slot-confirm-summary.png`);
      }
    }

    await context.close();
  }

  console.log("Starting visual QA capture for Redesigned Booking Calendar...");
  await captureProfileBooking("ar", false);
  await captureProfileBooking("ar", true);
  await captureProfileBooking("en", false);
  await captureProfileBooking("en", true);
  console.log("All Booking Calendar visual QA screenshots captured successfully!");
} finally {
  await browser.close();
}

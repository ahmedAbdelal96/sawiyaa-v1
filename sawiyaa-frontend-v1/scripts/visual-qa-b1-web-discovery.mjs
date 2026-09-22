import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.SAWIYAA_WEB_VISUAL_QA_URL ?? "http://127.0.0.1:3000";
const outputDir = path.resolve(process.env.SAWIYAA_WEB_VISUAL_QA_OUT ?? path.join(process.cwd(), "test-artifacts", "BLOC-1"));

async function capture(browser, locale, width, height, query, suffix) {
  const context = await browser.newContext({ viewport: { width, height }, locale: locale === "ar" ? "ar-EG" : "en-US", timezoneId: "Africa/Cairo" });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/${locale}/practitioners${query}`, { waitUntil: "networkidle", timeout: 60000 });
  const expected = locale === "ar" ? ["دعم القلق", "القلق"] : ["Anxiety support", "Anxiety"];
  const body = await page.locator("body").innerText();
  for (const label of expected) {
    if (!body.includes(label)) throw new Error(`${locale}: missing ${label} at ${page.url()}`);
  }
  const screenshotPath = path.join(outputDir, `web-discovery-${locale}-${width}-${suffix}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await context.close();
  return screenshotPath;
}

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const screenshots = [
    await capture(browser, "ar", 390, 844, "", "initial"),
    await capture(browser, "en", 390, 844, "", "initial"),
    await capture(browser, "ar", 390, 844, "?specialtyCategorySlug=anxiety", "filtered"),
    await capture(browser, "en", 390, 844, "?specialtyCategorySlug=anxiety", "filtered"),
    await capture(browser, "ar", 1440, 1000, "?specialtyCategorySlug=anxiety", "desktop-filtered"),
    await capture(browser, "en", 1440, 1000, "?specialtyCategorySlug=anxiety", "desktop-filtered"),
  ];
  console.log(JSON.stringify({ outputDir, screenshots }, null, 2));
} finally {
  await browser.close();
}

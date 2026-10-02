import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.SAWIYAA_B2E1_WEB_URL ?? "http://127.0.0.1:3100";
const outputDir = path.resolve(process.env.SAWIYAA_B2E1_WEB_OUT ?? path.join(process.cwd(), "test-artifacts", "BLOC-2E1"));

async function capture(browser, locale, width, route, name, expected) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: locale === "ar" ? "ar-EG" : "en-US", timezoneId: "Africa/Cairo" });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/${locale}${route}`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.getByText(expected.title, { exact: true }).first().waitFor({ state: "visible", timeout: 20_000 });
  if (expected.bio) await page.getByText(expected.bio, { exact: false }).first().waitFor({ state: "visible", timeout: 20_000 });
  const screenshotPath = path.join(outputDir, `web-${locale}-${width}-${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await context.close();
  return screenshotPath;
}

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const screenshots = [];
  for (const locale of ["ar", "en"]) {
    const expected = locale === "ar"
      ? { title: "أخصائية نفسية إكلينيكية", bio: "تقدم دعمًا نفسيًا" }
      : { title: "Clinical Psychologist", bio: "Provides calm" };
    screenshots.push(await capture(browser, locale, 390, "/practitioners", "discovery", { ...expected, bio: null }));
    screenshots.push(await capture(browser, locale, 1440, "/practitioners", "discovery-desktop", { ...expected, bio: null }));
    screenshots.push(await capture(browser, locale, 390, "/practitioners/same-practitioner", "profile", expected));
    screenshots.push(await capture(browser, locale, 1440, "/practitioners/same-practitioner", "profile-desktop", expected));
  }
  console.log(JSON.stringify({ outputDir, screenshots }, null, 2));
} finally {
  await browser.close();
}

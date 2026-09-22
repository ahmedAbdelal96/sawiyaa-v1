import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { installPatientMoreSettingsFixtureRoutes } from "./visual-qa-patient-more-settings-fixture.mjs";
import { patientVisualQaAuth } from "./visual-qa-patient-home-fixture.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = process.env.SAWIYAA_VISUAL_QA_URL ?? "http://localhost:8081";
const outputDir = path.resolve(process.env.SAWIYAA_PATIENT_MORE_VISUAL_QA_OUT ?? path.join(root, "test", "ux", "UX-8C"));

function authStorageInit() {
  return ({ auth, language }) => {
    localStorage.clear();
    localStorage.setItem("sawiyaa.app.language", language);
    localStorage.setItem("sawiyaa.mobile.device.id.v1", "visual-qa-patient-device");
    localStorage.setItem("sawiyaa.mobile.auth.tokens.access.v1", auth.tokens.accessToken);
    localStorage.setItem("sawiyaa.mobile.auth.tokens.refresh.v1", auth.tokens.refreshToken);
    localStorage.setItem("sawiyaa.mobile.auth.tokens.access.expiresAt.v1", auth.tokens.accessTokenExpiresAt);
    localStorage.setItem("sawiyaa.mobile.auth.tokens.refresh.expiresAt.v1", auth.tokens.refreshTokenExpiresAt);
    localStorage.setItem("sawiyaa.mobile.auth.session.v2", JSON.stringify({ role: auth.role, user: auth.user }));
  };
}

async function capture(page, locale, width, route, name, testId) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle", timeout: 45000 });
  try {
    await page.getByTestId(testId).waitFor({ state: "visible", timeout: 15000 });
  } catch (error) {
    console.error(`${name} did not render`, (await page.locator("body").innerText()).slice(0, 2000));
    throw error;
  }
  await hideDevRefreshBanner(page);
  const bodyText = await page.locator("body").innerText();
  for (const technical of ["P-", "Africa/Cairo", "Asia/Riyadh", "IN_APP", "PUSH", "EMAIL"]) {
    if (bodyText.includes(technical)) throw new Error(`${name} leaked technical value: ${technical}`);
  }
  const file = path.join(outputDir, `patient-${name}-${locale}-${width}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function hideDevRefreshBanner(page) {
  const bannerText = page.getByText("Refreshing...", { exact: true });
  if (!(await bannerText.count())) return;
  await bannerText.first().evaluate((element) => {
    let current = element;
    for (let index = 0; index < 4 && current.parentElement; index += 1) {
      current = current.parentElement;
      if (current.textContent?.includes("Don't see your changes?")) {
        current.style.setProperty("display", "none", "important");
        return;
      }
    }
  });
}

async function captureLocale(browser, locale, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, locale: locale === "ar" ? "ar-SA" : "en-US", timezoneId: "Africa/Cairo" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await installPatientMoreSettingsFixtureRoutes(page);
  await page.addInitScript(authStorageInit(), { auth: patientVisualQaAuth, language: locale });
  const files = [];
  files.push(await capture(page, locale, width, "/(patient)/profile", "more-top", "patient-more-screen"));
  await page.getByText(locale === "ar" ? "تسجيل الخروج" : "Log Out", { exact: true }).last().scrollIntoViewIfNeeded();
  await hideDevRefreshBanner(page);
  const lowerMore = path.join(outputDir, `patient-more-lower-${locale}-${width}.png`);
  await page.screenshot({ path: lowerMore, fullPage: false });
  files.push(lowerMore);
  files.push(await capture(page, locale, width, "/(patient)/profile-details", "profile", "patient-profile-edit-screen"));
  files.push(await capture(page, locale, width, "/(patient)/profile-preferences", "settings", "patient-settings-screen"));
  files.push(await capture(page, locale, width, "/(patient)/profile-notifications", "notification-settings", "patient-notification-settings-screen"));
  await context.close();
  if (errors.length) throw new Error(`${locale}: page errors: ${errors.join(" | ")}`);
  return files;
}

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const results = [await captureLocale(browser, "ar", 360, 844), await captureLocale(browser, "en", 390, 844), await captureLocale(browser, "en", 430, 932)];
  console.log(JSON.stringify({ outputDir, results }, null, 2));
} finally {
  await browser.close();
}

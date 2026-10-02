import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { installPatientNotificationsFixtureRoutes } from "./visual-qa-patient-notifications-fixture.mjs";
import { patientVisualQaAuth } from "./visual-qa-patient-home-fixture.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = process.env.SAWIYAA_VISUAL_QA_URL ?? "http://localhost:8081";
const outputDir = path.resolve(process.env.SAWIYAA_PATIENT_NOTIFICATIONS_VISUAL_QA_OUT ?? path.join(root, "test", "ux", "UX-8B"));

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

async function assertFeedSafety(page) {
  const bodyText = await page.locator("body").innerText();
  for (const value of ["SESSIONS.SESSION-REMINDER", "PAYMENTS.PAYMENT-FAILED", "MESSAGES.SESSION-MESSAGE-RECEIVED", "Africa/Cairo"]) {
    if (bodyText.includes(value)) throw new Error(`Technical notification string leaked into Patient feed: ${value}`);
  }
  const duplicateHeaderMessages = await page.locator('[aria-label*="Messages"], [aria-label*="الرسائل"]').count();
  if (duplicateHeaderMessages > 0) throw new Error("Patient header still exposes a duplicate Messages utility");
}

async function captureFeed(page, locale, width, state, suffix) {
  await page.goto(`${baseUrl}/(patient)/notifications?notificationState=${state}`, { waitUntil: "networkidle", timeout: 45000 });
  await page.getByTestId("notifications-screen").waitFor({ state: "visible", timeout: 15000 });
  if (state === "populated") await page.getByTestId("patient-notification-notification-session").waitFor({ state: "visible", timeout: 15000 });
  if (state === "populated") {
    const informationalRow = page.getByTestId("patient-notification-notification-info");
    if (await informationalRow.getByText("Open", { exact: true }).count()) {
      throw new Error("Identifier-less notification incorrectly exposes an action chevron");
    }
  }
  await assertFeedSafety(page);
  await hideDevRefreshBanner(page);
  const file = path.join(outputDir, `patient-notifications-${locale}-${width}-${suffix}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function assertDeepLinks(page) {
  await page.goto(`${baseUrl}/(patient)/notifications?notificationState=populated`, { waitUntil: "networkidle", timeout: 45000 });
  await page.getByTestId("patient-notification-notification-session").click();
  await page.waitForURL(/\/sessions\/session-1$/, { timeout: 15000 });

  await page.goto(`${baseUrl}/(patient)/notifications?notificationState=populated`, { waitUntil: "networkidle", timeout: 45000 });
  await page.getByTestId("patient-notification-notification-payment").click();
  await page.waitForURL(/\/sessions\/session-1\/pay$/, { timeout: 15000 });

  await page.goto(`${baseUrl}/(patient)/notifications?notificationState=populated`, { waitUntil: "networkidle", timeout: 45000 });
  await page.getByTestId("patient-notification-notification-message").click();
  await page.waitForURL(/\/messages\/conversation-1$/, { timeout: 15000 });
}

async function captureLocale(browser, locale, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, locale: locale === "ar" ? "ar-SA" : "en-US", timezoneId: "Africa/Cairo" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await installPatientNotificationsFixtureRoutes(page);
  await page.addInitScript(authStorageInit(), { auth: patientVisualQaAuth, language: locale });
  const files = [
    await captureFeed(page, locale, width, "populated", "populated"),
    await captureFeed(page, locale, width, "empty", "empty"),
  ];
  await assertDeepLinks(page);
  await context.close();
  if (errors.length) throw new Error(`${locale}: page errors: ${errors.join(" | ")}`);
  return { locale, width, files, deepLinks: ["session", "payment", "message"] };
}

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const results = [
    await captureLocale(browser, "ar", 360, 844),
    await captureLocale(browser, "en", 390, 844),
    await captureLocale(browser, "en", 430, 932),
  ];
  console.log(JSON.stringify({ outputDir, results }, null, 2));
} finally {
  await browser.close();
}

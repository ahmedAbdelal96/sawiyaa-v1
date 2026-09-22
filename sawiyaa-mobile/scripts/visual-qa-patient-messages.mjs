import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { installPatientMessagesFixtureRoutes } from "./visual-qa-patient-messages-fixture.mjs";
import { patientVisualQaAuth } from "./visual-qa-patient-home-fixture.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = process.env.SAWIYAA_VISUAL_QA_URL ?? "http://localhost:8081";
const outputDir = path.resolve(process.env.SAWIYAA_PATIENT_MESSAGES_VISUAL_QA_OUT ?? path.join(root, "test", "ux", "UX-8A"));

const copy = {
  ar: { title: "الرسائل", session: "جلسة", support: "دعم", sessionAction: "رسائل الجلسة" },
  en: { title: "Messages", session: "Session", support: "Support", sessionAction: "Session messages" },
};

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

async function assertNoTechnicalStrings(page) {
  const bodyText = await page.locator("body").innerText();
  for (const value of ["SESSION_CONVERSATION", "conversation-1", "support-1", "Africa/Cairo", "MESSAGE_IDEMPOTENCY_CONFLICT"]) {
    if (bodyText.includes(value)) throw new Error(`Technical string leaked into patient messages UI: ${value}`);
  }
}

async function capture(page, locale, width, route, state, suffix, expected = copy[locale].title) {
  await page.goto(`${baseUrl}${route}?messagesState=${state}`, { waitUntil: "networkidle", timeout: 45000 });
  await page.getByText(expected, { exact: true }).first().waitFor({ state: "visible", timeout: 15000 });
  await assertNoTechnicalStrings(page);
  await hideDevRefreshBanner(page);
  const file = path.join(outputDir, `patient-messages-${locale}-${width}-${suffix}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function captureLocale(browser, locale, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, locale: locale === "ar" ? "ar-SA" : "en-US", timezoneId: "Africa/Cairo" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await installPatientMessagesFixtureRoutes(page);
  await page.addInitScript(authStorageInit(), { auth: patientVisualQaAuth, language: locale });

  const files = [];
  await page.goto(`${baseUrl}/(patient)/messages?messagesState=populated`, { waitUntil: "networkidle", timeout: 45000 });
  await page.getByText(copy[locale].title, { exact: true }).first().waitFor({ state: "visible", timeout: 15000 });
  await page.getByText(copy[locale].session, { exact: true }).first().waitFor({ state: "visible", timeout: 15000 });
  await page.getByText(copy[locale].support, { exact: true }).first().waitFor({ state: "visible", timeout: 15000 });
  await assertNoTechnicalStrings(page);
  await hideDevRefreshBanner(page);
  files.push(path.join(outputDir, `patient-messages-${locale}-${width}-inbox.png`));
  await page.screenshot({ path: files.at(-1), fullPage: false });

  files.push(await capture(page, locale, width, "/(patient)/messages", "empty", "empty"));
  files.push(await capture(page, locale, width, "/(patient)/messages/session-1", "populated", "thread", copy[locale].session));

  await page.goto(`${baseUrl}/(patient)/sessions/session-1?messagesState=populated`, { waitUntil: "networkidle", timeout: 45000 });
  await page.getByTestId("patient-session-details-screen").waitFor({ state: "visible", timeout: 15000 });
  await page.getByText(copy[locale].sessionAction, { exact: true }).click();
  await page.getByTestId("patient-message-thread-screen").waitFor({ state: "visible", timeout: 15000 });
  await assertNoTechnicalStrings(page);
  await hideDevRefreshBanner(page);
  files.push(path.join(outputDir, `patient-messages-${locale}-${width}-session-detail-thread.png`));
  await page.screenshot({ path: files.at(-1), fullPage: false });

  await context.close();
  if (errors.length) throw new Error(`${locale}: page errors: ${errors.join(" | ")}`);
  return { locale, width, files };
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

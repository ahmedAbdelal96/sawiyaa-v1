import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  installPatientSessionsFixtureRoutes,
} from "./visual-qa-patient-sessions-fixture.mjs";
import { patientVisualQaAuth } from "./visual-qa-patient-home-fixture.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = process.env.SAWIYAA_VISUAL_QA_URL ?? "http://localhost:8081";
const outputDir = path.resolve(
  process.env.SAWIYAA_PATIENT_SESSIONS_VISUAL_QA_OUT ?? path.join(root, "test", "ux", "UX-7A"),
);

const copy = {
  ar: {
    title: "الجلسات",
    upcoming: "القادمة",
    history: "السجل",
    join: "الانضمام للجلسة",
    pay: "إتمام الدفع",
    view: "عرض الجلسة",
  },
  en: {
    title: "Sessions",
    upcoming: "Upcoming",
    history: "History",
    join: "Join session",
    pay: "Complete payment",
    view: "View session",
  },
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

async function waitForExactText(page, value) {
  await page.getByText(value, { exact: true }).first().waitFor({ state: "visible", timeout: 15000 });
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
  for (const value of ["PENDING_PAYMENT", "READY_TO_JOIN", "PAYMOB", "Africa/Cairo", "sessionCode"]) {
    if (bodyText.includes(value)) throw new Error(`Technical string leaked into patient sessions UI: ${value}`);
  }
}

async function capture(page, locale, width, route, state, suffix, expectedText) {
  await page.goto(`${baseUrl}${route}?sessionsState=${state}`, { waitUntil: "networkidle", timeout: 45000 });
  await waitForExactText(page, copy[locale].title);
  await waitForExactText(page, expectedText);
  await assertNoTechnicalStrings(page);
  await hideDevRefreshBanner(page);
  const file = path.join(outputDir, `patient-sessions-${locale}-${width}-${suffix}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function captureLocale(browser, locale, width, height) {
  const context = await browser.newContext({
    viewport: { width, height },
    locale: locale === "ar" ? "ar-SA" : "en-US",
    timezoneId: "Africa/Cairo",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await installPatientSessionsFixtureRoutes(page);
  await page.addInitScript(authStorageInit(), { auth: patientVisualQaAuth, language: locale });

  const files = [];
  files.push(await capture(page, locale, width, "/(patient)/sessions", "upcoming", "upcoming", copy[locale].join));
  await page.getByTestId("patient-sessions-tab-history").click();
  await waitForExactText(page, copy[locale].history);
  await waitForExactText(page, copy[locale].view);
  await assertNoTechnicalStrings(page);
  await hideDevRefreshBanner(page);
  files.push(path.join(outputDir, `patient-sessions-${locale}-${width}-history.png`));
  await page.screenshot({ path: files.at(-1), fullPage: false });

  if (locale === "ar") {
    files.push(await capture(page, locale, width, "/(patient)/sessions", "empty-upcoming", "empty", "لا توجد جلسات قادمة").catch(async () => {
      await page.goto(`${baseUrl}/(patient)/sessions?sessionsState=empty-upcoming`, { waitUntil: "networkidle", timeout: 45000 });
      await waitForExactText(page, copy[locale].title);
      await waitForExactText(page, "لا توجد جلسات قادمة");
      await hideDevRefreshBanner(page);
      const file = path.join(outputDir, `patient-sessions-${locale}-${width}-empty.png`);
      await page.screenshot({ path: file, fullPage: false });
      return file;
    }));
    files.push(await capture(page, locale, width, "/(patient)/sessions", "payment", "payment", copy[locale].pay));
    files.push(await capture(page, locale, width, "/(patient)/sessions", "joinable", "joinable", copy[locale].join));
    files.push(await capture(page, locale, width, "/(patient)/sessions/joinable", "detail-joinable", "detail-joinable", copy[locale].join));
    files.push(await capture(page, locale, width, "/(patient)/sessions/payment", "detail-payment", "detail-payment", copy[locale].pay));
    files.push(await capture(page, locale, width, "/(patient)/sessions/completed", "detail-completed", "detail-completed", "مكتملة"));
  } else {
    files.push(await capture(page, locale, width, "/(patient)/sessions/joinable", "detail-joinable", "detail-joinable", copy[locale].join));
  }

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

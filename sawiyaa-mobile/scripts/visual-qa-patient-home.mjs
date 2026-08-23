import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  apiEnvelope,
  emptyPatientHome,
  nextSessionForState,
  patientProfile,
  patientVisualQaAuth,
} from "./visual-qa-patient-home-fixture.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = process.env.SAWIYAA_VISUAL_QA_URL ?? "http://localhost:8081";
const outputDir = path.resolve(
  process.env.SAWIYAA_PATIENT_VISUAL_QA_OUT ?? path.join(root, "test", "ux", "UX-5A"),
);

const labels = {
  ar: {
    tabs: ["الرئيسية", "اكتشف", "الجلسات", "الرسائل", "المزيد"],
    discovery: "ابدأ بخطوة تناسب احتياجك",
    payment: "أكمل الدفع لتأكيد جلستك",
    join: "جلستك جاهزة الآن",
    specialist: "Mona Hassan",
  },
  en: {
    tabs: ["Home", "Discover", "Sessions", "Messages", "More"],
    discovery: "Find the right specialist for you",
    payment: "Complete payment to confirm your session",
    join: "Your session is ready now",
    specialist: "Mona Hassan",
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

async function installFixtureRoutes(page) {
  await page.route("**/api/v1/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const state = new URL(page.url()).searchParams.get("homeState") ?? "discovery";

    if (pathname.endsWith("/auth/me")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({
        userId: patientVisualQaAuth.user.id,
        roles: ["PATIENT"],
        sessionId: "visual-qa-patient-session",
        authMethod: "access",
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        featureFlags: [],
      }) });
      return;
    }

    if (pathname.includes("/auth/") && pathname.endsWith("/refresh")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ ...patientVisualQaAuth, nextStep: "AUTHENTICATED", message: "Visual QA fixture" }) });
      return;
    }

    if (pathname.endsWith("/patients/me")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope(patientProfile) });
      return;
    }

    if (pathname.endsWith("/notifications/me/unread-count")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: { unreadCount: 2 } }) });
      return;
    }

    if (pathname.endsWith("/users/me/next-session")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope(nextSessionForState(state)) });
      return;
    }

    if (pathname.endsWith("/patients/me/home")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope(emptyPatientHome) });
      return;
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: null, items: [], pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 1 } }) });
  });
}

async function waitForExactText(page, value) {
  const match = page.getByText(value, { exact: true }).first();
  await match.waitFor({ state: "visible", timeout: 15000 });
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

async function assertTabOrder(page, locale) {
  const centers = [];
  for (const tabLabel of labels[locale].tabs) {
    const box = await page.getByText(tabLabel, { exact: true }).last().boundingBox();
    if (!box) throw new Error(`${locale}: could not measure ${tabLabel}`);
    centers.push(box.x + box.width / 2);
  }
  const valid = centers.every((center, index) => index === 0 || (locale === "ar" ? centers[index - 1] > center : centers[index - 1] < center));
  if (!valid) throw new Error(`${locale}: invalid physical tab order ${centers.join(",")}`);
}

async function captureState(page, locale, width, state, suffix) {
  const copy = labels[locale];
  await page.goto(`${baseUrl}/(patient)?homeState=${state}`, { waitUntil: "networkidle", timeout: 45000 });
  await waitForExactText(page, copy.tabs[0]);
  await waitForExactText(page, state === "discovery" ? copy.discovery : state === "payment" ? copy.payment : state === "joinable" ? copy.join : copy.specialist);
  await assertTabOrder(page, locale);
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `patient-home-${locale}-${width}-${suffix}.png`), fullPage: false });
}

async function captureLocale(browser, locale, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, locale: locale === "ar" ? "ar-SA" : "en-US", timezoneId: "Africa/Cairo" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await installFixtureRoutes(page);
  await page.addInitScript(authStorageInit(), { auth: patientVisualQaAuth, language: locale });

  await captureState(page, locale, width, "upcoming", "upcoming");
  await captureState(page, locale, width, "discovery", "discovery");
  if (locale === "ar") {
    await captureState(page, locale, width, "joinable", "joinable");
    await captureState(page, locale, width, "payment", "payment");
    await page.screenshot({ path: path.join(outputDir, `patient-tabs-${locale}-${width}.png`), fullPage: false });
  }

  await context.close();
  if (errors.length) throw new Error(`${locale}: page errors: ${errors.join(" | ")}`);
  return { locale, width, states: locale === "ar" ? ["upcoming", "discovery", "joinable", "payment"] : ["upcoming", "discovery"] };
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

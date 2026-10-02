import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import {
  apiEnvelope,
  discoveryListResponse,
  localizedDiscoveryItems,
  patientProfile,
  patientVisualQaAuth,
} from "./visual-qa-patient-discovery-fixture.mjs";

const baseUrl = process.env.SAWIYAA_B2E1_MOBILE_URL ?? "http://127.0.0.1:8081";
const outputDir = path.resolve(process.env.SAWIYAA_B2E1_MOBILE_OUT ?? path.join(process.cwd(), "test", "ux", "BLOC-2E1"));

function authStorageInit() {
  return ({ auth, language }) => {
    localStorage.clear();
    localStorage.setItem("sawiyaa.app.language", language);
    localStorage.setItem("sawiyaa.mobile.device.id.v1", "visual-qa-b2e1-device");
    localStorage.setItem("sawiyaa.mobile.auth.tokens.access.v1", auth.tokens.accessToken);
    localStorage.setItem("sawiyaa.mobile.auth.tokens.refresh.v1", auth.tokens.refreshToken);
    localStorage.setItem("sawiyaa.mobile.auth.tokens.access.expiresAt.v1", auth.tokens.accessTokenExpiresAt);
    localStorage.setItem("sawiyaa.mobile.auth.tokens.refresh.expiresAt.v1", auth.tokens.refreshTokenExpiresAt);
    localStorage.setItem("sawiyaa.mobile.auth.session.v2", JSON.stringify({ role: auth.role, user: auth.user }));
  };
}

async function installFixtureRoutes(page, locale) {
  await page.route("**/api/v1/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const fulfill = (data) => route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope(data) });
    if (pathname.endsWith("/auth/me")) return fulfill({ userId: patientVisualQaAuth.user.id, roles: ["PATIENT"], sessionId: "visual-qa-b2e1", authMethod: "access", isActive: true, isEmailVerified: true, isPhoneVerified: true, featureFlags: [] });
    if (pathname.includes("/auth/") && pathname.endsWith("/refresh")) return fulfill({ ...patientVisualQaAuth, nextStep: "AUTHENTICATED", message: "Visual QA fixture" });
    if (pathname.endsWith("/patients/me")) return fulfill(patientProfile);
    if (pathname.endsWith("/notifications/me/unread-count")) return fulfill({ item: { unreadCount: 0 } });
    if (pathname.endsWith("/public/practitioners/mona-hassan")) {
      const detail = localizedDiscoveryItems("initial", locale)[0];
      return fulfill({ item: { ...detail, fullBio: locale === "ar" ? "تقدم دعمًا نفسيًا هادئًا وعمليًا لمساعدتك على فهم مشاعرك وبناء خطوات أكثر توازنًا." : "Provides calm, practical support to help you understand your feelings and build more balanced next steps.", credentialsSummary: { totalCredentials: 2, approvedCredentials: 2 } } });
    }
    if (pathname.endsWith("/public/practitioners")) return route.fulfill({ status: 200, contentType: "application/json", body: discoveryListResponse("initial", locale) });
    return fulfill({ item: null, items: [], pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 1 } });
  });
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

async function captureLocale(browser, locale, width) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, locale: locale === "ar" ? "ar-SA" : "en-US", timezoneId: "Africa/Cairo" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await installFixtureRoutes(page, locale);
  await page.addInitScript(authStorageInit(), { auth: patientVisualQaAuth, language: locale });
  await page.goto(`${baseUrl}/discovery?qaState=initial`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByText(locale === "ar" ? "أخصائية نفسية إكلينيكية" : "Clinical Psychologist", { exact: true }).last().waitFor({ state: "visible", timeout: 20_000 });
  await hideDevRefreshBanner(page);
  const discoveryPath = path.join(outputDir, `mobile-${locale}-${width}-discovery.png`);
  await page.screenshot({ path: discoveryPath, fullPage: false });

  await page.getByText("Mona Hassan", { exact: true }).last().click();
  await page.getByText(locale === "ar" ? "أخصائية نفسية إكلينيكية" : "Clinical Psychologist", { exact: true }).last().waitFor({ state: "visible", timeout: 20_000 });
  await page.getByText(locale === "ar" ? "تقدم دعمًا نفسيًا" : "Provides calm", { exact: false }).last().waitFor({ state: "visible", timeout: 20_000 });
  await hideDevRefreshBanner(page);
  const profilePath = path.join(outputDir, `mobile-${locale}-${width}-profile.png`);
  await page.screenshot({ path: profilePath, fullPage: false });
  await context.close();
  if (errors.length) throw new Error(`${locale}: ${errors.join(" | ")}`);
  return { locale, width, screenshots: [discoveryPath, profilePath] };
}

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const results = [await captureLocale(browser, "ar", 360), await captureLocale(browser, "en", 390)];
  console.log(JSON.stringify({ outputDir, results }, null, 2));
} finally {
  await browser.close();
}

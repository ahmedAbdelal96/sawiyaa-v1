import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  apiEnvelope,
  discoveryListResponse,
  localizedDiscoveryCategories,
  localizedDiscoverySpecialties,
  patientProfile,
  patientVisualQaAuth,
} from "./visual-qa-patient-discovery-fixture.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = process.env.SAWIYAA_VISUAL_QA_URL ?? "http://localhost:8081";
const outputDir = path.resolve(process.env.SAWIYAA_PATIENT_DISCOVERY_VISUAL_QA_OUT ?? path.join(root, "test", "ux", "UX-5B"));

const labels = {
  ar: { discover: "اكتشف", search: "ابحث عن مختص أو تخصص", filter: "فتح الفلاتر", results: "Mona Hassan", noResults: "لم نجد مختصين مطابقين", filters: "الفلاتر", apply: "تطبيق الفلاتر", category: "القلق", tabs: ["الرئيسية", "اكتشف", "الجلسات", "الرسائل", "المزيد"] },
  en: { discover: "Discover", search: "Search specialists or specialties", filter: "Open filters", results: "Mona Hassan", noResults: "No matching specialists", filters: "Filters", apply: "Apply filters", category: "Anxiety", tabs: ["Home", "Discover", "Sessions", "Messages", "More"] },
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
    const requestUrl = new URL(route.request().url());
    const pathname = requestUrl.pathname;
    const locale = route.request().headers()["x-lang"] === "ar" ? "ar" : "en";
    const state = requestUrl.searchParams.get("qaState") ?? "initial";
    const searchQuery = requestUrl.searchParams.get("search") ?? "";
    const resolvedState = /^(none|لا يوجد)$/i.test(searchQuery)
      ? "no-results"
      : requestUrl.searchParams.get("availableToday") === "true"
        ? "filtered"
        : requestUrl.searchParams.get("specialtyCategorySlug")
          ? "specialty"
          : state;

    const fulfill = (data) => route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope(data) });
    if (pathname.endsWith("/auth/me")) return fulfill({ userId: patientVisualQaAuth.user.id, roles: ["PATIENT"], sessionId: "visual-qa-discovery", authMethod: "access", isActive: true, isEmailVerified: true, isPhoneVerified: true, featureFlags: [] });
    if (pathname.includes("/auth/") && pathname.endsWith("/refresh")) return fulfill({ ...patientVisualQaAuth, nextStep: "AUTHENTICATED", message: "Visual QA fixture" });
    if (pathname.endsWith("/patients/me")) return fulfill(patientProfile);
    if (pathname.endsWith("/notifications/me/unread-count")) return fulfill({ item: { unreadCount: 0 } });
    if (pathname.endsWith("/users/me/next-session")) return fulfill(null);
    if (pathname.endsWith("/specialty-categories")) return fulfill({ categories: localizedDiscoveryCategories(locale) });
    if (pathname.endsWith("/specialties")) return fulfill({ specialties: localizedDiscoverySpecialties(locale) });
    if (pathname.endsWith("/public/practitioners")) return route.fulfill({ status: 200, contentType: "application/json", body: discoveryListResponse(resolvedState, locale) });
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

async function waitForText(page, text) {
  try {
    await page.getByText(text, { exact: true }).first().waitFor({ state: "visible", timeout: 15000 });
  } catch (error) {
    console.error(`Missing text ${text} at ${page.url()}`);
    console.error((await page.locator("body").innerText()).slice(0, 1800));
    throw error;
  }
}

async function capture(page, locale, width, suffix) {
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `patient-discovery-${locale}-${width}-${suffix}.png`), fullPage: false });
}

async function openDiscover(page, copy) {
  await page.goto(`${baseUrl}/(patient)?qaState=initial`, { waitUntil: "networkidle", timeout: 45000 });
  await page.getByText(copy.discover, { exact: true }).last().click();
  await page.getByPlaceholder(copy.search).first().waitFor({ state: "visible", timeout: 15000 });
}

async function captureLocale(browser, locale, width, height) {
  const copy = labels[locale];
  const context = await browser.newContext({ viewport: { width, height }, locale: locale === "ar" ? "ar-SA" : "en-US", timezoneId: "Africa/Cairo" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.url().includes("/api/v1/") && response.status() >= 400) console.error(`API ${response.status()} ${response.url()}`);
  });
  await installFixtureRoutes(page);
  await page.addInitScript(authStorageInit(), { auth: patientVisualQaAuth, language: locale });

  await openDiscover(page, copy);
  await waitForText(page, copy.category);
  await capture(page, locale, width, "initial");

  const searchInput = page.getByPlaceholder(copy.search).first();
  await searchInput.fill(locale === "ar" ? "قلق" : "anxiety");
  await waitForText(page, copy.results);
  await capture(page, locale, width, "search-results");

  await openDiscover(page, copy);
  await page.getByText(copy.category, { exact: true }).first().click();
  await waitForText(page, copy.results);
  await capture(page, locale, width, "specialty-selected");

  await page.getByRole("button", { name: copy.filter }).click();
  await waitForText(page, copy.filters);
  await capture(page, locale, width, "filters-open");
  if (locale === "en") await page.getByText("Available today", { exact: true }).click();
  else await page.getByText("متاح اليوم", { exact: true }).click();
  await page.getByText(copy.apply, { exact: true }).click();
  await waitForText(page, copy.results);
  await capture(page, locale, width, "filtered");

  await openDiscover(page, copy);
  await page.getByPlaceholder(copy.search).first().fill(locale === "ar" ? "لا يوجد" : "none");
  await waitForText(page, copy.noResults);
  await capture(page, locale, width, "no-results");

  await context.close();
  if (errors.length) throw new Error(`${locale}: page errors: ${errors.join(" | ")}`);
  return { locale, width, states: ["initial", "search-results", "specialty-selected", "filtered", "no-results"] };
}

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const results = [await captureLocale(browser, "ar", 360, 844), await captureLocale(browser, "en", 390, 844), await captureLocale(browser, "en", 430, 932)];
  console.log(JSON.stringify({ outputDir, results }, null, 2));
} finally {
  await browser.close();
}

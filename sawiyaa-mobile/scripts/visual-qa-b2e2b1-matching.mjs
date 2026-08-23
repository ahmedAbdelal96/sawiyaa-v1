import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  installMatchingVisualQaRoutes,
  matchingVisualQaLocalizedTitles,
  matchingVisualQaSession,
  matchingVisualQaSessionId,
  patientVisualQaAuth,
} from "./visual-qa-b2e2b1-matching-fixture.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = process.env.SAWIYAA_VISUAL_QA_URL ?? "http://localhost:8081";
const outputDir = path.resolve(
  process.env.SAWIYAA_BLOC_2E2B1_VISUAL_QA_OUT ?? path.join(root, "test", "ux", "BLOC-2E2B1"),
);

const copy = {
  ar: {
    header: "الترشيحات",
    name: "Mona Hassan",
    title: matchingVisualQaLocalizedTitles.ar,
    primaryCta: "احجز الآن",
    secondaryCta: "عرض الملف",
  },
  en: {
    header: "Your matches",
    name: "Mona Hassan",
    title: matchingVisualQaLocalizedTitles.en,
    primaryCta: "Book now",
    secondaryCta: "View profile",
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

function stableResult(result) {
  const item = result.items[0];
  return {
    name: item.practitioner.displayName,
    rank: item.rank,
    score: item.score,
    price30: item.practitioner.sessionPrice30,
    price60: item.practitioner.sessionPrice60,
    currency: "EGP",
    slug: item.practitioner.slug,
    reasons: Object.entries(item.rationale)
      .filter(([key, value]) => key.startsWith("matched") && value === true)
      .map(([key]) => key),
  };
}

async function openAndCapture(browser, locale, width, height, suffix) {
  const context = await browser.newContext({
    viewport: { width, height },
    locale: locale === "ar" ? "ar-SA" : "en-US",
    timezoneId: "Africa/Cairo",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await installMatchingVisualQaRoutes(page);
  await page.addInitScript(authStorageInit(), { auth: patientVisualQaAuth, language: locale });

  await page.goto(`${baseUrl}/(patient)/matching/results?sessionId=${matchingVisualQaSessionId}`, {
    waitUntil: "networkidle",
    timeout: 45000,
  });
  await waitForExactText(page, copy[locale].header);
  await waitForExactText(page, copy[locale].name);
  await waitForExactText(page, copy[locale].title);
  await waitForExactText(page, copy[locale].primaryCta);
  await waitForExactText(page, copy[locale].secondaryCta);

  const bodyText = await page.locator("body").innerText();
  if (!bodyText.includes("88") && !bodyText.includes("٨٨")) throw new Error(`${locale}: score not visible`);
  if (bodyText.includes(locale === "ar" ? copy.en.title : copy.ar.title)) {
    throw new Error(`${locale}: opposite professional title leaked`);
  }
  const direction = await page.getByText(copy[locale].title, { exact: true }).first().evaluate((element) => getComputedStyle(element).direction || null);
  const htmlLocale = await page.locator("html").getAttribute("lang");
  if (direction !== (locale === "ar" ? "rtl" : "ltr")) throw new Error(`${locale}: expected ${locale === "ar" ? "rtl" : "ltr"}, got ${direction}`);
  await hideDevRefreshBanner(page);
  const file = path.join(outputDir, `matching-mobile-${locale}-${width}-${suffix}.png`);
  await page.screenshot({ path: file, fullPage: false });
  await context.close();
  if (errors.length) throw new Error(`${locale}: page errors: ${errors.join(" | ")}`);
  return { locale, width, file, direction, htmlLocale, stable: stableResult(matchingVisualQaSession) };
}

async function assertLocaleIsolation(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: "Africa/Cairo" });
  const page = await context.newPage();
  await installMatchingVisualQaRoutes(page);
  await page.addInitScript(({ auth }) => {
    const locale = new URLSearchParams(window.location.search).get("qaLocale") === "en" ? "en" : "ar";
    localStorage.clear();
    localStorage.setItem("sawiyaa.app.language", locale);
    localStorage.setItem("sawiyaa.mobile.device.id.v1", "visual-qa-patient-device");
    localStorage.setItem("sawiyaa.mobile.auth.tokens.access.v1", auth.tokens.accessToken);
    localStorage.setItem("sawiyaa.mobile.auth.tokens.refresh.v1", auth.tokens.refreshToken);
    localStorage.setItem("sawiyaa.mobile.auth.tokens.access.expiresAt.v1", auth.tokens.accessTokenExpiresAt);
    localStorage.setItem("sawiyaa.mobile.auth.tokens.refresh.expiresAt.v1", auth.tokens.refreshTokenExpiresAt);
    localStorage.setItem("sawiyaa.mobile.auth.session.v2", JSON.stringify({ role: auth.role, user: auth.user }));
  }, { auth: patientVisualQaAuth });

  for (const locale of ["ar", "en", "ar"]) {
    await page.goto(`${baseUrl}/(patient)/matching/results?sessionId=${matchingVisualQaSessionId}&qaLocale=${locale}`, {
      waitUntil: "networkidle",
      timeout: 45000,
    });
    await waitForExactText(page, copy[locale].title);
    const bodyText = await page.locator("body").innerText();
    if (bodyText.includes(locale === "ar" ? copy.en.title : copy.ar.title)) throw new Error(`locale cache leaked into ${locale}`);
    const direction = await page.getByText(copy[locale].title, { exact: true }).first().evaluate((element) => getComputedStyle(element).direction || null);
    if (direction !== (locale === "ar" ? "rtl" : "ltr")) throw new Error(`locale isolation direction failed for ${locale}`);
  }
  await context.close();
  return "AR -> EN -> AR passed";
}

await fs.mkdir(outputDir, { recursive: true });
const fixtureSource = await fs.readFile(path.join(root, "scripts", "visual-qa-b2e2b1-matching-fixture.mjs"), "utf8");
const runnerSource = await fs.readFile(path.join(root, "scripts", "visual-qa-b2e2b1-matching.mjs"), "utf8");
for (const required of ["أخصائي نفسي إكلينيكي", "Clinical Psychologist"]) {
  if (!fixtureSource.includes(required) && !runnerSource.includes(required)) throw new Error(`Fixture UTF-8 validation failed for ${required}`);
}

const browser = await chromium.launch({ headless: true });
try {
  const sequence = [
    await openAndCapture(browser, "ar", 360, 844, "rtl"),
    await openAndCapture(browser, "en", 390, 844, "ltr"),
    await openAndCapture(browser, "ar", 360, 844, "rtl-repeat"),
  ];
  const stableResults = sequence.map((entry) => JSON.stringify(entry.stable));
  if (new Set(stableResults).size !== 1) throw new Error("AR/EN stable matching fields differ");
  const localeIsolation = await assertLocaleIsolation(browser);
  console.log(JSON.stringify({ outputDir, sequence, localeIsolation, stableResult: sequence[0].stable }, null, 2));
} finally {
  await browser.close();
}

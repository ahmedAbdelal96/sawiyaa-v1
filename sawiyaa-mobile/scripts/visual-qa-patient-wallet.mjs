import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { installPatientWalletFixtureRoutes } from "./visual-qa-patient-wallet-fixture.mjs";
import { patientVisualQaAuth } from "./visual-qa-patient-home-fixture.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = process.env.SAWIYAA_VISUAL_QA_URL ?? "http://localhost:8081";
const outputDir = path.resolve(process.env.SAWIYAA_PATIENT_WALLET_VISUAL_QA_OUT ?? path.join(root, "test", "ux", "UX-7B"));

const copy = {
  ar: {
    wallet: "المحفظة",
    activity: "النشاط الأخير",
    transactions: "المعاملات",
    refund: "استرداد مبلغ",
    empty: "لا توجد معاملات بعد",
    error: "النشاط الأخير غير متاح",
  },
  en: {
    wallet: "Wallet",
    activity: "Recent activity",
    transactions: "Transactions",
    refund: "Refund",
    empty: "No transactions yet",
    error: "Recent activity is unavailable",
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

async function waitForExactText(page, value, timeout = 15000) {
  try {
    await page.getByText(value, { exact: true }).first().waitFor({ state: "visible", timeout });
  } catch (error) {
    console.error(`Could not find expected text: ${value}`);
    console.error((await page.locator("body").innerText()).slice(0, 1200));
    throw error;
  }
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

async function assertNoProviderInternals(page) {
  const body = await page.locator("body").innerText();
  for (const value of ["PAYMOB", "provider-reference", "PAYMENT_PROVIDER_UNAVAILABLE", "gateway", "webhook", "ledger"]) {
    if (body.toLowerCase().includes(value.toLowerCase())) throw new Error(`Provider/internal term leaked: ${value}`);
  }
}

async function capture(page, locale, width, route, state, suffix, expectedText, options = {}) {
  await page.goto(`${baseUrl}${route}?walletState=${state}`, { waitUntil: options.loading ? "domcontentloaded" : "networkidle", timeout: 45000 });
  await waitForExactText(page, route.includes("transactions") ? copy[locale].transactions : copy[locale].wallet);
  await waitForExactText(page, expectedText, options.timeout ?? 15000);
  await assertNoProviderInternals(page);
  await hideDevRefreshBanner(page);
  const file = path.join(outputDir, `patient-wallet-${locale}-${width}-${suffix}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function captureLocale(browser, locale, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, locale: locale === "ar" ? "ar-SA" : "en-US", timezoneId: "Africa/Cairo" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await installPatientWalletFixtureRoutes(page);
  await page.addInitScript(authStorageInit(), { auth: patientVisualQaAuth, language: locale });

  const files = [];
  files.push(await capture(page, locale, width, "/(patient)/payments", "populated", "populated", copy[locale].activity));
  files.push(await capture(page, locale, width, "/(patient)/payments", "refund", "refund", copy[locale].refund));
  files.push(await capture(page, locale, width, "/(patient)/payments/transactions", "populated", "transactions", copy[locale].transactions));
  files.push(await capture(page, locale, width, "/(patient)/payments", "empty", "empty", copy[locale].empty));
  files.push(await capture(page, locale, width, "/(patient)/payments", "error", "error", copy[locale].error));
  if (locale === "ar") {
    await page.goto(`${baseUrl}/(patient)/payments?walletState=loading`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await waitForExactText(page, copy[locale].wallet);
    await waitForExactText(page, "جاري تحميل بيانات المحفظة...", 5000);
    await assertNoProviderInternals(page);
    await hideDevRefreshBanner(page);
    const loadingFile = path.join(outputDir, `patient-wallet-${locale}-${width}-loading.png`);
    await page.screenshot({ path: loadingFile, fullPage: false });
    files.push(loadingFile);
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

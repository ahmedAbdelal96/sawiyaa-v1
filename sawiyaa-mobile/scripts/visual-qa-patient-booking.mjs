import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createBookingFixtureState, installBookingFixture, patientVisualQaAuth } from "./visual-qa-patient-booking-fixture.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = process.env.SAWIYAA_VISUAL_QA_URL ?? "http://localhost:8081";
const outputDir = path.resolve(process.env.SAWIYAA_PATIENT_BOOKING_VISUAL_QA_OUT ?? path.join(root, "test", "ux", "UX-6"));

const copy = {
  ar: { duration: "اختر مدة الجلسة", minutes30: "30 دقيقة", continueAppointment: "اختر موعدًا", appointment: "اختر موعد الجلسة", review: "راجع حجزك", payment: "مراجعة الدفع", apply: "تطبيق", promo: "أدخل كود الخصم", confirm: "تأكيد ودفع", confirmed: "تم تأكيد الحجز", package: "لديك باقة مؤهلة؟" },
  en: { duration: "Choose session duration", minutes30: "30 minutes", continueAppointment: "Choose an appointment", appointment: "Choose an appointment", review: "Review your booking", payment: "Review and pay", apply: "Apply", promo: "Enter coupon code", confirm: "Confirm & Pay", confirmed: "Booking confirmed", package: "Have an eligible package?" },
};

function authStorageInit() {
  return ({ auth, language }) => {
    localStorage.clear();
    localStorage.setItem("sawiyaa.app.language", language);
    localStorage.setItem("sawiyaa.mobile.device.id.v1", "visual-qa-booking-device");
    localStorage.setItem("sawiyaa.mobile.auth.tokens.access.v1", auth.tokens.accessToken);
    localStorage.setItem("sawiyaa.mobile.auth.tokens.refresh.v1", auth.tokens.refreshToken);
    localStorage.setItem("sawiyaa.mobile.auth.tokens.access.expiresAt.v1", auth.tokens.accessTokenExpiresAt);
    localStorage.setItem("sawiyaa.mobile.auth.tokens.refresh.expiresAt.v1", auth.tokens.refreshTokenExpiresAt);
    localStorage.setItem("sawiyaa.mobile.auth.session.v2", JSON.stringify({ role: auth.role, user: auth.user }));
  };
}

async function capture(page, locale, width, state) {
  await page.screenshot({ path: path.join(outputDir, `patient-booking-${locale}-${width}-${state}.png`), fullPage: false });
}

async function visibleText(page, text) {
  const matches = page.getByText(text, { exact: true });
  for (let index = 0; index < await matches.count(); index += 1) {
    const candidate = matches.nth(index);
    if (await candidate.isVisible()) return candidate;
  }
  throw new Error(`Missing visible text ${text}`);
}

async function visibleButton(page, name) {
  const matches = page.getByRole("button", { name });
  for (let index = 0; index < await matches.count(); index += 1) {
    const candidate = matches.nth(index);
    if (await candidate.isVisible() && await candidate.isEnabled()) return candidate;
  }
  throw new Error(`Missing enabled button ${name}`);
}

async function waitFor(page, text) {
  try {
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      try {
        await visibleText(page, text);
        return;
      } catch {
        await page.waitForTimeout(250);
      }
    }
    throw new Error(`Missing visible text ${text}`);
  } catch (error) {
    console.error(`Missing ${text} at ${page.url()}`);
    console.error((await page.locator("body").innerText()).slice(0, 2400));
    throw error;
  }
}

async function captureLocale(browser, locale, width) {
  const labels = copy[locale];
  const context = await browser.newContext({ viewport: { width, height: 844 }, locale: locale === "ar" ? "ar-SA" : "en-US", timezoneId: "Africa/Cairo" });
  const page = await context.newPage();
  const errors = [];
  const fixtureState = createBookingFixtureState();
  page.on("pageerror", (error) => { errors.push(error.message); console.error(`${locale} PAGEERROR: ${error.message}`); });
  await installBookingFixture(page, fixtureState);
  await page.addInitScript(authStorageInit(), { auth: patientVisualQaAuth, language: locale });
  await page.goto(`${baseUrl}/(patient)/sessions/duration?slug=mona-hassan`, { waitUntil: "networkidle", timeout: 45000 });
  await waitFor(page, labels.duration);
  await capture(page, locale, width, "duration");
  await waitFor(page, labels.package);
  await capture(page, locale, width, "duration-package");
  await (await visibleText(page, labels.minutes30)).click();
  await (await visibleButton(page, labels.continueAppointment)).click();
  await waitFor(page, labels.appointment);
  await capture(page, locale, width, "appointment");
  const firstTime = page.getByRole("button").filter({ hasText: /10:00|10٫00|١٠/ }).first();
  try {
    await firstTime.waitFor({ state: "visible", timeout: 20000 });
  } catch (error) {
    console.error((await page.locator("body").innerText()).slice(0, 2600));
    throw error;
  }
  await firstTime.click();
  await capture(page, locale, width, "time-selected");
  await (await visibleButton(page, locale === "ar" ? "متابعة" : "Continue")).click();
  await waitFor(page, labels.review);
  await capture(page, locale, width, "review");
  await page.waitForTimeout(500);
  const paymentCta = locale === "ar" ? "المتابعة إلى الدفع" : "Continue to payment";
  await (await visibleButton(page, paymentCta)).click();
  await waitFor(page, locale === "ar" ? "سعر الجلسة" : "Session price");
  await (await visibleButton(page, paymentCta)).click();
  await waitFor(page, labels.payment);
  await capture(page, locale, width, "payment");
  await page.getByPlaceholder(labels.promo).fill("WELCOME10");
  await (await visibleText(page, labels.apply)).click();
  await waitFor(page, locale === "ar" ? "تم تطبيق كود الخصم WELCOME10" : "Promo code WELCOME10 applied");
  await capture(page, locale, width, "promo-applied");
  await page.getByText(locale === "ar" ? "مراجعة سياسة الاسترداد" : "Review refund policy", { exact: true }).click();
  await page.mouse.move(width / 2, 520);
  await page.mouse.wheel(0, 1800);
  await page.waitForTimeout(400);
  await (await visibleText(page, locale === "ar" ? "أوافق على سياسة استرداد هذه الجلسة." : "I accept the session refund policy.")).click();
  await (await visibleText(page, locale === "ar" ? "أوافق وأكمل" : "I understand and continue")).click();
  await (await visibleButton(page, labels.confirm)).click();
  await waitFor(page, labels.confirmed);
  await capture(page, locale, width, "confirmation");
  await context.close();
  if (errors.length) throw new Error(`${locale}: ${errors.join(" | ")}`);
  return { locale, width, states: ["duration", "duration-package", "appointment", "time-selected", "review", "payment", "promo-applied", "confirmation"] };
}

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const results = [await captureLocale(browser, "ar", 360), await captureLocale(browser, "en", 390), await captureLocale(browser, "en", 430)];
  console.log(JSON.stringify({ outputDir, results }, null, 2));
} finally {
  await browser.close();
}

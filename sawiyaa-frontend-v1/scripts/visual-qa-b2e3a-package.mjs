import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = process.env.SAWIYAA_PACKAGE_WEB_URL ?? "http://127.0.0.1:3100";
const outputDir = path.resolve(
  process.env.SAWIYAA_BLOC_2E3A_WEB_OUT ??
    path.join(root, "test-artifacts", "BLOC-2E3A"),
);

const practitionerId = "visual-qa-package-practitioner";
const purchaseId = "visual-qa-package-purchase";
const titles = {
  ar: "أخصائي نفسي إكلينيكي",
  en: "Clinical Psychologist",
};

function envelope(data) {
  return JSON.stringify({ success: true, data });
}

function authCookies(locale) {
  return [
    {
      name: "sawiyaa_access_token",
      value: "visual-qa-patient-access-token",
      url: baseUrl,
    },
    { name: "sawiyaa_user_role", value: "PATIENT", url: baseUrl },
    {
      name: "sawiyaa_user_data",
      value: JSON.stringify({
        id: "visual-qa-patient",
        displayName: "Salma Hassan",
        roles: ["PATIENT"],
        role: "PATIENT",
      }),
      url: baseUrl,
    },
    { name: "preferred_language", value: locale, url: baseUrl },
  ];
}

function offer(locale) {
  return {
    practitioner: {
      id: practitionerId,
      publicSlug: "sarah-ahmed",
      displayName: "Dr. Sarah Ahmed",
      avatarUrl: null,
      professionalTitle: titles[locale],
      specialties: [{ id: "specialty-1", name: locale === "ar" ? "العلاج النفسي" : "Therapy" }],
    },
    packagePlan: {
      id: "plan-4",
      code: "STANDARD_4",
      title: locale === "ar" ? "باقة 4 جلسات" : "Four-session package",
      description: locale === "ar" ? "مرونة أكبر مع توفير على الجلسات." : "More flexibility with session savings.",
      sessionCount: 4,
      discountPercent: "10",
    },
    selectedDurationMinutes: 30,
    sessionMode: "VIDEO",
    availableDurations: [
      {
        durationMinutes: 30,
        quote: {
          currencyCode: "EGP",
          baseSessionPrice: "500",
          undiscountedTotal: "2000",
          discountAmount: "200",
          patientPayableTotal: "1800",
        },
      },
      {
        durationMinutes: 60,
        quote: {
          currencyCode: "EGP",
          baseSessionPrice: "900",
          undiscountedTotal: "3600",
          discountAmount: "360",
          patientPayableTotal: "3240",
        },
      },
    ],
    activeQuote: {
      currencyCode: "EGP",
      baseSessionPrice: "500",
      undiscountedTotal: "2000",
      discountAmount: "200",
      patientPayableTotal: "1800",
    },
    ctaHref: "/practitioners/sarah-ahmed",
  };
}

function purchase(locale) {
  return {
    id: purchaseId,
    status: "ACTIVE",
    planCode: "STANDARD_4",
    title: locale === "ar" ? "باقة 4 جلسات" : "Four-session package",
    description: null,
    sessionCount: 4,
    discountPercent: "10",
    practitionerId,
    practitioner: {
      id: practitionerId,
      publicSlug: "sarah-ahmed",
      displayName: "Dr. Sarah Ahmed",
      avatarUrl: null,
      professionalTitle: titles[locale],
    },
    progress: {
      totalSessions: 4,
      completedSessions: 1,
      remainingSessions: 3,
      scheduledSessions: 1,
      progressPercent: 25,
    },
    durationMinutes: 30,
    sessionMode: "VIDEO",
    selectedCurrencyCode: "EGP",
    regionalPricingMode: "EGYPT_LOCAL",
    resolvedCountryIsoCode: "EG",
    selectedBaseSessionPrice: "500",
    undiscountedTotal: "2000",
    discountAmount: "200",
    patientPayableTotal: "1800",
    paymentExpiresAt: null,
    linkedSessionsCount: 1,
    linkedSessions: {
      totalItems: 1,
      items: [
        {
          id: "visual-qa-package-session",
          sessionCode: "SW-PKG-001",
          status: "UPCOMING",
          operational: {
            state: "UPCOMING",
            timelineBucket: "PENDING",
            reasonCode: "LIFECYCLE_STATUS",
            join: { allowed: false, reasonCode: "SESSION_NOT_STARTED", canPrepareRuntime: false, opensAt: null, closesAt: null },
            actions: { canJoin: false, canPrepareRuntime: false, canCancel: false, canPay: false, canReview: false, canMarkPatientNoShow: false, noShowReasonCode: null },
            attendance: { patientTrustedAttendance: false, practitionerTrustedAttendance: false, reconciliationStatus: "NOT_AVAILABLE", outcomeRecommendation: null },
            room: { state: "NOT_PREPARED", closedAt: null },
            resolution: { required: false, finalDecision: null },
            replacement: { replacesSessionId: null },
          },
          scheduledStartAt: "2026-08-20T15:00:00.000Z",
          scheduledEndAt: "2026-08-20T15:30:00.000Z",
          durationMinutes: 30,
          sessionMode: "VIDEO",
          packageSessionIndex: 2,
        },
      ],
    },
    createdAt: "2026-08-10T12:00:00.000Z",
    updatedAt: "2026-08-10T12:00:00.000Z",
  };
}

async function installFixtureRoutes(page, locale) {
  await page.route("**/api/v1/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const fulfill = (data) =>
      route.fulfill({
        status: 200,
        contentType: "application/json; charset=utf-8",
        body: envelope(data),
      });

    if (pathname.endsWith("/auth/me")) {
      return fulfill({ userId: "visual-qa-patient", roles: ["PATIENT"], isActive: true, isEmailVerified: true, isPhoneVerified: true, featureFlags: [] });
    }
    if (pathname.endsWith("/users/me")) {
      return fulfill({ id: "visual-qa-patient", userId: "visual-qa-patient", displayName: "Salma Hassan", roles: ["PATIENT"] });
    }
    if (pathname.endsWith("/patients/me")) {
      return fulfill({ profile: { displayName: "Salma Hassan", timezone: "Africa/Cairo" } });
    }
    if (pathname.endsWith("/public/package-offers")) {
      return fulfill({ items: [offer(locale)], pagination: { page: 1, limit: 12, totalItems: 1, totalPages: 1 } });
    }
    if (pathname.endsWith(`/patients/me/package-purchases/${purchaseId}`)) {
      return fulfill({ item: purchase(locale) });
    }
    if (pathname.endsWith("/patients/me/package-purchases")) {
      return fulfill({ items: [purchase(locale)], pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1 } });
    }
    if (pathname.endsWith("/notifications/me/unread-count")) {
      return fulfill({ item: { unreadCount: 0 } });
    }
    if (pathname.includes("/auth/") && pathname.endsWith("/refresh")) {
      return fulfill({ tokens: { accessToken: "visual-qa-patient-access-token", refreshToken: "visual-qa-patient-refresh-token" }, nextStep: "AUTHENTICATED" });
    }
    return fulfill({ item: null, items: [], pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 1 } });
  });
}

async function capture(browser, locale, pathName, fileName, expectedTitle) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    locale: locale === "ar" ? "ar-SA" : "en-US",
    timezoneId: "Africa/Cairo",
  });
  await context.addCookies(authCookies(locale));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await installFixtureRoutes(page, locale);
  await page.goto(`${baseUrl}/${locale}${pathName}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(1500);
  await page.getByText(expectedTitle, { exact: true }).first().waitFor({ state: "visible", timeout: 15000 });
  const bodyText = await page.locator("body").innerText();
  const oppositeTitle = titles[locale === "ar" ? "en" : "ar"];
  if (bodyText.includes(oppositeTitle)) throw new Error(`${locale} ${pathName}: opposite title leaked`);
  if (errors.length) throw new Error(`${locale} ${pathName}: ${errors.join(" | ")}`);
  const file = path.join(outputDir, fileName);
  await page.screenshot({ path: file, fullPage: false });
  await context.close();
}

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const locale of ["ar", "en"]) {
    await capture(browser, locale, "/packages", `package-offers-${locale}-1280.png`, titles[locale]);
    await capture(browser, locale, "/patient/package-purchases", `package-purchases-list-${locale}-1280.png`, titles[locale]);
    await capture(browser, locale, `/patient/package-purchases/${purchaseId}`, `package-purchase-detail-${locale}-1280.png`, titles[locale]);
  }
} finally {
  await browser.close();
}

console.log(`BLOC-2E3A visual QA screenshots written to ${outputDir}`);

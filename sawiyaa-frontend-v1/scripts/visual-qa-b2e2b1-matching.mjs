import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = process.env.SAWIYAA_MATCHING_WEB_URL ?? "http://127.0.0.1:3100";
const outputDir = path.resolve(
  process.env.SAWIYAA_BLOC_2E2B1_WEB_OUT ?? path.join(root, "test-artifacts", "BLOC-2E2B1"),
);

const sessionId = "visual-qa-matching-session";
const stableResult = {
  practitioner: {
    id: "visual-qa-practitioner",
    slug: "mona-hassan",
    displayName: "Mona Hassan",
    professionalTitle: "CLINICAL_PSYCHOLOGIST",
    languages: ["ar", "en"],
    gender: "FEMALE",
    sessionPrice30: "350",
    sessionPrice60: "600",
    specialties: ["Anxiety support"],
  },
  score: 88,
  rank: 1,
  rationale: {
    matchedSpecialty: true,
    matchedLanguage: true,
    matchedGenderPreference: true,
    matchedSessionMode: true,
    matchedBudget: true,
    matchedUrgency: true,
    matchedProviderType: false,
    matchedInstantBooking: false,
    scoreBreakdown: { specialty: 30, language: 15, budget: 15, urgency: 10 },
    notes: ["Matched preferred specialty"],
  },
};

function envelope(data) {
  return JSON.stringify({ success: true, data });
}

function sessionResponse() {
  return {
    sessionId,
    answers: {
      primaryConcern: "Anxiety support",
      preferredSpecialtySlug: "anxiety",
      preferredLanguage: "en",
      preferredPractitionerGender: "ANY",
      sessionMode: "VIDEO",
      urgency: "FLEXIBLE",
    },
    items: [structuredClone(stableResult)],
    recommendations: [],
  };
}

function authCookies(locale) {
  return [
    {
      name: "sawiyaa_access_token",
      value: "visual-qa-patient-access-token",
      url: baseUrl,
    },
    {
      name: "sawiyaa_user_role",
      value: "PATIENT",
      url: baseUrl,
    },
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

async function installFixtureRoutes(page) {
  await page.route("**/api/v1/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const fulfill = (data) =>
      route.fulfill({
        status: 200,
        contentType: "application/json; charset=utf-8",
        body: envelope(data),
      });

    if (pathname.endsWith("/auth/me")) {
      return fulfill({
        userId: "visual-qa-patient",
        roles: ["PATIENT"],
        sessionId,
        authMethod: "access",
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        featureFlags: [],
      });
    }
    if (pathname.includes("/auth/") && pathname.endsWith("/refresh")) {
      return fulfill({
        tokens: {
          accessToken: "visual-qa-patient-access-token",
          refreshToken: "visual-qa-patient-refresh-token",
        },
        nextStep: "AUTHENTICATED",
      });
    }
    if (pathname.endsWith(`/matching/sessions/${sessionId}`) || pathname.endsWith("/matching/sessions")) {
      return fulfill(sessionResponse());
    }
    if (pathname.endsWith("/notifications/me/unread-count")) {
      return fulfill({ item: { unreadCount: 0 } });
    }
    if (pathname.endsWith("/chat/conversations/unread-summary") || pathname.endsWith("/messages/conversations/unread-summary")) {
      return fulfill({
        item: {
          session: { unreadMessages: 0, unreadConversations: 0 },
          practitioner: { unreadMessages: 0, unreadConversations: 0 },
          support: { unreadMessages: 0, unreadConversations: 0 },
          totalUnreadMessages: 0,
          totalUnreadConversations: 0,
        },
      });
    }
    if (pathname.endsWith("/patients/me")) {
      return fulfill({ profile: { displayName: "Salma Hassan", timezone: "Africa/Cairo" } });
    }
    if (pathname.endsWith("/users/me")) {
      return fulfill({ id: "visual-qa-patient", displayName: "Salma Hassan", roles: ["PATIENT"] });
    }
    return fulfill({ item: null, items: [], pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 1 } });
  });
}

const titles = {
  ar: "أخصائي نفسي إكلينيكي",
  en: "Clinical Psychologist",
};

async function capture(browser, locale, width, height, suffix) {
  const context = await browser.newContext({
    viewport: { width, height },
    locale: locale === "ar" ? "ar-SA" : "en-US",
    timezoneId: "Africa/Cairo",
  });
  await context.addCookies(authCookies(locale));
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on("request", (request) => {
    if (request.url().includes("matching") || request.url().includes("api")) requests.push(`${request.method()} ${request.url()}`);
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  await installFixtureRoutes(page);
  await page.goto(`${baseUrl}/${locale}/patient/matching/${sessionId}`, {
    waitUntil: "networkidle",
    timeout: 45000,
  });
  await page.waitForTimeout(1500);

  const bodyText = await page.locator("body").innerText();
  const visibleValues = locale === "ar"
    ? ["Mona Hassan", titles[locale], "88", "٣٥٠", "٦٠٠"]
    : ["Mona Hassan", titles[locale], "88", "350", "600"];
  for (const required of visibleValues) {
    if (!bodyText.includes(required)) {
      throw new Error(`${locale}: missing visible matching value ${required} at ${page.url()}\n${bodyText.slice(0, 1600)}\nRequests: ${requests.join(" | ")}\nErrors: ${errors.join(" | ")}`);
    }
  }
  const opposite = titles[locale === "ar" ? "en" : "ar"];
  if (bodyText.includes(opposite)) throw new Error(`${locale}: opposite professional title leaked`);
  const direction = await page.locator("body > div[dir]").first().getAttribute("dir");
  const htmlLocale = await page.locator("html").getAttribute("lang");
  if (direction !== (locale === "ar" ? "rtl" : "ltr")) throw new Error(`${locale}: expected direction ${locale === "ar" ? "rtl" : "ltr"}, got ${direction}`);
  const file = path.join(outputDir, `matching-web-${locale}-${width}-${suffix}.png`);
  await page.screenshot({ path: file, fullPage: false });
  await context.close();
  if (errors.length) throw new Error(`${locale}: page errors: ${errors.join(" | ")}`);
  return { locale, width, file, direction, htmlLocale, localeRoute: locale, stableResult };
}

async function assertLocaleIsolation(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: "Africa/Cairo" });
  await installFixtureRoutes(await context.newPage());
  const page = context.pages()[0];
  for (const locale of ["ar", "en", "ar"]) {
    await context.addCookies(authCookies(locale));
    await page.goto(`${baseUrl}/${locale}/patient/matching/${sessionId}`, { waitUntil: "networkidle", timeout: 45000 });
    const bodyText = await page.locator("body").innerText();
    if (!bodyText.includes(titles[locale])) throw new Error(`locale isolation failed for ${locale}`);
    if (bodyText.includes(titles[locale === "ar" ? "en" : "ar"])) throw new Error(`locale cache leaked into ${locale}`);
    const direction = await page.locator("body > div[dir]").first().getAttribute("dir");
    if (direction !== (locale === "ar" ? "rtl" : "ltr")) throw new Error(`locale isolation direction failed for ${locale}`);
  }
  await context.close();
  return "AR -> EN -> AR passed";
}

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const sequence = [
    await capture(browser, "ar", 390, 1000, "mobile"),
    await capture(browser, "en", 390, 1000, "mobile"),
    await capture(browser, "ar", 1440, 1000, "desktop"),
    await capture(browser, "en", 1440, 1000, "desktop"),
  ];
  const localeIsolation = await assertLocaleIsolation(browser);
  console.log(JSON.stringify({ outputDir, sequence, localeIsolation, stableResult }, null, 2));
} finally {
  await browser.close();
}

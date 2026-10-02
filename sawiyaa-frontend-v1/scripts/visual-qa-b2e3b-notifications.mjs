import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = process.env.SAWIYAA_NOTIFICATIONS_WEB_URL ?? "http://127.0.0.1:3100";
const outputDir = path.resolve(
  process.env.SAWIYAA_BLOC_2E3B_WEB_OUT ?? path.join(root, "test-artifacts", "BLOC-2E3B"),
);

const titles = {
  ar: "أخصائي نفسي",
  en: "Clinical Psychologist",
};

function envelope(data) {
  return JSON.stringify({ success: true, data });
}

function authCookies(locale) {
  return [
    { name: "sawiyaa_access_token", value: "visual-qa-notifications-token", url: baseUrl },
    { name: "sawiyaa_user_role", value: "PATIENT", url: baseUrl },
    {
      name: "sawiyaa_user_data",
      value: JSON.stringify({ id: "visual-qa-patient", displayName: "Salma Hassan", roles: ["PATIENT"], role: "PATIENT" }),
      url: baseUrl,
    },
    { name: "preferred_language", value: locale, url: baseUrl },
  ];
}

function notificationFeed(locale) {
  const practitionerName = titles[locale];
  return {
    items: [
      {
        id: "notification-session",
        typeSlug: "sessions.session-reminder",
        category: "SESSION",
        title: "SESSION_REMINDER",
        body: "SESSION_REMINDER",
        createdAt: "2026-08-16T10:00:00.000Z",
        readAt: null,
        action: { type: "INTERNAL_LINK", href: "/patient/sessions/session-1", label: locale === "ar" ? "فتح" : "Open" },
        payload: { sessionId: "session-1" },
        context: { practitionerName, patientName: "Salma Hassan", sessionStartAt: "2026-08-20T10:00:00.000Z" },
        primaryAction: { kind: "session", id: "session-1", href: "/patient/sessions/session-1" },
      },
      {
        id: "notification-message",
        typeSlug: "messages.session-message-received",
        category: "MESSAGE",
        title: "MESSAGE_RECEIVED",
        body: "MESSAGE_RECEIVED",
        createdAt: "2026-08-15T16:30:00.000Z",
        readAt: "2026-08-15T16:35:00.000Z",
        action: { type: "INTERNAL_LINK", href: "/patient/messages/conversation-1", label: locale === "ar" ? "فتح" : "Open" },
        payload: { conversationId: "conversation-1", sessionId: "session-1" },
        context: { practitionerName, senderName: "Mona Hassan", recipientRole: "PATIENT" },
        primaryAction: { kind: "messages", id: "conversation-1", href: "/patient/messages/conversation-1" },
      },
    ],
    pagination: { page: 1, limit: 5, hasNextPage: false, nextPage: null },
  };
}

async function installFixtureRoutes(page, locale) {
  await page.route("**/api/v1/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const fulfill = (data) => route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: envelope(data) });

    if (pathname.endsWith("/auth/me")) return fulfill({ userId: "visual-qa-patient", roles: ["PATIENT"], isActive: true, isEmailVerified: true, isPhoneVerified: true, featureFlags: [] });
    if (pathname.endsWith("/users/me")) return fulfill({ id: "visual-qa-patient", userId: "visual-qa-patient", displayName: "Salma Hassan", roles: ["PATIENT"] });
    if (pathname.endsWith("/patients/me")) return fulfill({ profile: { displayName: "Salma Hassan", timezone: "Africa/Cairo" } });
    if (pathname.endsWith("/notifications/me/unread-count")) return fulfill({ item: { unreadCount: 1 } });
    if (pathname.endsWith("/notifications/me")) return fulfill(notificationFeed(locale));
    if (pathname.includes("/auth/") && pathname.endsWith("/refresh")) return fulfill({ tokens: { accessToken: "visual-qa-notifications-token", refreshToken: "visual-qa-notifications-refresh" }, nextStep: "AUTHENTICATED" });
    return fulfill({ item: null, items: [], pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 1 } });
  });
}

async function capture(browser, locale) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, locale: locale === "ar" ? "ar-SA" : "en-US", timezoneId: "Africa/Cairo" });
  await context.addCookies(authCookies(locale));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await installFixtureRoutes(page, locale);
  await page.goto(`${baseUrl}/${locale}/patient`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(1500);
  const notificationButton = page.locator("button.dropdown-toggle").first();
  await notificationButton.waitFor({ state: "visible", timeout: 15000 });
  await notificationButton.click();
  await page.waitForTimeout(500);
  const bodyText = await page.locator("body").innerText();
  const opposite = titles[locale === "ar" ? "en" : "ar"];
  if (bodyText.includes(opposite)) throw new Error(`${locale}: opposite practitioner title leaked`);
  if (bodyText.includes("SESSION_REMINDER") || bodyText.includes("MESSAGE_RECEIVED")) throw new Error(`${locale}: raw notification enum leaked`);
  if (errors.length) throw new Error(`${locale}: ${errors.join(" | ")}`);
  const file = path.join(outputDir, `notifications-${locale}-1280.png`);
  await page.screenshot({ path: file, fullPage: false });
  await context.close();
  return file;
}

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const files = [await capture(browser, "ar"), await capture(browser, "en")];
  console.log(JSON.stringify({ outputDir, files }, null, 2));
} finally {
  await browser.close();
}

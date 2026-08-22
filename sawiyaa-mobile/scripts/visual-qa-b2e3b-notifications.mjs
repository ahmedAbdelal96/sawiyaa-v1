import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { apiEnvelope, patientProfile, patientVisualQaAuth } from "./visual-qa-patient-home-fixture.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = process.env.SAWIYAA_VISUAL_QA_URL ?? "http://localhost:8081";
const outputDir = path.resolve(process.env.SAWIYAA_BLOC_2E3B_MOBILE_OUT ?? path.join(root, "test", "ux", "BLOC-2E3B"));
const titles = { ar: "أخصائي نفسي", en: "Clinical Psychologist" };

function localizedNotifications(locale) {
  const practitionerName = titles[locale];
  return [
    {
      id: "notification-session",
      typeSlug: "sessions.session-reminder",
      category: "PATIENT",
      title: "SESSION_REMINDER",
      body: "SESSION_REMINDER",
      createdAt: "2026-08-16T10:00:00.000Z",
      readAt: null,
      action: { type: "INTERNAL_LINK", href: "/patient/sessions/session-1", label: locale === "ar" ? "فتح" : "Open" },
      payload: { sessionId: "session-1" },
      context: { practitionerName },
      primaryAction: { kind: "session", id: "session-1", href: "/patient/sessions/session-1" },
    },
    {
      id: "notification-message",
      typeSlug: "messages.session-message-received",
      category: "PATIENT",
      title: "MESSAGE_RECEIVED",
      body: "MESSAGE_RECEIVED",
      createdAt: "2026-08-15T16:30:00.000Z",
      readAt: "2026-08-15T16:35:00.000Z",
      action: { type: "INTERNAL_LINK", href: "/patient/messages/conversation-1", label: locale === "ar" ? "فتح" : "Open" },
      payload: { conversationId: "conversation-1", sessionId: "session-1" },
      context: { practitionerName },
      primaryAction: { kind: "messages", id: "conversation-1", href: "/patient/messages/conversation-1" },
    },
  ];
}

async function installFixtureRoutes(page) {
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const locale = request.headers()["x-lang"]?.startsWith("ar") ? "ar" : "en";
    const state = new URL(page.url()).searchParams.get("notificationState") ?? "populated";
    const fulfill = (data) => route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope(data) });

    if (pathname.endsWith("/auth/me")) return fulfill({ userId: patientVisualQaAuth.user.id, roles: ["PATIENT"], sessionId: "visual-qa-patient-session", authMethod: "access", isActive: true, isEmailVerified: true, isPhoneVerified: true, featureFlags: [] });
    if (pathname.includes("/auth/") && pathname.endsWith("/refresh")) return fulfill({ ...patientVisualQaAuth, nextStep: "AUTHENTICATED", message: "Visual QA fixture" });
    if (pathname.endsWith("/patients/me")) return fulfill(patientProfile);
    if (pathname.endsWith("/notifications/me/unread-count")) return fulfill({ item: { unreadCount: state === "empty" ? 0 : 1 } });
    if (pathname.endsWith("/notifications/me")) return fulfill({ items: state === "empty" ? [] : localizedNotifications(locale), pagination: { page: 1, limit: 20, hasNextPage: false, nextPage: null } });
    return fulfill({ item: null, items: [], pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 1 } });
  });
}

async function capture(browser, locale, width) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, locale: locale === "ar" ? "ar-SA" : "en-US", timezoneId: "Africa/Cairo" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await installFixtureRoutes(page);
  await page.addInitScript(({ auth, language }) => {
    localStorage.clear();
    localStorage.setItem("sawiyaa.app.language", language);
    localStorage.setItem("sawiyaa.mobile.device.id.v1", "visual-qa-notifications-device");
    localStorage.setItem("sawiyaa.mobile.auth.tokens.access.v1", auth.tokens.accessToken);
    localStorage.setItem("sawiyaa.mobile.auth.tokens.refresh.v1", auth.tokens.refreshToken);
    localStorage.setItem("sawiyaa.mobile.auth.tokens.access.expiresAt.v1", auth.tokens.accessTokenExpiresAt);
    localStorage.setItem("sawiyaa.mobile.auth.tokens.refresh.expiresAt.v1", auth.tokens.refreshTokenExpiresAt);
    localStorage.setItem("sawiyaa.mobile.auth.session.v2", JSON.stringify({ role: auth.role, user: auth.user }));
  }, { auth: patientVisualQaAuth, language: locale });
  await page.goto(`${baseUrl}/(patient)/notifications?notificationState=populated`, { waitUntil: "networkidle", timeout: 45000 });
  await page.getByTestId("notifications-screen").waitFor({ state: "visible", timeout: 15000 });
  await page.getByTestId("patient-notification-notification-session").waitFor({ state: "visible", timeout: 15000 });
  const bodyText = await page.locator("body").innerText();
  if (!bodyText.includes(titles[locale])) throw new Error(`${locale}: localized professional title missing from notification feed`);
  if (bodyText.includes(titles[locale === "ar" ? "en" : "ar"])) throw new Error(`${locale}: opposite title leaked`);
  if (bodyText.includes("SESSION_REMINDER") || bodyText.includes("MESSAGE_RECEIVED")) throw new Error(`${locale}: raw notification enum leaked`);
  if (errors.length) throw new Error(`${locale}: ${errors.join(" | ")}`);
  const refreshBanner = page.getByText("Refreshing...", { exact: true });
  if (await refreshBanner.count()) {
    await refreshBanner.first().evaluate((element) => {
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
  const file = path.join(outputDir, `notifications-${locale}-${width}.png`);
  await page.screenshot({ path: file, fullPage: false });
  await context.close();
  return file;
}

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const files = [await capture(browser, "ar", 360), await capture(browser, "en", 390)];
  console.log(JSON.stringify({ outputDir, files }, null, 2));
} finally {
  await browser.close();
}

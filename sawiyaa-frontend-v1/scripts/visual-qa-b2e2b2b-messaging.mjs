import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl =
  process.env.SAWIYAA_MESSAGING_WEB_URL ?? "http://127.0.0.1:3100";
const outputDir = path.resolve(
  process.env.SAWIYAA_BLOC_2E2B2B_WEB_OUT ??
    path.join(root, "test-artifacts", "BLOC-2E2B2B"),
);

const sessionId = "visual-qa-messaging-session";
const conversationId = "visual-qa-general-chat-conversation";
const practitionerId = "visual-qa-practitioner";
const titles = {
  ar: "\u0623\u062e\u0635\u0627\u0626\u064a \u0646\u0641\u0633\u064a \u0625\u0643\u0644\u064a\u0646\u064a\u0643\u064a",
  en: "Clinical Psychologist",
};

const session = {
  id: sessionId,
  sessionCode: "SW-MSG-2026",
  status: "READY_TO_JOIN",
  sessionMode: "VIDEO",
  scheduledStartAt: "2026-08-17T18:00:00.000Z",
  scheduledEndAt: "2026-08-17T18:30:00.000Z",
  chatAvailability: {
    canRead: true,
    canSend: true,
    readOnly: false,
    reason: "ALLOWED",
  },
  operational: { state: "READY_TO_JOIN" },
  practitioner: { displayName: "Dr. Ahmed", avatarUrl: null },
  patient: { displayName: "Salma Hassan", avatarUrl: null },
  unreadCount: 0,
  hasUnread: false,
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

function conversation(locale) {
  return {
    item: {
      conversationId,
      conversationRef: "gc_visual_qa",
      status: "OPEN",
      linkedSessionId: sessionId,
      participants: [
        {
          userId: "visual-qa-patient",
          role: "PATIENT",
          identity: {
            participantId: "visual-qa-patient",
            userId: "visual-qa-patient",
            displayName: "Salma Hassan",
            avatarUrl: null,
            role: "PATIENT",
            subtitle: null,
            status: "ACTIVE",
            verificationStatus: null,
          },
        },
        {
          userId: practitionerId,
          role: "PRACTITIONER",
          identity: {
            participantId: practitionerId,
            userId: practitionerId,
            displayName: "Dr. Ahmed",
            avatarUrl: null,
            role: "PRACTITIONER",
            subtitle: titles[locale],
            status: "APPROVED",
            verificationStatus: "PUBLISHED",
          },
        },
      ],
      createdAt: "2026-08-17T17:00:00.000Z",
      latestActivityAt: "2026-08-17T17:05:00.000Z",
      latestMessage: {
        messageId: "visual-qa-message-1",
        senderUserId: practitionerId,
        messageType: "TEXT",
        previewText: "The session is ready.",
        sentAt: "2026-08-17T17:05:00.000Z",
        senderIdentity: null,
      },
      hasMessages: true,
      unreadCount: 0,
      hasUnread: false,
      lastReadMessageId: "visual-qa-message-1",
      lastReadAt: "2026-08-17T17:06:00.000Z",
      chatAvailability: session.chatAvailability,
    },
    sessionId,
    chatAvailability: session.chatAvailability,
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
      return fulfill({
        userId: "visual-qa-patient",
        roles: ["PATIENT"],
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        featureFlags: [],
      });
    }
    if (pathname.endsWith("/users/me")) {
      return fulfill({
        id: "visual-qa-patient",
        userId: "visual-qa-patient",
        displayName: "Salma Hassan",
        roles: ["PATIENT"],
      });
    }
    if (pathname.endsWith("/patients/me")) {
      return fulfill({
        profile: { displayName: "Salma Hassan", timezone: "Africa/Cairo" },
      });
    }
    if (pathname.endsWith(`/patients/me/sessions/${sessionId}`)) {
      return fulfill({ item: session });
    }
    if (pathname.endsWith("/patients/me/sessions")) {
      return fulfill({
        items: [session],
        pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
      });
    }
    if (pathname.endsWith(`/chat/sessions/${sessionId}/conversation`)) {
      return fulfill(conversation(locale));
    }
    if (pathname.endsWith(`/chat/conversations/${conversationId}/messages`)) {
      return fulfill({
        items: [
          {
            messageId: "visual-qa-message-1",
            conversationId,
            senderUserId: practitionerId,
            messageType: "TEXT",
            status: "DELIVERED",
            contentText: "The session is ready.",
            sentAt: "2026-08-17T17:05:00.000Z",
            deliveredAt: "2026-08-17T17:05:01.000Z",
            readAt: "2026-08-17T17:06:00.000Z",
            attachments: [],
            conversationLatestActivityAt: "2026-08-17T17:05:00.000Z",
            senderIdentity: null,
          },
        ],
        pagination: { page: 1, limit: 30, totalItems: 1, totalPages: 1 },
      });
    }
    if (pathname.endsWith("/notifications/me/unread-count")) {
      return fulfill({ item: { unreadCount: 0 } });
    }
    if (
      pathname.endsWith("/chat/conversations/unread-summary") ||
      pathname.endsWith("/messages/conversations/unread-summary")
    ) {
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
    if (pathname.includes("/auth/") && pathname.endsWith("/refresh")) {
      return fulfill({
        tokens: {
          accessToken: "visual-qa-patient-access-token",
          refreshToken: "visual-qa-patient-refresh-token",
        },
        nextStep: "AUTHENTICATED",
      });
    }
    return fulfill({
      item: null,
      items: [],
      pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 1 },
    });
  });
}

async function capture(browser, locale) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: locale === "ar" ? "ar-SA" : "en-US",
    timezoneId: "Africa/Cairo",
  });
  await context.addCookies(authCookies(locale));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await installFixtureRoutes(page, locale);
  await page.goto(
    `${baseUrl}/${locale}/patient/messages?lane=session&sessionId=${sessionId}`,
    { waitUntil: "networkidle", timeout: 45000 },
  );
  await page
    .getByText(titles[locale], { exact: true })
    .waitFor({ state: "visible", timeout: 15000 });

  const bodyText = await page.locator("body").innerText();
  if (!bodyText.includes("The session is ready."))
    throw new Error(`${locale}: message body missing`);
  const opposite = titles[locale === "ar" ? "en" : "ar"];
  if (bodyText.includes(opposite))
    throw new Error(`${locale}: opposite title leaked`);
  const direction = await page
    .locator("body > div[dir]")
    .first()
    .getAttribute("dir");
  if (direction !== (locale === "ar" ? "rtl" : "ltr"))
    throw new Error(`${locale}: wrong direction ${direction}`);

  const file = path.join(outputDir, `messaging-web-${locale}-1440-desktop.png`);
  await page.screenshot({ path: file, fullPage: false });
  await context.close();
  if (errors.length)
    throw new Error(`${locale}: page errors: ${errors.join(" | ")}`);
  return {
    locale,
    file,
    direction,
    subtitle: titles[locale],
    message: "The session is ready.",
  };
}

async function assertLocaleIsolation(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    timezoneId: "Africa/Cairo",
  });
  const page = await context.newPage();
  for (const locale of ["ar", "en", "ar"]) {
    await context.addCookies(authCookies(locale));
    await installFixtureRoutes(page, locale);
    await page.goto(
      `${baseUrl}/${locale}/patient/messages?lane=session&sessionId=${sessionId}`,
      { waitUntil: "networkidle", timeout: 45000 },
    );
    await page
      .getByText(titles[locale], { exact: true })
      .waitFor({ state: "visible", timeout: 15000 });
    const bodyText = await page.locator("body").innerText();
    if (bodyText.includes(titles[locale === "ar" ? "en" : "ar"]))
      throw new Error(`locale cache leaked into ${locale}`);
  }
  await context.close();
  return "AR -> EN -> AR passed";
}

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const sequence = [await capture(browser, "ar"), await capture(browser, "en")];
  const localeIsolation = await assertLocaleIsolation(browser);
  console.log(
    JSON.stringify({ outputDir, sequence, localeIsolation }, null, 2),
  );
} finally {
  await browser.close();
}

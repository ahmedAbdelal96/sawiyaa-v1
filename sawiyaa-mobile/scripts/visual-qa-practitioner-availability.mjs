import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  apiEnvelope,
  availabilityDetails,
  availabilityWeeks,
  practitionerProfile,
  practitionerReadiness,
  practitionerSessionDetailsForState,
  practitionerSessionsForState,
  practitionerMessageConversationsForState,
  practitionerMessageConversationForId,
  practitionerMessagesForConversation,
  practitionerMessageUnreadSummary,
  practitionerFinanceWalletForState,
  practitionerFinanceLedgerForState,
  practitionerFinanceTransfersForState,
  practitionerNotificationsForState,
  practitionerNotificationPreferencesForState,
  visualQaAuth,
} from "./visual-qa-practitioner-availability-fixture.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = process.env.SAWIYAA_VISUAL_QA_URL ?? "http://localhost:8081";
const outputDir = path.resolve(
  process.env.SAWIYAA_VISUAL_QA_OUT ?? path.join(root, "test", "ux", "UX-2A"),
);

const labels = {
  ar: {
    moreTitle: "\u0627\u0644\u0645\u0632\u064a\u062f",
    moreSettingsTitle: "\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a",
    moreLogout: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c",
    settingsTitle: "\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a",
    scheduleTitle: "\u0627\u0644\u062c\u062f\u0648\u0644",
    editorTitle: "\u062a\u0639\u062f\u064a\u0644 \u0623\u0648\u0642\u0627\u062a \u0627\u0644\u064a\u0648\u0645",
    addTimes: "\u0625\u0636\u0627\u0641\u0629 \u0623\u0648\u0642\u0627\u062a",
    addPeriod: "\u0625\u0636\u0627\u0641\u0629 \u0641\u062a\u0631\u0629",
    addPeriodTitle: "\u0625\u0636\u0627\u0641\u0629 \u0641\u062a\u0631\u0629",
    applyPeriod: "\u062a\u0637\u0628\u064a\u0642 \u0627\u0644\u0641\u062a\u0631\u0629",
    individualTimes: "\u0627\u062e\u062a\u064a\u0627\u0631 \u0623\u0648\u0642\u0627\u062a \u0645\u0646\u0641\u0631\u062f\u0629",
    cancel: "\u0625\u0644\u063a\u0627\u0621",
    saveTimes: "\u062d\u0641\u0638 \u0627\u0644\u0623\u0648\u0642\u0627\u062a",
    repeatWeekly: "\u062a\u0643\u0631\u0627\u0631 \u062c\u062f\u0648\u0644 \u0627\u0644\u0623\u0633\u0628\u0648\u0639",
    repeatTitle: "\u062a\u0643\u0631\u0627\u0631 \u062c\u062f\u0648\u0644 \u0627\u0644\u0623\u0633\u0628\u0648\u0639",
    reviewRepeat: "\u0645\u0631\u0627\u062c\u0639\u0629",
    confirmRepeat: "\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062a\u0643\u0631\u0627\u0631",
    repeatSuccess: "\u062a\u0645 \u062a\u0643\u0631\u0627\u0631 \u0627\u0644\u062c\u062f\u0648\u0644 \u0628\u0646\u062c\u0627\u062d",
    repeatConflict: "\u064a\u0648\u062c\u062f \u062a\u0639\u0627\u0631\u0636 \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639",
    noUpcoming: "\u0644\u0627 \u062a\u0648\u062c\u062f \u062c\u0644\u0633\u0627\u062a \u0642\u0631\u064a\u0628\u0629",
    actionRequired: "\u0625\u062c\u0631\u0627\u0621 \u0645\u0637\u0644\u0648\u0628",
    joinSession: "\u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645 \u0644\u0644\u062c\u0644\u0633\u0629",
    sessionsTitle: "\u062c\u0644\u0633\u0627\u062a \u0627\u0644\u0645\u0639\u0627\u0644\u062c",
    upcoming: "\u0627\u0644\u0642\u0627\u062f\u0645\u0629",
    history: "\u0627\u0644\u0633\u062c\u0644",
    viewSession: "\u0639\u0631\u0636 \u0627\u0644\u062c\u0644\u0633\u0629",
    detailTitle: "\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u062c\u0644\u0633\u0629",
    openRoom: "\u0641\u062a\u062d \u063a\u0631\u0641\u0629 \u0627\u0644\u062c\u0644\u0633\u0629",
    messagesTitle: "\u0627\u0644\u0631\u0633\u0627\u0626\u0644",
    sessionMessages: "\u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u062c\u0644\u0633\u0629",
    messageCounterpart: "Mona Hassan",
    messageContext: "\u062c\u0644\u0633\u0629",
    noMessages: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0631\u0633\u0627\u0626\u0644 \u0628\u0639\u062f",
    composer: "\u0627\u0644\u0631\u0633\u0627\u0644\u0629",
    financeTitle: "\u0627\u0644\u0623\u0631\u0628\u0627\u062d",
    availableBalance: "\u0627\u0644\u0631\u0635\u064a\u062f \u0627\u0644\u0645\u062a\u0627\u062d",
    transactionsTitle: "\u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062a",
    transfersTitle: "\u0627\u0644\u062a\u062d\u0648\u064a\u0644\u0627\u062a",
    transfer: "\u062a\u062d\u0648\u064a\u0644",
    noTransactions: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0639\u0627\u0645\u0644\u0627\u062a \u0628\u0639\u062f",
    noTransfers: "\u0644\u0627 \u062a\u0648\u062c\u062f \u062a\u062d\u0648\u064a\u0644\u0627\u062a \u0628\u0639\u062f",
    notificationsTitle: "\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a",
    notificationCenterTitle: "\u0645\u0631\u0643\u0632 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a",
    notificationSummary: "2 \u063a\u064a\u0631 \u0645\u0642\u0631\u0648\u0621\u0629",
    notificationSessionTitle: "\u062c\u0644\u0633\u062a\u0643 \u062c\u0627\u0647\u0632\u0629 \u0644\u0644\u062f\u062e\u0648\u0644",
    notificationMessageTitle: "\u0631\u0633\u0627\u0644\u0629 \u062c\u062f\u064a\u062f\u0629 \u0639\u0646 \u062c\u0644\u0633\u0629",
    notificationEmptyTitle: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0625\u0634\u0639\u0627\u0631\u0627\u062a \u062c\u062f\u064a\u062f\u0629",
    notificationSettingsTitle: "\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a",
    notificationChannelPush: "\u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0627\u0644\u0647\u0627\u062a\u0641",
    notificationChannelInApp: "\u062f\u0627\u062e\u0644 \u0627\u0644\u062a\u0637\u0628\u064a\u0642",
    notificationChannelEmail: "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a",
    notificationMarkAll: "\u062a\u062d\u062f\u064a\u062f \u0627\u0644\u0643\u0644 \u0643\u0645\u0642\u0631\u0648\u0621",
    notificationSave: "\u062d\u0641\u0638 \u0627\u0644\u062a\u0641\u0636\u064a\u0644\u0627\u062a",
  },
  en: {
    moreTitle: "More",
    moreSettingsTitle: "Settings",
    moreLogout: "Log out",
    settingsTitle: "Settings",
    scheduleTitle: "Schedule",
    editorTitle: "Edit day times",
    addTimes: "Add times",
    addPeriod: "Add period",
    addPeriodTitle: "Add period",
    applyPeriod: "Apply period",
    individualTimes: "Choose individual times",
    cancel: "Cancel",
    saveTimes: "Save times",
    repeatWeekly: "Repeat weekly schedule",
    repeatTitle: "Repeat weekly schedule",
    reviewRepeat: "Review",
    confirmRepeat: "Confirm repeat",
    repeatSuccess: "The schedule was repeated successfully.",
    repeatConflict: "This week has conflicting availability",
    noUpcoming: "No upcoming sessions",
    actionRequired: "Action needed",
    joinSession: "Join session",
    sessionsTitle: "Practitioner sessions",
    upcoming: "Upcoming",
    history: "History",
    viewSession: "View session",
    detailTitle: "Session details",
    openRoom: "Open session room",
    messagesTitle: "Messages",
    sessionMessages: "Session messages",
    messageCounterpart: "Mona Hassan",
    messageContext: "Session",
    noMessages: "No messages yet",
    composer: "Message",
    financeTitle: "Earnings",
    availableBalance: "Available balance",
    transactionsTitle: "Transactions",
    transfersTitle: "Transfers",
    transfer: "Transfer",
    noTransactions: "No transactions yet",
    noTransfers: "No transfers yet",
    notificationsTitle: "Notifications",
    notificationCenterTitle: "Notification center",
    notificationSummary: "2 unread",
    notificationSessionTitle: "Session ready to join",
    notificationMessageTitle: "New session message",
    notificationEmptyTitle: "No new notifications",
    notificationSettingsTitle: "Notification settings",
    notificationChannelPush: "Push notifications",
    notificationChannelInApp: "In-app",
    notificationChannelEmail: "Email",
    notificationMarkAll: "Mark all as read",
    notificationSave: "Save preferences",
  },
};

function authStorageInit() {
  return ({ auth, language }) => {
    localStorage.clear();
    localStorage.setItem("sawiyaa.app.language", language);
    localStorage.setItem("sawiyaa.mobile.device.id.v1", "visual-qa-device");
    localStorage.setItem("sawiyaa.mobile.auth.tokens.access.v1", auth.tokens.accessToken);
    localStorage.setItem("sawiyaa.mobile.auth.tokens.refresh.v1", auth.tokens.refreshToken);
    localStorage.setItem("sawiyaa.mobile.auth.tokens.access.expiresAt.v1", auth.tokens.accessTokenExpiresAt);
    localStorage.setItem("sawiyaa.mobile.auth.tokens.refresh.expiresAt.v1", auth.tokens.refreshTokenExpiresAt);
    localStorage.setItem(
      "sawiyaa.mobile.auth.session.v2",
      JSON.stringify({ role: auth.role, user: auth.user }),
    );
  };
}

async function waitForExactText(page, value) {
  try {
    const matches = await page.getByText(value, { exact: true }).all();
    for (const match of matches) {
      if (await match.isVisible()) return;
    }
    throw new Error(`No visible exact-text match for ${value}`);
  } catch (error) {
    throw new Error(`${String(error)} body=${(await page.locator("body").innerText()).slice(0, 1600)} url=${page.url()}`);
  }
}

async function assertPractitionerTabOrder(page, locale) {
  const tabLabels = locale === "ar"
    ? ["الرئيسية", "الجدول", "الجلسات", "الرسائل", "المزيد"]
    : ["Home", "Schedule", "Sessions", "Messages", "More"];
  const centers = [];

  for (const tabLabel of tabLabels) {
    const tab = page.getByText(tabLabel, { exact: true }).first();
    const box = await tab.boundingBox();
    if (!box) throw new Error(`${locale}: Could not measure bottom tab ${tabLabel}`);
    centers.push(box.x + box.width / 2);
  }

  const isExpectedOrder = centers.every((center, index) => {
    if (index === 0) return true;
    return locale === "ar" ? centers[index - 1] > center : centers[index - 1] < center;
  });
  if (!isExpectedOrder) {
    throw new Error(`${locale}: Bottom tab physical order is incorrect: ${centers.join(", ")}`);
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

async function installFixtureRoutes(page) {
  let latestRepeatPreview = null;
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    const pathname = requestUrl.pathname;
    const homeState = new URL(page.url()).searchParams.get("homeState") ?? "later";

    if (pathname.endsWith("/auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiEnvelope({
          userId: visualQaAuth.user.id,
          roles: ["PRACTITIONER"],
          sessionId: "visual-qa-session",
          authMethod: "access",
          isActive: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          practitionerProfileId: visualQaAuth.user.practitionerProfileId,
          isPractitionerOtpVerified: true,
          isPractitionerApproved: true,
          featureFlags: [],
        }),
      });
      return;
    }

    if (pathname.endsWith("/auth/practitioner/refresh")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiEnvelope({ ...visualQaAuth, nextStep: "AUTHENTICATED", message: "Visual QA fixture" }),
      });
      return;
    }

    if (pathname.endsWith("/chat/conversations/unread-summary")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiEnvelope({
          item: {
            session: { unreadMessages: 0, unreadConversations: 0 },
            support: { unreadMessages: 0, unreadConversations: 0 },
            practitioner: { unreadMessages: 0, unreadConversations: 0 },
            totalUnreadMessages: 0,
            totalUnreadConversations: 0,
          },
        }),
      });
      return;
    }

    if (pathname.endsWith("/messages/conversations/unread-summary")) {
      const state = new URL(page.url()).searchParams.get("homeState") ?? "messages";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiEnvelope({ item: practitionerMessageUnreadSummary(state) }),
      });
      return;
    }

    if (request.method() === "GET" && pathname.endsWith("/practitioners/me/wallet")) {
      const state = new URL(page.url()).searchParams.get("homeState") ?? "finance";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiEnvelope(practitionerFinanceWalletForState(state)),
      });
      return;
    }

    if (request.method() === "GET" && pathname.endsWith("/practitioners/me/ledger")) {
      const state = new URL(page.url()).searchParams.get("homeState") ?? "finance";
      const items = practitionerFinanceLedgerForState(state);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiEnvelope({
          items,
          pagination: { page: 1, limit: 20, totalItems: items.length, totalPages: 1 },
        }),
      });
      return;
    }

    if (request.method() === "GET" && pathname.endsWith("/practitioners/me/settlements")) {
      const state = new URL(page.url()).searchParams.get("homeState") ?? "finance";
      const items = practitionerFinanceTransfersForState(state);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiEnvelope({
          items,
          pagination: { page: 1, limit: 20, totalItems: items.length, totalPages: 1 },
        }),
      });
      return;
    }

    if (request.method() === "GET" && pathname.endsWith("/messages/conversations")) {
      const state = new URL(page.url()).searchParams.get("homeState") ?? "messages";
      const items = practitionerMessageConversationsForState(state);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiEnvelope({
          items,
          pagination: { page: 1, limit: 100, totalItems: items.length, totalPages: 1 },
        }),
      });
      return;
    }

    const messageConversationMatch = pathname.match(/\/messages\/conversations\/([^/]+)$/);
    if (request.method() === "GET" && messageConversationMatch) {
      const item = practitionerMessageConversationForId(messageConversationMatch[1]);
      if (!item) {
        await route.fulfill({ status: 404, contentType: "application/json", body: apiEnvelope({}) });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item }) });
      return;
    }

    const messageListMatch = pathname.match(/\/messages\/conversations\/([^/]+)\/messages$/);
    if (request.method() === "GET" && messageListMatch) {
      const items = practitionerMessagesForConversation(messageListMatch[1]);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiEnvelope({
          items,
          pagination: { page: 1, limit: 30, totalItems: items.length, totalPages: 1 },
        }),
      });
      return;
    }

    if (request.method() === "POST" && /\/messages\/conversations\/[^/]+\/read$/.test(pathname)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ ok: true }) });
      return;
    }

    if (request.method() === "POST" && /\/messages\/conversations\/[^/]+\/messages$/.test(pathname)) {
      const conversationId = pathname.split("/").at(-2);
      const body = request.postDataJSON() ?? {};
      const items = practitionerMessagesForConversation(conversationId);
      const latest = items[0];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiEnvelope({
          item: {
            ...(latest ?? {}),
            id: `visual-sent-${body.clientMessageId ?? "message"}`,
            conversationId,
            sender: {
              userId: visualQaAuth.user.id,
              displayName: visualQaAuth.user.displayName,
              avatarUrl: null,
              publicRoleLabel: "Practitioner",
            },
            body: body.message ?? "",
            sentAt: "2026-08-16T12:05:00.000Z",
            clientMessageId: body.clientMessageId ?? null,
          },
        }),
      });
      return;
    }

    const sessionConversationMatch = pathname.match(/\/chat\/sessions\/([^/]+)\/conversation$/);
    if (request.method() === "GET" && sessionConversationMatch) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiEnvelope({
          item: { conversationId: "message-session-1" },
          sessionId: sessionConversationMatch[1],
          chatAvailability: { canRead: true, canSend: true, readOnly: false, reason: "ALLOWED" },
        }),
      });
      return;
    }

    if (pathname.endsWith("/notifications/me/unread-count")) {
      const notificationState = new URL(page.url()).searchParams.get("notificationState") ?? "notifications";
      const unreadCount = practitionerNotificationsForState(notificationState).filter((item) => item.readAt === null).length;
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: { unreadCount } }) });
      return;
    }

    if (request.method() === "GET" && pathname.endsWith("/notifications/me")) {
      const notificationState = new URL(page.url()).searchParams.get("notificationState") ?? "notifications";
      const items = practitionerNotificationsForState(notificationState);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiEnvelope({
          items,
          pagination: { page: 1, limit: 20, hasNextPage: false, nextPage: null },
        }),
      });
      return;
    }

    if (request.method() === "PATCH" && /\/notifications\/me\/[^/]+\/read$/.test(pathname)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: {} }) });
      return;
    }

    if (request.method() === "PATCH" && pathname.endsWith("/notifications/me/read-all")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: { updatedCount: 2 } }) });
      return;
    }

    if (request.method() === "GET" && pathname.endsWith("/settings/me/notification-preferences")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiEnvelope({ item: practitionerNotificationPreferencesForState() }),
      });
      return;
    }

    if (request.method() === "PUT" && pathname.endsWith("/settings/me/notification-preferences")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiEnvelope({ item: practitionerNotificationPreferencesForState() }),
      });
      return;
    }

    if (request.method() === "GET" && pathname.endsWith("/settings/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiEnvelope({
          item: {
            preferences: { locale: "en", timezone: "Africa/Cairo" },
            notificationPreferences: practitionerNotificationPreferencesForState(),
            ownership: { ownedSurfaces: ["notifications"], outOfScopeSurfaces: [] },
          },
        }),
      });
      return;
    }

    if (pathname.endsWith("/practitioners/me/presence/heartbeat")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ ok: true }) });
      return;
    }

    if (request.method() === "GET" && pathname.endsWith("/practitioners/me/readiness")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ readiness: practitionerReadiness }) });
      return;
    }

    if (request.method() === "GET" && pathname.endsWith("/practitioners/me/application")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ application: practitionerProfile.applicationStatusSummary }) });
      return;
    }

    if (request.method() === "GET" && pathname.endsWith("/practitioners/me/sessions")) {
      const items = practitionerSessionsForState(homeState);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiEnvelope({
          items,
          pagination: { page: 1, limit: 20, totalItems: items.length, totalPages: 1 },
        }),
      });
      return;
    }

    const sessionDetailMatch = pathname.match(/\/practitioners\/me\/sessions\/([^/]+)$/);
    if (request.method() === "GET" && sessionDetailMatch) {
      const state = homeState === "session-detail-action-required"
        ? "session-detail-action-required"
        : "session-detail-joinable";
      const item = practitionerSessionDetailsForState(sessionDetailMatch[1], state);
      if (!item) {
        await route.fulfill({ status: 404, contentType: "application/json", body: apiEnvelope({}) });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item }) });
      return;
    }

    const joinContractMatch = pathname.match(/\/practitioners\/me\/sessions\/([^/]+)\/runtime\/join$/);
    if (request.method() === "GET" && joinContractMatch) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiEnvelope({
          item: {
            sessionId: joinContractMatch[1],
            status: "READY_TO_JOIN",
            provider: "DAILY",
            canJoin: true,
            blockedReason: null,
            availableAt: null,
            expiresAt: null,
            roomName: "visual-qa-room",
            roomUrl: "https://example.com/visual-qa-room",
            joinToken: "visual-qa-token",
          },
        }),
      });
      return;
    }

    const prepareRuntimeMatch = pathname.match(/\/practitioners\/me\/sessions\/([^/]+)\/runtime\/prepare$/);
    if (request.method() === "POST" && prepareRuntimeMatch) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiEnvelope({ item: { provider: "DAILY", isPrepared: true, roomName: "visual-qa-room", roomUrl: "https://example.com/visual-qa-room" } }),
      });
      return;
    }

    if (request.method() === "POST" && pathname.endsWith(`/practitioners/me/availability/weeks/${availabilityDetails.week.id}/repeat/preview`)) {
      const body = request.postDataJSON() ?? {};
      const targetWeekStartDates = Array.isArray(body.targetWeekStartDates) ? body.targetWeekStartDates : [];
      const targets = targetWeekStartDates.map((weekStartDate) => {
        const week = availabilityWeeks.weeks.find((item) => item.weekStartDate === weekStartDate);
        const changedToConflict = weekStartDate === "2026-09-13";
        const reasonCode = changedToConflict
          ? "TARGET_HAS_BOOKINGS"
          : week?.canCreate
            ? "ELIGIBLE"
            : week?.status === "PUBLISHED"
              ? "TARGET_PUBLISHED"
              : week?.containsBookings
                ? "TARGET_HAS_BOOKINGS"
                : "TARGET_ALREADY_EXISTS";
        const eligible = reasonCode === "ELIGIBLE";
        return {
          weekStartDate,
          reasonCode,
          classification: eligible ? "ELIGIBLE" : "SKIPPED",
          copiedSlotCount: eligible ? availabilityDetails.week.slots.length : 0,
        };
      });
      latestRepeatPreview = {
        operationId: "visual-qa-repeat-operation",
        expiresAt: "2099-01-01T00:00:00.000Z",
        sourceWeekId: availabilityDetails.week.id,
        timezone: availabilityDetails.week.timezone,
        activeRange: availabilityWeeks.activeRange,
        sourceSlotCount30Minutes: availabilityDetails.slotCount30Minutes,
        sourceSlotCount60Minutes: availabilityDetails.slotCount60Minutes,
        targets,
        confirmationAllowed: targets.some((target) => target.classification === "ELIGIBLE"),
      };
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope(latestRepeatPreview) });
      return;
    }

    if (request.method() === "POST" && pathname.endsWith(`/practitioners/me/availability/weeks/${availabilityDetails.week.id}/repeat/confirm`)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiEnvelope({
          operationId: latestRepeatPreview?.operationId ?? "visual-qa-repeat-operation",
          status: "COMPLETED",
          targets: latestRepeatPreview?.targets ?? [],
          warnings: [],
        }),
      });
      return;
    }

    if (request.method() === "GET" && pathname.endsWith("/practitioners/me") && !pathname.includes("/availability/")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiEnvelope({
          message: "Visual QA fixture",
          profile: practitionerProfile,
        }),
      });
      return;
    }

    if (request.method() === "GET" && pathname.endsWith("/practitioners/me/availability/weeks")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope(availabilityWeeks) });
      return;
    }

    if (request.method() === "GET" && pathname.endsWith(`/practitioners/me/availability/weeks/${availabilityDetails.week.id}`)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope(availabilityDetails) });
      return;
    }

    if (request.method() === "PATCH" && pathname.endsWith(`/practitioners/me/availability/weeks/${availabilityDetails.week.id}`)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope(availabilityDetails) });
      return;
    }

    await route.continue();
  });
}

async function captureHomeState(page, locale, width, state, fileSuffix) {
  const localeLabels = labels[locale];
  await page.goto(`${baseUrl}/(practitioner)?homeState=${state}`, { waitUntil: "networkidle", timeout: 45000 });
  if (!page.url().includes("/(practitioner)")) throw new Error(`${locale}: Home redirected to ${page.url()}`);
  await page.getByText(visualQaAuth.user.displayName, { exact: false }).first().waitFor({ state: "visible" });
  if (state === "empty") await waitForExactText(page, localeLabels.noUpcoming);
  if (state === "joinable") await waitForExactText(page, localeLabels.joinSession);
  if (state === "urgent") await waitForExactText(page, localeLabels.actionRequired);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  for (const tabLabel of locale === "ar"
    ? ["الرئيسية", "الجدول", "الجلسات", "الرسائل", "المزيد"]
    : ["Home", "Schedule", "Sessions", "Messages", "More"]) {
    await waitForExactText(page, tabLabel);
  }
  await assertPractitionerTabOrder(page, locale);
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `home-${locale}-${width}-${fileSuffix}.png`), fullPage: false });
}

async function captureSessionsState(page, locale, width, state, fileSuffix) {
  const localeLabels = labels[locale];
  await page.goto(`${baseUrl}/(practitioner)/sessions?homeState=${state}`, { waitUntil: "networkidle", timeout: 45000 });
  await waitForExactText(page, localeLabels.sessionsTitle);
  await waitForExactText(page, localeLabels.upcoming);
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `sessions-${locale}-${width}-${fileSuffix}.png`), fullPage: false });
}

async function captureSessionHistory(page, locale, width) {
  const localeLabels = labels[locale];
  await page.goto(`${baseUrl}/(practitioner)/sessions?homeState=sessions-history`, { waitUntil: "networkidle", timeout: 45000 });
  await waitForExactText(page, localeLabels.sessionsTitle);
  await page.getByText(localeLabels.history, { exact: true }).first().click({ force: true });
  await waitForExactText(page, localeLabels.history);
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `sessions-${locale}-${width}-history.png`), fullPage: false });
}

async function captureSessionDetail(page, locale, width, state, sessionId, fileSuffix) {
  const localeLabels = labels[locale];
  await page.goto(`${baseUrl}/(practitioner)/sessions/${sessionId}?homeState=${state}`, { waitUntil: "networkidle", timeout: 45000 });
  await waitForExactText(page, localeLabels.detailTitle);
  await waitForExactText(page, "Mona Hassan");
  if (fileSuffix === "joinable") await waitForExactText(page, localeLabels.openRoom);
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `session-detail-${locale}-${width}-${fileSuffix}.png`), fullPage: false });
}

async function captureFinanceOverview(page, locale, width, state, fileSuffix) {
  const localeLabels = labels[locale];
  await page.goto(`${baseUrl}/(practitioner)/finance?homeState=${state}`, { waitUntil: "networkidle", timeout: 45000 });
  await waitForExactText(page, localeLabels.financeTitle);
  await waitForExactText(page, localeLabels.availableBalance);
  if (state === "finance-empty") await waitForExactText(page, localeLabels.noTransactions);
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `finance-${locale}-${width}-${fileSuffix}.png`), fullPage: false });
}

async function captureFinanceList(page, locale, width, kind, fileSuffix) {
  const localeLabels = labels[locale];
  const route = kind === "transactions" ? "ledger" : "settlements";
  const title = kind === "transactions" ? localeLabels.transactionsTitle : localeLabels.transfersTitle;
  await page.goto(`${baseUrl}/(practitioner)/finance/${route}?homeState=finance`, { waitUntil: "networkidle", timeout: 45000 });
  await waitForExactText(page, title);
  if (kind === "transfers") {
    await page.getByText(localeLabels.transfer, { exact: true }).first().click();
    await page.waitForTimeout(250);
  }
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `finance-${locale}-${width}-${fileSuffix}.png`), fullPage: false });
}

async function captureMessagesInbox(page, locale, width, state, fileSuffix) {
  const localeLabels = labels[locale];
  await page.goto(`${baseUrl}/(practitioner)/messages?homeState=${state}`, { waitUntil: "networkidle", timeout: 45000 });
  await waitForExactText(page, localeLabels.messagesTitle);
  if (state !== "messages-empty") {
    await waitForExactText(page, localeLabels.messageCounterpart);
    await waitForExactText(page, localeLabels.messageContext);
  } else {
    await waitForExactText(page, localeLabels.noMessages);
  }
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `messages-${locale}-${width}-${fileSuffix}.png`), fullPage: false });
}

async function captureMessageThread(page, locale, width, fileSuffix) {
  const localeLabels = labels[locale];
  await page.goto(`${baseUrl}/(practitioner)/messages?homeState=messages-unread`, { waitUntil: "networkidle", timeout: 45000 });
  await page.getByText(localeLabels.messageCounterpart, { exact: true }).first().click();
  await waitForExactText(page, localeLabels.messageCounterpart);
  await waitForExactText(page, "Can we start at 4:00 PM?");
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `messages-${locale}-${width}-${fileSuffix}.png`), fullPage: false });

  const composer = page.getByLabel(localeLabels.composer, { exact: true }).first();
  await composer.waitFor({ state: "visible" });
  await composer.click();
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `messages-${locale}-${width}-thread-composer.png`), fullPage: false });
}

async function captureSessionMessagesRoute(page, locale, width) {
  const localeLabels = labels[locale];
  await page.goto(`${baseUrl}/(practitioner)/sessions/session-joinable?homeState=session-detail-joinable`, { waitUntil: "networkidle", timeout: 45000 });
  await waitForExactText(page, localeLabels.detailTitle);
  await page.getByRole("button", { name: localeLabels.sessionMessages }).click();
  await page.waitForURL(/\/messages\/message-session-1$/, { timeout: 15000 });
  await page.waitForTimeout(500);
  if (!(await page.getByText(localeLabels.messageCounterpart, { exact: true }).count())) {
    await page.reload({ waitUntil: "networkidle", timeout: 45000 });
  }
  await waitForExactText(page, localeLabels.messageCounterpart);
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `messages-${locale}-${width}-from-session.png`), fullPage: false });
}

async function capturePractitionerNotifications(page, locale, width, state, fileSuffix) {
  const localeLabels = labels[locale];
  await page.goto(`${baseUrl}/(practitioner)/notifications?notificationState=${state}`, { waitUntil: "networkidle", timeout: 45000 });
  await waitForExactText(page, localeLabels.notificationsTitle);
  await waitForExactText(page, state === "notifications-empty" ? localeLabels.notificationEmptyTitle : localeLabels.notificationSummary);
  if (state !== "notifications-empty") {
    await waitForExactText(page, localeLabels.notificationSessionTitle);
    await waitForExactText(page, localeLabels.notificationMessageTitle);
    if (locale === "ar") await page.getByRole("button", { name: localeLabels.notificationMarkAll }).waitFor({ state: "visible" });
  }
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `notifications-${locale}-${width}-${fileSuffix}.png`), fullPage: false });

  if (state !== "notifications-empty") {
    await page.getByText(localeLabels.notificationSessionTitle, { exact: true }).click();
    await page.waitForURL(/\/sessions\/session-joinable$/, { timeout: 15000 });
    if (!page.url().includes("/sessions/session-joinable")) throw new Error(`${locale}: notification deep link landed at ${page.url()}`);
  }
}

async function capturePractitionerNotificationSettings(page, locale, width) {
  const localeLabels = labels[locale];
  await page.goto(`${baseUrl}/(settings)/notifications?notificationState=notification-settings`, { waitUntil: "networkidle", timeout: 45000 });
  await waitForExactText(page, localeLabels.notificationSettingsTitle);
  await waitForExactText(page, localeLabels.notificationChannelInApp);
  await waitForExactText(page, localeLabels.notificationChannelPush);
  await waitForExactText(page, localeLabels.notificationChannelEmail);
  await waitForExactText(page, localeLabels.notificationSave);
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `notification-settings-${locale}-${width}.png`), fullPage: false });
}

async function capturePractitionerMore(page, locale, width) {
  const localeLabels = labels[locale];
  await page.goto(`${baseUrl}/(practitioner)/more`, { waitUntil: "networkidle", timeout: 45000 });
  await waitForExactText(page, localeLabels.moreTitle);
  await waitForExactText(page, localeLabels.financeTitle);
  await waitForExactText(page, localeLabels.moreSettingsTitle);
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `more-${locale}-${width}-full.png`), fullPage: false });

  const logoutRow = page.getByText(localeLabels.moreLogout, { exact: true }).first();
  await logoutRow.scrollIntoViewIfNeeded();
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `more-${locale}-${width}-logout.png`), fullPage: false });

  await page.goto(`${baseUrl}/(practitioner)/more`, { waitUntil: "networkidle", timeout: 45000 });
  await page.getByText(localeLabels.financeTitle, { exact: true }).first().click();
  await waitForExactText(page, localeLabels.financeTitle);
  await waitForExactText(page, localeLabels.availableBalance);
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `more-${locale}-${width}-earnings.png`), fullPage: false });

  await page.goto(`${baseUrl}/(practitioner)/more`, { waitUntil: "networkidle", timeout: 45000 });
  await page.getByText(localeLabels.moreSettingsTitle, { exact: true }).click();
  await waitForExactText(page, localeLabels.settingsTitle);
  await page.getByText(localeLabels.notificationSettingsTitle, { exact: true }).click();
  await waitForExactText(page, localeLabels.notificationSettingsTitle);
  await waitForExactText(page, localeLabels.notificationChannelInApp);
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `more-${locale}-${width}-notification-settings.png`), fullPage: false });
}

async function captureLocale(browser, locale, width, height) {
  const context = await browser.newContext({
    viewport: { width, height },
    locale: locale === "ar" ? "ar-SA" : "en-US",
    timezoneId: "Africa/Cairo",
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("dialog", (dialog) => dialog.accept());
  await installFixtureRoutes(page);
  await page.addInitScript(authStorageInit(), { auth: visualQaAuth, language: locale });

  const localeLabels = labels[locale];
  await captureHomeState(page, locale, width, "later", "next-session");
  if (locale === "ar") {
    await captureHomeState(page, locale, width, "joinable", "joinable");
    await captureHomeState(page, locale, width, "empty", "empty");
    await captureHomeState(page, locale, width, "urgent", "urgent");
  } else {
    await captureHomeState(page, locale, width, "empty", "empty");
  }

  await captureMessagesInbox(page, locale, width, "messages", "inbox");
  if (locale === "ar") {
    await captureMessagesInbox(page, locale, width, "messages-unread", "unread");
    await captureMessagesInbox(page, locale, width, "messages-empty", "empty");
  } else {
    await captureMessagesInbox(page, locale, width, "messages-empty", "empty");
  }
  await captureMessageThread(page, locale, width, "thread");
  if (locale === "ar") {
    await captureSessionMessagesRoute(page, locale, width);
  }

  await captureFinanceOverview(page, locale, width, "finance", "overview");
  await captureFinanceList(page, locale, width, "transactions", "transactions");
  await captureFinanceList(page, locale, width, "transfers", "transfers-detail");
  if (locale === "ar") {
    await captureFinanceOverview(page, locale, width, "finance-empty", "empty");
  }

  await captureSessionsState(page, locale, width, "sessions-upcoming", "upcoming");
  await captureSessionHistory(page, locale, width);
  if (locale === "ar") {
    await captureSessionsState(page, locale, width, "sessions-action-required", "action-required");
    await captureSessionsState(page, locale, width, "sessions-empty", "upcoming-empty");
  }
  await captureSessionDetail(page, locale, width, "session-detail-joinable", "session-joinable", "joinable");
  if (locale === "ar") {
    await captureSessionDetail(page, locale, width, "session-detail-action-required", "session-action-required", "action-required");
  }

  await capturePractitionerNotifications(page, locale, width, "notifications", "populated");
  if (locale === "ar") {
    await capturePractitionerNotifications(page, locale, width, "notifications-empty", "empty");
  }
  await capturePractitionerNotificationSettings(page, locale, width);
  await capturePractitionerMore(page, locale, width);

  await page.goto(`${baseUrl}/(practitioner)/availability`, { waitUntil: "networkidle", timeout: 45000 });
  if (!page.url().includes("/availability")) throw new Error(`${locale}: Schedule redirected to ${page.url()}`);
  await waitForExactText(page, localeLabels.scheduleTitle);
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `schedule-${locale}-${width}.png`), fullPage: false });

  const repeatEntryPoint = page.getByRole("button", { name: localeLabels.repeatWeekly });
  await repeatEntryPoint.waitFor({ state: "visible" });
  await repeatEntryPoint.click();
  await waitForExactText(page, localeLabels.repeatTitle);
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `repeat-targets-${locale}-${width}.png`), fullPage: false });

  const conflictStatus = page.getByText(localeLabels.repeatConflict, { exact: true }).first();
  await conflictStatus.scrollIntoViewIfNeeded();
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `repeat-targets-${locale}-${width}-conflict.png`), fullPage: false });

  const targetCheckboxes = page.getByRole("checkbox");
  await targetCheckboxes.nth(0).click();
  await targetCheckboxes.nth(3).click();
  await page.getByRole("button", { name: localeLabels.reviewRepeat }).click();
  await page.getByRole("button", { name: localeLabels.confirmRepeat }).waitFor({ state: "visible" });
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `repeat-review-${locale}-${width}.png`), fullPage: false });

  await page.getByRole("button", { name: localeLabels.confirmRepeat }).click();
  await page.getByText(locale === "ar" ? /\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062a\u0643\u0631\u0627\u0631/ : /Confirm repeat\?/).last().waitFor({ state: "visible" });
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `repeat-confirmation-${locale}-${width}.png`), fullPage: false });
  await page.getByRole("button", { name: localeLabels.confirmRepeat }).last().click();
  await waitForExactText(page, localeLabels.scheduleTitle);
  await page.waitForTimeout(500);
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `schedule-${locale}-${width}-repeat-success.png`), fullPage: false });

  const addTimesButton = page.getByRole("button", { name: localeLabels.addTimes });
  if (!(await addTimesButton.count())) throw new Error(`${locale}: Add times was not rendered at ${page.url()}`);
  await addTimesButton.click();
  await waitForExactText(page, localeLabels.editorTitle);
  const initialIndividualDisclosure = await page.getByText(localeLabels.individualTimes, { exact: true }).count();
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `editor-${locale}-${width}-initial.png`), fullPage: false });

  await page.getByRole("button", { name: localeLabels.addPeriod }).click();
  await page.getByPlaceholder("09:00").waitFor({ state: "visible" });
  await waitForExactText(page, localeLabels.addPeriodTitle);
  await page.getByPlaceholder("09:00").first().scrollIntoViewIfNeeded();
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `editor-${locale}-${width}-add-period.png`), fullPage: false });

  const startInput = page.getByPlaceholder("09:00");
  const endInput = page.getByPlaceholder("11:00");
  await startInput.fill("12:00");
  await endInput.fill("14:00");
  const previewText = page.getByText(locale === "ar" ? /\u0633\u062a\u062a\u0645 \u0625\u0636\u0627\u0641\u0629/ : /appointment times will be added/).last();
  await previewText.scrollIntoViewIfNeeded();
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `editor-${locale}-${width}-valid-preview.png`), fullPage: false });

  await startInput.fill("14:00");
  await endInput.fill("13:00");
  await page.getByRole("button", { name: localeLabels.applyPeriod }).click();
  const invalidError = page.getByText(locale === "ar" ? /\u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0648\u0642\u062a \u0627\u0644\u0646\u0647\u0627\u064a\u0629/ : /end time must be after/).last();
  await invalidError.waitFor({ state: "visible" });
  await invalidError.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(outputDir, `editor-${locale}-${width}-invalid-boundary.png`), fullPage: false });

  await startInput.fill("12:00");
  await endInput.fill("14:00");
  await page.getByRole("button", { name: localeLabels.applyPeriod }).click();
  await page.getByRole("button", { name: localeLabels.addPeriod }).click();
  await startInput.fill("10:00");
  await endInput.fill("12:00");
  await page.getByRole("button", { name: localeLabels.applyPeriod }).click();
  const protectedError = page.getByText(locale === "ar" ? /\u062a\u062a\u0636\u0645\u0646 \u0647\u0630\u0647 \u0627\u0644\u0641\u062a\u0631\u0629/ : /includes protected or booked/).last();
  await protectedError.waitFor({ state: "visible" });
  await protectedError.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(outputDir, `editor-${locale}-${width}-protected-conflict.png`), fullPage: false });
  await page.reload({ waitUntil: "networkidle", timeout: 45000 });
  await waitForExactText(page, localeLabels.editorTitle);

  await page.getByRole("button", { name: localeLabels.individualTimes }).click();
  const protectedButtons = page.getByRole("button", { name: /10:30.*(Protected|\u0645\u062d\u0645\u064a)|10:30.*(Protected|\u0645\u062d\u0645\u064a)/i });
  const protectedCount = await protectedButtons.count();
  await protectedButtons.first().scrollIntoViewIfNeeded();
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `editor-${locale}-${width}-expanded.png`), fullPage: false });

  const unselectedTime = page.getByRole("button", { name: /8:00/ }).last();
  if (await unselectedTime.count()) {
    await unselectedTime.click();
    await unselectedTime.scrollIntoViewIfNeeded();
  }
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `editor-${locale}-${width}-selected-time.png`), fullPage: false });

  const saveButton = page.getByRole("button", { name: localeLabels.saveTimes });
  await saveButton.scrollIntoViewIfNeeded();
  await hideDevRefreshBanner(page);
  await page.screenshot({ path: path.join(outputDir, `editor-${locale}-${width}-save-action.png`), fullPage: false });

  await context.close();
  if (pageErrors.length) throw new Error(`${locale} page errors: ${pageErrors.join(" | ")}`);
  return {
    locale,
    width,
    homeStatesCaptured: locale === "ar" ? ["later", "joinable", "empty", "urgent"] : ["later", "empty"],
    editorReached: true,
    individualDisclosureVisible: initialIndividualDisclosure > 0,
    protectedCount,
  };
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

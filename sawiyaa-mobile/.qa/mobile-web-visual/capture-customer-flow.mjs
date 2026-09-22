import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import {
  mockPatientUser,
  mockPatientProfile,
  mockPractitioner1,
  mockPractitioner2,
  mockPractitionersList,
  mockNextSession,
  mockSessionsList,
  mockWallet,
  mockNotifications,
  mockConversations,
} from "./fixtures.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = "http://localhost:8081";
const CURRENT_DIR = path.resolve(__dirname, "..", "customer-screenshots", "web-mobile", "current");

[CURRENT_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const mockRefundPolicy = {
  id: "pol-1",
  key: "standard",
  titleAr: "سياسة الإلغاء والاسترداد",
  titleEn: "Refund & Cancellation Policy",
  clauseCount: 2,
  clauses: [
    {
      sortOrder: 1,
      titleAr: "الإلغاء قبل 24 ساعة",
      titleEn: "Cancellation before 24h",
      bodyAr: "استرداد كامل 100% في المحفظة.",
      bodyEn: "Full 100% refund to wallet.",
    },
    {
      sortOrder: 2,
      titleAr: "الإلغاء خلال 24 ساعة",
      titleEn: "Cancellation within 24h",
      bodyAr: "استرداد 50% من قيمة الجلسة.",
      bodyEn: "50% refund of session amount.",
    },
  ],
};

const mockConversationMessages = [
  {
    id: "msg-1",
    conversationId: "conv-1",
    senderId: "prac-1",
    senderRole: "PRACTITIONER",
    sender: {
      userId: "prac-1",
      displayName: "د. أحمد فايد",
      avatarUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300",
      publicRoleLabel: "Practitioner",
    },
    body: "أهلاً بك يا أحمد، أتمنى أن تكون بخير. هل هناك موضوع محدد تود أن نركز عليه في جلستنا القادمة؟",
    sentAt: "2026-08-29T08:00:00.000Z",
    messageType: "TEXT",
    status: "SENT",
    deliveredAt: null,
    readAt: null,
    attachments: [],
  },
  {
    id: "msg-2",
    conversationId: "conv-1",
    senderId: "qa-patient-1",
    senderRole: "PATIENT",
    sender: {
      userId: "qa-patient-1",
      displayName: "أحمد — حساب اختبار",
      avatarUrl: null,
      publicRoleLabel: "Patient",
    },
    body: "أهلاً دكتور أحمد، أود التركيز على التعامل مع التوتر وضغوط العمل.",
    sentAt: "2026-08-29T08:15:00.000Z",
    messageType: "TEXT",
    status: "SENT",
    deliveredAt: "2026-08-29T08:15:10.000Z",
    readAt: "2026-08-29T08:16:00.000Z",
    attachments: [],
  },
];

const mockConversationDetail = {
  id: "conv-1",
  conversationId: "conv-1",
  type: "SESSION",
  title: "د. أحمد فايد",
  subject: "جلسة المتابعة النفسية",
  contextLabel: "جلسة المتابعة النفسية",
  contextId: "sess-ready-1",
  status: "ACTIVE",
  supportTicketId: null,
  isResolved: false,
  isReadOnly: false,
  canSend: true,
  sendDisabledReason: null,
  unreadCount: 0,
  lastActivityAt: "2026-08-29T08:15:00.000Z",
  createdAt: "2026-08-29T07:00:00.000Z",
  updatedAt: "2026-08-29T08:15:00.000Z",
  counterpart: {
    id: "prac-1",
    displayName: "د. أحمد فايد",
    avatarUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300",
    role: "PRACTITIONER",
  },
  participants: [
    {
      userId: "prac-1",
      displayName: "د. أحمد فايد",
      avatarUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300",
      publicRoleLabel: "Practitioner",
      role: "PRACTITIONER",
    },
    {
      userId: "qa-patient-1",
      displayName: "أحمد — حساب اختبار",
      avatarUrl: null,
      publicRoleLabel: "Patient",
      role: "PATIENT",
    },
  ],
  otherParty: {
    userId: "prac-1",
    displayName: "د. أحمد فايد",
    avatarUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300",
    publicRoleLabel: "Practitioner",
  },
  supportQueueState: null,
  lastMessage: mockConversationMessages[1],
};

async function setupPage(page) {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;

    if (pathname.includes("/auth/me")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: mockPatientUser }) });
    }
    if (pathname.endsWith("/patients/me") || pathname.endsWith("/patients/me/profile")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { item: mockPatientProfile, ...mockPatientProfile }, item: mockPatientProfile, ...mockPatientProfile }) });
    }
    if (pathname.includes("/refund-policies")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: mockRefundPolicy, item: mockRefundPolicy }) });
    }
    if (pathname.endsWith("/users/me/next-session")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: mockNextSession }) });
    }
    if (pathname.includes("/public/practitioners/dr-ahmed-fayed/presence")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { presence: { status: "ONLINE", isInstantBookingEnabled: true, lastSeenAt: null } } }) });
    }
    if (pathname.includes("/public/practitioners/dr-ahmed-fayed/package-plans")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } } }) });
    }
    if (pathname.includes("/public/practitioners/dr-ahmed-fayed/instant-booking-availability")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { availableNow: true, durations: { 30: true, 60: true }, checkedAt: new Date().toISOString() } }) });
    }
    if (pathname.includes("/public/practitioners/dr-ahmed-fayed") && !pathname.includes("/availability")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { item: mockPractitioner1 }, item: mockPractitioner1 }) });
    }
    if (pathname.includes("/public/practitioners/dr-sarah-khalil") && !pathname.includes("/availability")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { item: mockPractitioner2 }, item: mockPractitioner2 }) });
    }
    if (pathname.includes("/public/practitioners") && !pathname.match(/\/public\/practitioners\/[^\/]+$/) && !pathname.includes("/availability")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: mockPractitionersList }) });
    }
    if (pathname.includes("/availability/windows")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            timezone: "Africa/Cairo",
            range: { from: "2026-09-08T00:00:00.000Z", to: "2026-09-15T00:00:00.000Z" },
            windows: [
              { id: "win-1", startAt: "2026-09-08T10:00:00.000Z", endAt: "2026-09-08T14:00:00.000Z", slotDurationMinutes: 30 },
              { id: "win-2", startAt: "2026-09-09T15:00:00.000Z", endAt: "2026-09-09T19:00:00.000Z", slotDurationMinutes: 30 },
            ],
            acceptsNormalBookings: true,
          },
        }),
      });
    }
    if (pathname.includes("/patients/me/sessions") && !pathname.match(/\/patients\/me\/sessions\/[^\/]+$/) && !pathname.includes("/summary") && !pathname.includes("/pay") && !pathname.includes("/capabilities") && !pathname.includes("/financial-breakdown")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: mockSessionsList, pagination: { page: 1, limit: 10, total: 3, totalPages: 1 } } }) });
    }
    if (pathname.includes("/patients/me/sessions/summary")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { totalUpcoming: 2, totalCompleted: 1, nextSession: mockSessionsList[0] } }) });
    }
    if (pathname.includes("/patients/me/sessions/sess-ready-1")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { item: mockSessionsList[0] }, item: mockSessionsList[0] }) });
    }
    if (pathname.includes("/patients/me/sessions/sess-hist-3")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { item: mockSessionsList[2] }, item: mockSessionsList[2] }) });
    }
    if (pathname.includes("/patients/me/sessions/sess-pay-2") && !pathname.includes("/pay") && !pathname.includes("/financial-breakdown") && !pathname.includes("/capabilities")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { item: mockSessionsList[1] }, item: mockSessionsList[1] }) });
    }
    if (pathname.includes("/financial-breakdown")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { item: { sessionId: "sess-pay-2", currency: "EGP", regionalPricingMode: "EGYPT_LOCAL", paymentProvider: "PAYMOB", resolvedCountryIsoCode: "EG", grossAmount: "700.00", discountAmount: "0.00", netPaidAmount: "700.00", coupon: null } },
        }),
      });
    }
    if (pathname.includes("/capabilities")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { item: { provider: "PAYMOB", checkoutFlow: "intention", methods: [{ key: "CARD", label: "بطاقة بنكية", type: "GATEWAY", enabled: true }, { key: "WALLET", label: "محفظة التطبيق", type: "GATEWAY", enabled: true }], supportedMethods: ["CARD", "WALLET"], defaultMethod: "CARD", currency: "EGP", regionalPricingMode: "EGYPT_LOCAL", resolvedCountryIsoCode: "EG", wallet: { enabled: true, availableBalance: "100.00", currencyCode: "EGP", canUseFullAmount: false, canUsePartialAmount: true } } } }),
      });
    }
    if (pathname.includes("/patients/me/payments")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              { id: "pmt-1", sessionId: "sess-hist-3", amount: "450.00", currencyCode: "EGP", status: "COMPLETED", createdAt: "2026-08-20T10:45:00.000Z", method: "CARD", type: "SESSION", sessionTitle: "د. أحمد فايد — استشارة نفسية" },
            ],
            pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
          },
          items: [
            { id: "pmt-1", sessionId: "sess-hist-3", amount: "450.00", currencyCode: "EGP", status: "COMPLETED", createdAt: "2026-08-20T10:45:00.000Z", method: "CARD", type: "SESSION", sessionTitle: "د. أحمد فايد — استشارة نفسية" },
          ],
        }),
      });
    }
    if (pathname.includes("/patients/me/wallet/entries")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { items: mockWallet.entries, pagination: { page: 1, limit: 10, total: 2, totalPages: 1 } },
          items: mockWallet.entries,
        }),
      });
    }
    if (pathname.includes("/patients/me/wallet")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { item: mockWallet, ...mockWallet },
          item: mockWallet,
          ...mockWallet,
        }),
      });
    }
    if (pathname.endsWith("/notifications/me/unread-count")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { item: { unreadCount: 1 } } }) });
    }
    if (pathname.endsWith("/patients/me/reviews/pending")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [], pagination: { page: 1, limit: 3, totalItems: 0, totalPages: 0 } } }) });
    }
    if (pathname.includes("/notifications/me")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: mockNotifications, pagination: { page: 1, limit: 20, hasNextPage: false, nextPage: null } } }) });
    }
    if (pathname.includes("/messages/conversations/conv-1/messages") || pathname.includes("/chat/conversations/conv-1/messages")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { items: mockConversationMessages, pagination: { page: 1, limit: 30, total: 2, totalPages: 1 } }, items: mockConversationMessages, pagination: { page: 1, limit: 30, total: 2, totalPages: 1 } }),
      });
    }
    if (pathname.includes("/messages/conversations/conv-1") || pathname.includes("/chat/conversations/conv-1")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { item: mockConversationDetail, ...mockConversationDetail }, item: mockConversationDetail }) });
    }
    if (pathname.includes("/chat/conversations") || pathname.includes("/messages/conversations")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            items: [mockConversationDetail],
            pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
          },
          item: { totalUnreadMessages: 1 },
        }),
      });
    }
    if (pathname.includes("/support")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [], pagination: { page: 1, limit: 10, total: 0 } } }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: {} }) });
  });
}

async function setAuth(page) {
  await page.evaluate(() => {
    localStorage.setItem("sawiyaa.app.language", "ar");
    localStorage.setItem("fayed.app.language", "ar");
    localStorage.setItem("i18nextLng", "ar");
    localStorage.setItem("appLanguage", "ar");
    localStorage.setItem("sawiyaa.mobile.device.id.v1", "qa_device_id_1");
    localStorage.setItem("sawiyaa.mobile.auth.tokens.access.v1", "qa-token-access");
    localStorage.setItem("sawiyaa.mobile.auth.tokens.refresh.v1", "qa-token-refresh");
    localStorage.setItem("sawiyaa.mobile.auth.tokens.access.expiresAt.v1", "2099-01-01T00:00:00.000Z");
    localStorage.setItem("sawiyaa.mobile.auth.tokens.refresh.expiresAt.v1", "2099-01-02T00:00:00.000Z");
    localStorage.setItem(
      "sawiyaa.mobile.auth.session.v2",
      JSON.stringify({
        role: "patient",
        user: { id: "qa-patient-1", displayName: "أحمد — حساب اختبار", email: "qa-patient@sawiyaa.test", status: "ACTIVE", roles: ["PATIENT"], isEmailVerified: true, isPhoneVerified: true },
      })
    );
  });
}

const FLOW_STEPS = [
  { file: "01-home-ar.png", desc: "Customer Home", route: "/", assert: ["patient-home-screen", "أحمد"] },
  { file: "02-discovery-ar.png", desc: "Discovery Listing", route: "/discovery", assert: ["اكتشف", "عرض الملف والحجز"] },
  { file: "03-discovery-filters-ar.png", desc: "Discovery Filters", route: "/discovery/filters", assert: ["الفلاتر", "التخصص"] },
  { file: "04-practitioner-profile-ar.png", desc: "Practitioner Profile", route: "/discovery/dr-ahmed-fayed", assert: ["ملف المختص", "رسوم الجلسات الفردية"] },
  { file: "05-booking-select-time-ar.png", desc: "Booking Duration", route: "/sessions/duration?slug=dr-ahmed-fayed", assert: ["patient-booking-duration-screen", "اختر مدة الجلسة"] },
  { file: "06-booking-confirm-ar.png", desc: "Booking Time Selection", route: "/sessions/select-time?slug=dr-ahmed-fayed&durationMinutes=30", assert: ["اختر موعد الجلسة", "اختر التاريخ والوقت للجلسة"] },
  { file: "07-checkout-ar.png", desc: "Session Checkout", route: "/sessions/sess-pay-2/pay", assert: ["مراجعة الدفع"] },
  { file: "08-checkout-wallet-ar.png", desc: "Checkout + Wallet", route: "/sessions/sess-pay-2/pay", assert: ["مراجعة الدفع", "المدفوع من المحفظة", "المتبقي عبر بوابة الدفع", "600 جنيه مصري"] },
    { file: "09-instant-booking-ar.png", desc: "Instant Booking", route: "/instant-booking", assert: ["حجز فوري مع معالج متاح الآن", "المعالجون المتاحون الآن"] },
  { file: "10-sessions-ar.png", desc: "Customer Sessions List", route: "/sessions", assert: ["الجلسات", "تفاصيل الجلسة"] },
  { file: "11-session-detail-ar.png", desc: "Session Detail", route: "/sessions/sess-hist-3", assert: ["تفاصيل الجلسة", "مكتملة"] },
  { file: "12-messages-inbox-ar.png", desc: "Messages Inbox", route: "/messages", assert: ["الرسائل", "د. أحمد فايد"] },
  { file: "13-message-thread-ar.png", desc: "Message Thread", route: "/messages/conv-1", assert: ["د. أحمد فايد", "أهلاً"] },
  { file: "14-payments-ar.png", desc: "Wallet Overview", route: "/payments", assert: ["المحفظة", "الرصيد المتاح"] },
  { file: "15-wallet-ar.png", desc: "Wallet Transactions", route: "/payments/transactions", assert: ["المعاملات", "الإيداعات"] },
  { file: "16-notifications-ar.png", desc: "Notifications", route: "/notifications", assert: ["الإشعارات", "إشعار"] },
  { file: "17-support-ar.png", desc: "Support Request", route: "/support", assert: ["راسل الدعم", "إرسال الطلب"] },
  { file: "18-profile-ar.png", desc: "Patient Profile", route: "/profile", assert: ["المعلومات الشخصية", "أحمد"] },
  { file: "19-settings-ar.png", desc: "Settings & Preferences", route: "/profile-preferences", assert: ["الإعدادات", "اللغة"] },
];

async function clickTab(page, tabName) {
  const tab = page.getByRole("tab", { name: tabName }).or(page.getByText(tabName, { exact: true })).last();
  await tab.waitFor({ state: "visible", timeout: 5000 });
  await tab.click();
  await page.waitForTimeout(1000);
}

async function navigateStep(page, step) {
  console.log(`  Executing verified navigation: ${step.desc}`);
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForTimeout(1000);

  if (step.file === "02-discovery-ar.png") {
    await clickTab(page, "اكتشف");
  } else if (step.file === "03-discovery-filters-ar.png") {
    await clickTab(page, "اكتشف");
    await page.getByText("الفلاتر", { exact: true }).last().click();
  } else if (step.file === "04-practitioner-profile-ar.png" || step.file === "05-booking-select-time-ar.png" || step.file === "06-booking-confirm-ar.png") {
    await clickTab(page, "اكتشف");
    await page.getByText("عرض الملف والحجز", { exact: true }).first().click();
    await page.waitForTimeout(900);
    if (step.file !== "04-practitioner-profile-ar.png") {
      await page.getByText("احجز جلستك الآن", { exact: true }).click();
      await page.waitForTimeout(900);
    }
    if (step.file === "06-booking-confirm-ar.png") {
      await page.getByTestId("patient-booking-duration-screen").locator('[role="radio"]').first().click({ force: true });
      await page.getByText("اختر موعدًا", { exact: true }).click();
      await page.waitForTimeout(1200);
    }
  } else if (step.file === "07-checkout-ar.png" || step.file === "08-checkout-wallet-ar.png") {
    await clickTab(page, "الجلسات");
    await page.getByText("إكمال الدفع", { exact: true }).first().click();
    await page.waitForTimeout(1200);
    const closePolicyButton = page.getByRole("button", { name: "إغلاق نافذة سياسة الاسترداد", exact: true }).last();
    const policyButton = page.getByRole("button", { name: "أراجعها لاحقًا", exact: true }).last();
    const policyText = page.getByText("أراجعها لاحقًا", { exact: true }).last();
    const dismissPolicy = (await closePolicyButton.isVisible().catch(() => false))
      ? closePolicyButton
      : (await policyButton.isVisible().catch(() => false)) ? policyButton : policyText;
    if (await dismissPolicy.isVisible().catch(() => false)) {
      await dismissPolicy.click({ force: true });
      await page.waitForTimeout(300);
    }
    try {
      await closePolicyButton.waitFor({ state: "hidden", timeout: 3000 });
    } catch {
      throw new Error("Refund policy modal remained open during checkout capture");
    }
    if (step.file === "08-checkout-wallet-ar.png") {
      const walletToggle = page.locator('input[type="checkbox"], [role="switch"]').first();
      if (!(await walletToggle.isVisible().catch(() => false))) throw new Error("Wallet toggle was not rendered");
      await page.getByText("استخدام رصيد المحفظة", { exact: true }).click();
      await page.waitForTimeout(800);
      await page.getByText("المتبقي عبر بوابة الدفع", { exact: true }).scrollIntoViewIfNeeded();
    }
  } else if (step.file === "09-instant-booking-ar.png") {
    await clickTab(page, "اكتشف");
    await page.evaluate(() => {
      window.history.pushState({}, "", "/instant-booking");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await page.waitForTimeout(1500);
  } else if (step.file === "10-sessions-ar.png") {
    await clickTab(page, "الجلسات");
  } else if (step.file === "11-session-detail-ar.png") {
    await clickTab(page, "الجلسات");
    await page.getByText("تفاصيل الجلسة", { exact: true }).first().click();
  } else if (step.file === "12-messages-inbox-ar.png") {
    await clickTab(page, "الرسائل");
  } else if (step.file === "13-message-thread-ar.png") {
    await clickTab(page, "الرسائل");
    await page.getByText("أهلاً دكتور أحمد", { exact: false }).click();
    await page.getByText("أهلاً دكتور أحمد", { exact: false }).last().waitFor({ state: "visible", timeout: 5000 });
  } else if (step.file === "14-payments-ar.png") {
    await clickTab(page, "المزيد");
    await page.getByText("المحفظة", { exact: true }).first().click();
  } else if (step.file === "15-wallet-ar.png") {
    await clickTab(page, "المزيد");
    await page.getByText("المحفظة", { exact: true }).first().click();
    await page.getByText("عرض الكل", { exact: true }).first().click();
  } else if (step.file === "16-notifications-ar.png") {
    const notificationButton = page.locator('[aria-label="app-header-notifications-button"]').first();
    await notificationButton.waitFor({ state: "visible", timeout: 5000 });
    await notificationButton.click();
  } else if (step.file === "17-support-ar.png") {
    await clickTab(page, "المزيد");
    await page.getByText("الدعم", { exact: true }).last().click();
    await page.locator('[aria-label="رسالة جديدة للدعم"]').click();
  } else if (step.file === "18-profile-ar.png") {
    await clickTab(page, "المزيد");
    await page.getByText("المعلومات الشخصية", { exact: true }).first().click();
  } else if (step.file === "19-settings-ar.png") {
    await clickTab(page, "المزيد");
    await page.getByText("التفضيلات واللغة", { exact: true }).first().click();
  }

  await assertScreen(page, step);
}

async function assertScreen(page, step) {
  const bodyText = await page.locator("body").innerText();
  for (const expected of step.assert) {
    const found = expected.endsWith("-screen")
      ? await page.getByTestId(expected).isVisible().catch(() => false)
      : bodyText.includes(expected);
    if (!found) throw new Error(`Identity assertion failed: expected ${JSON.stringify(expected)} on ${step.file}; body=${JSON.stringify(bodyText.slice(0, 500))}`);
  }
  if (/Each child in a list should have a unique|Warning: Each child/i.test(bodyText)) {
    throw new Error("Visible React key warning overlay detected");
  }
}

async function run() {
  console.log("Starting Clean Customer Visual QA Capture Suite (Playwright @ 390x844)...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    locale: "ar-EG",
    timezoneId: "Africa/Cairo",
  });

  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  await page.addInitScript(() => {
    localStorage.setItem("sawiyaa.app.language", "ar");
    localStorage.setItem("fayed.app.language", "ar");
    localStorage.setItem("i18nextLng", "ar");
    localStorage.setItem("appLanguage", "ar");
    localStorage.setItem("sawiyaa.mobile.device.id.v1", "qa_device_id_1");
    localStorage.setItem("sawiyaa.mobile.auth.tokens.access.v1", "qa-token-access");
    localStorage.setItem("sawiyaa.mobile.auth.tokens.refresh.v1", "qa-token-refresh");
    localStorage.setItem("sawiyaa.mobile.auth.tokens.access.expiresAt.v1", "2099-01-01T00:00:00.000Z");
    localStorage.setItem("sawiyaa.mobile.auth.tokens.refresh.expiresAt.v1", "2099-01-02T00:00:00.000Z");
    localStorage.setItem("sawiyaa.mobile.auth.session.v2", JSON.stringify({ role: "patient", user: { id: "qa-patient-1", displayName: "أحمد — حساب اختبار", email: "qa-patient@sawiyaa.test", status: "ACTIVE", roles: ["PATIENT"], isEmailVerified: true, isPhoneVerified: true } }));
  });
  const consoleWarnings = [];
  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      const text = msg.text();
      consoleWarnings.push(text);
      console.log(`[Browser ${msg.type()}]:`, text);
    }
  });
  page.on("pageerror", (err) => console.error("[Browser unhandled error]:", err.message));
  await setupPage(page);

  console.log("Warming up Expo Web bundle...");
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForTimeout(2000);
  await setAuth(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const results = [];
  for (const step of FLOW_STEPS) {
    console.log(`[Capturing] ${step.file} - ${step.desc}...`);
    try {
      await navigateStep(page, step);

      const currentOut = path.join(CURRENT_DIR, step.file);
      await page.screenshot({ path: currentOut, fullPage: false });
      console.log(`  -> Saved ${step.file}`);
      results.push({ ...step, result: "PASS", actualRoute: new URL(page.url()).pathname + new URL(page.url()).search });
    } catch (err) {
      console.error(`  -> Failed ${step.file}: ${err.message}`);
      results.push({ ...step, result: "FAIL", actualRoute: page.url(), error: err.message });
    }
  }

  await browser.close();
  const reportPath = path.join(CURRENT_DIR, "capture-report.json");
  fs.writeFileSync(reportPath, JSON.stringify({ mode: "Expo Web / 390x844 / Arabic RTL / fixture-based", results, consoleWarnings }, null, 2));
  const passed = results.filter((item) => item.result === "PASS").length;
  console.log(`\nVerified customer visual QA screens: ${passed} / ${FLOW_STEPS.length}`);
  console.log(`Capture report: ${reportPath}`);
  if (passed !== FLOW_STEPS.length) process.exitCode = 1;
}

run().catch((err) => {
  console.error("Runner failed:", err);
  process.exit(1);
});

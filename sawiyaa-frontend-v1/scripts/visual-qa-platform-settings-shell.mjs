import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const timestamp = "2026-08-23-102500";
const outputDir = path.resolve(`d:/Web/full-projects/sawiyaa/qa-evidence/platform-settings-shell/${timestamp}`);
await fs.mkdir(outputDir, { recursive: true });

const baseUrl = "http://localhost:3000";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  const payload = Buffer.from(
    JSON.stringify({
      sub: "admin-1",
      email: "admin@sawiyaa.com",
      role: "ADMIN",
      roles: ["ADMIN", "SUPER_ADMIN"],
      exp: Math.floor(Date.now() / 1000) + 86400,
    })
  ).toString("base64url");
  const mockJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.signature`;

  const userData = {
    id: "admin-1",
    email: "admin@sawiyaa.com",
    firstName: "Admin",
    lastName: "Sawiyaa",
    role: "ADMIN",
    roles: ["ADMIN", "SUPER_ADMIN"],
    tenant: { id: "t1", name: "Sawiyaa", slug: "sawiyaa" },
  };

  const mockSettingsData = {
    categories: ["SESSION", "NOTIFICATION", "BOOKING", "PAYMENT", "PAYOUT", "SYSTEM", "LOCALE", "SECURITY"],
    settings: [
      {
        key: "INSTANT_BOOKING_REQUEST_TTL_MINUTES",
        label: "Instant request response window",
        labelAr: "مدة انتظار رد المختص على طلب الجلسة الفورية",
        description: "Minutes a practitioner has to accept or reject a new Instant Booking request.",
        descriptionAr: "عدد الدقائق المتاحة للمختص لقبول أو رفض طلب جلسة فورية جديد.",
        category: "SESSION",
        domain: "instant-booking",
        valueType: "INTEGER",
        value: 2,
        defaultValue: 2,
        source: "CATALOG_DEFAULT",
        editable: true,
        permission: "configuration.edit.operational",
        effect: "IMMEDIATE",
        uiMetadata: { control: "integer" },
      },
      {
        key: "INSTANT_BOOKING_PAYMENT_WINDOW_MINUTES",
        label: "Instant payment completion window",
        labelAr: "مهلة إتمام الدفع بعد قبول طلب الجلسة الفورية",
        description: "Minutes a patient has to complete payment after acceptance.",
        descriptionAr: "عدد الدقائق المتاحة للمريض لإتمام الدفع بعد قبول الطلب.",
        category: "SESSION",
        domain: "instant-booking",
        valueType: "INTEGER",
        value: 5,
        defaultValue: 5,
        source: "CATALOG_DEFAULT",
        editable: true,
        permission: "configuration.edit.operational",
        effect: "IMMEDIATE",
        uiMetadata: { control: "integer" },
      },
      {
        key: "SESSION_JOIN_EARLY_MINUTES",
        label: "Session Join Early Minutes",
        labelAr: "دقائق فتح الدخول قبل الجلسة",
        description: "Configured early join window before the scheduled start.",
        descriptionAr: "نافذة الدخول القابلة للتهيئة قبل بداية الجلسة.",
        category: "SESSION",
        domain: "sessions",
        valueType: "INTEGER",
        value: 15,
        defaultValue: 15,
        source: "CATALOG_DEFAULT",
        editable: true,
        permission: "configuration.edit.operational",
        effect: "NEW_SESSIONS_ONLY",
        uiMetadata: { control: "integer" },
      },
      {
        key: "SESSION_JOIN_AFTER_END_GRACE_MINUTES",
        label: "Session Join After-End Grace Minutes",
        labelAr: "دقائق السماح بالدخول بعد نهاية الجلسة",
        description: "Configured post-end reconnect grace window.",
        descriptionAr: "نافذة السماح القابلة للتهيئة لإعادة الدخول بعد نهاية الجلسة.",
        category: "SESSION",
        domain: "sessions",
        valueType: "INTEGER",
        value: 10,
        defaultValue: 10,
        source: "CATALOG_DEFAULT",
        editable: true,
        permission: "configuration.edit.operational",
        effect: "NEW_SESSIONS_ONLY",
        uiMetadata: { control: "integer" },
      },
      {
        key: "packages.enabled",
        label: "Package Plans Enabled",
        labelAr: "تفعيل باقات الجلسات",
        description: "Controls whether standardized package plans are visible",
        descriptionAr: "التحكم في ظهور باقات الجلسات المعتمدة للمرضى",
        category: "BOOKING",
        domain: "packages",
        valueType: "BOOLEAN",
        value: true,
        defaultValue: true,
        source: "CATALOG_DEFAULT",
        editable: true,
        permission: "configuration.edit.operational",
        effect: "IMMEDIATE",
        uiMetadata: { control: "toggle" },
      },
      {
        key: "SESSION_REMINDER_OFFSETS_MINUTES",
        label: "Session Reminder Offsets (Minutes)",
        labelAr: "مواعيد تذكيرات الجلسة بالدقائق",
        description: "Unique non-negative offsets before start.",
        descriptionAr: "فواصل زمنية موجبة أو صفرية قبل بداية الجلسة.",
        category: "NOTIFICATION",
        domain: "sessions",
        valueType: "JSON",
        value: [60, 15, 0],
        defaultValue: [60, 15, 0],
        source: "OVERRIDE",
        editable: true,
        permission: "configuration.edit.operational",
        effect: "NEW_SESSIONS_ONLY",
        uiMetadata: { control: "integer-list" },
      },
      {
        key: "SESSION_LATE_REMINDER_ENABLED",
        label: "Late Session Reminder Enabled",
        labelAr: "تفعيل تذكير التأخر عن الجلسة",
        description: "Enable the reminder sent after the session starts when a participant has not joined.",
        descriptionAr: "تفعيل التذكير بعد بداية الجلسة عند عدم دخول أحد المشاركين.",
        category: "NOTIFICATION",
        domain: "sessions",
        valueType: "BOOLEAN",
        value: true,
        defaultValue: true,
        source: "CATALOG_DEFAULT",
        editable: true,
        permission: "configuration.edit.operational",
        effect: "IMMEDIATE",
        uiMetadata: { control: "toggle" },
      },
      {
        key: "notifications.channels.default",
        label: "Default Notification Channels",
        labelAr: "قنوات الإشعارات الافتراضية",
        description: "Default enabled notification channels",
        descriptionAr: "قنوات الإرسال المعتمدة افتراضياً في النظام",
        category: "NOTIFICATION",
        domain: "notifications",
        valueType: "STRING_ARRAY",
        value: ["EMAIL", "IN_APP"],
        defaultValue: ["EMAIL", "IN_APP"],
        source: "CATALOG_DEFAULT",
        editable: true,
        permission: "configuration.edit.operational",
        effect: "IMMEDIATE",
        uiMetadata: { control: "multi-select" },
      },
      {
        key: "payment.provider.paymob.enabled",
        label: "Paymob Provider Enabled",
        labelAr: "تفعيل بوابة باي موب",
        description: "Controls whether Paymob can be used for payment routing",
        descriptionAr: "التحكم في إتاحة بوابة باي موب لمعالجة المدفوعات",
        category: "PAYMENT",
        domain: "payment",
        valueType: "BOOLEAN",
        value: true,
        defaultValue: true,
        source: "CATALOG_DEFAULT",
        editable: false,
        readOnlyReason: "DEDICATED_PAYMENT_CONTROL",
        permission: "configuration.edit.financial",
        effect: "DEDICATED_CONTROL",
        uiMetadata: { control: "toggle" },
      },
      {
        key: "payment.provider.stripe.enabled",
        label: "Stripe Provider Enabled",
        labelAr: "تفعيل بوابة سترايب",
        description: "Controls whether Stripe can be used for payment routing",
        descriptionAr: "التحكم في إتاحة بوابة سترايب الدولية",
        category: "PAYMENT",
        domain: "payment",
        valueType: "BOOLEAN",
        value: false,
        defaultValue: false,
        source: "CATALOG_DEFAULT",
        editable: false,
        readOnlyReason: "DEDICATED_PAYMENT_CONTROL",
        permission: "configuration.edit.financial",
        effect: "DEDICATED_CONTROL",
        uiMetadata: { control: "toggle" },
      },
      {
        key: "file.uploads.chat.enabled",
        label: "Chat files enabled",
        labelAr: "تفعيل مرفقات المحادثات",
        description: "Allow chat participants to upload attachments.",
        descriptionAr: "السماح بإرسال الصور والمستندات في المحادثات الفورية.",
        category: "SYSTEM",
        domain: "file-uploads",
        valueType: "BOOLEAN",
        value: true,
        defaultValue: true,
        source: "CATALOG_DEFAULT",
        editable: true,
        permission: "configuration.edit.operational",
        effect: "IMMEDIATE",
        uiMetadata: { control: "toggle" },
      },
      {
        key: "platform.defaultLocale",
        label: "Platform Default Locale",
        labelAr: "اللغة الافتراضية للمنصة",
        description: "Fallback locale when request locale is missing",
        descriptionAr: "اللغة المعتمدة للمنصة عند عدم تحديد اللغة",
        category: "LOCALE",
        domain: "platform",
        valueType: "STRING",
        value: "ar",
        defaultValue: "en",
        source: "OVERRIDE",
        editable: true,
        permission: "configuration.edit.operational",
        enumOptions: ["ar", "en"],
        effect: "IMMEDIATE",
        uiMetadata: { control: "select" },
      },
    ],
  };

  async function captureLocaleScreenshots(locale, isMobile = false) {
    const isRtl = locale === "ar";
    const context = await browser.newContext({
      viewport: isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      locale: isRtl ? "ar-EG" : "en-US",
      timezoneId: "Africa/Cairo",
    });

    await context.addCookies([
      { name: "sawiyaa_access_token", value: mockJwt, domain: "localhost", path: "/" },
      { name: "sawiyaa_user_role", value: "ADMIN", domain: "localhost", path: "/" },
      { name: "sawiyaa_user_data", value: JSON.stringify(userData), domain: "localhost", path: "/" },
    ]);

    const page = await context.newPage();

    // Mock Backend Endpoints
    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: userData }) })
    );
    await page.route("**/api/v1/admin/platform-settings**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: mockSettingsData }) })
    );
    await page.route("**/api/v1/admin/finance/revenue-share-rules", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            item: {
              platformCommissionPercent: "30.00",
              configurationState: "READY",
              expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
            },
          },
        }),
      })
    );

    const prefix = `${locale}${isMobile ? "-mobile" : ""}`;

    // 1. Landing Hub (All Domains)
    await page.goto(`${baseUrl}/${locale}/admin/platform-settings`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outputDir, `${prefix}-landing-hub.png`), fullPage: true });
    console.log(`Captured ${prefix}-landing-hub.png`);

    if (!isMobile) {
      // 2. Focused Domain: Sessions & Booking via deep-link
      await page.goto(`${baseUrl}/${locale}/admin/platform-settings?domain=sessions`, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(outputDir, `${prefix}-domain-sessions.png`), fullPage: true });
      console.log(`Captured ${prefix}-domain-sessions.png`);

      // 3. Focused Domain: Notifications & Alerts via deep-link
      await page.goto(`${baseUrl}/${locale}/admin/platform-settings?domain=notifications`, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(outputDir, `${prefix}-domain-notifications.png`), fullPage: true });
      console.log(`Captured ${prefix}-domain-notifications.png`);

      // 4. Focused Domain: Revenue Share via deep-link
      await page.goto(`${baseUrl}/${locale}/admin/platform-settings?domain=revenue_share`, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(outputDir, `${prefix}-domain-revenue-share.png`), fullPage: true });
      console.log(`Captured ${prefix}-domain-revenue-share.png`);

      // 5. Focused Domain: Payments & Gateways via deep-link
      await page.goto(`${baseUrl}/${locale}/admin/platform-settings?domain=payments`, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(outputDir, `${prefix}-domain-payments.png`), fullPage: true });
      console.log(`Captured ${prefix}-domain-payments.png`);

      // 6. Focused Domain: Media & Storage via deep-link
      await page.goto(`${baseUrl}/${locale}/admin/platform-settings?domain=storage`, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(outputDir, `${prefix}-domain-storage.png`), fullPage: true });
      console.log(`Captured ${prefix}-domain-storage.png`);

      // 7. Global Search in Action
      await page.goto(`${baseUrl}/${locale}/admin/platform-settings`, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      const searchInputs = page.locator('input');
      const searchInput = searchInputs.first();
      await searchInput.fill(isRtl ? "باي موب" : "Paymob");
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(outputDir, `${prefix}-search-action.png`), fullPage: true });
      console.log(`Captured ${prefix}-search-action.png`);

      // 8. Edit Setting Modal
      const editButtons = page.locator('button:has-text("Edit"), button:has-text("تعديل")');
      if (await editButtons.count() > 0) {
        await editButtons.first().click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(outputDir, `${prefix}-edit-modal.png`), fullPage: false });
        console.log(`Captured ${prefix}-edit-modal.png`);
      }
    }

    await context.close();
  }

  // Execute captures across Arabic and English, Desktop and Mobile
  console.log("Starting visual QA capture...");
  await captureLocaleScreenshots("ar", false);
  await captureLocaleScreenshots("ar", true);
  await captureLocaleScreenshots("en", false);
  await captureLocaleScreenshots("en", true);
  console.log("All visual QA screenshots captured successfully!");
} finally {
  await browser.close();
}

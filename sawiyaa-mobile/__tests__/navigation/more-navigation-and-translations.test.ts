import fs from "node:fs";
import path from "node:path";

type JsonValue = Record<string, any>;

const root = path.resolve(__dirname, "../..");
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");
const locale = (language: "ar" | "en") =>
  JSON.parse(read(`src/i18n/locales/${language}.json`)) as JsonValue;
const at = (value: JsonValue, key: string) =>
  key.split(".").reduce((current, part) => current?.[part], value);

const patientMoreKeys = [
  "profileScreen.moreTitle",
  "profileScreen.moreSections.account",
  "profileScreen.moreSections.contentSupport",
  "profileScreen.moreSections.learningPurchases",
  "profileScreen.moreSections.accountLogoutSubtitle",
  "profileScreen.hub.rows.personal.title",
  "profileScreen.hub.rows.personal.subtitle",
  "profileScreen.hub.rows.wallet.title",
  "profileScreen.hub.rows.wallet.subtitle",
  "profileScreen.hub.rows.messages.title",
  "profileScreen.hub.rows.messages.subtitle",
  "profileScreen.hub.rows.notificationCenter.title",
  "profileScreen.hub.rows.notificationCenter.subtitle",
  "profileScreen.hub.rows.preferences.title",
  "settings.title",
  "settings.subtitle",
  "profileScreen.preferences.summary",
  "profileScreen.language.title",
  "profileScreen.preferences.timezoneTitle",
  "profileScreen.notifications.screenTitle",
  "profileScreen.hub.rows.notificationPreferences.subtitle",
  "profileScreen.hub.rows.notificationPreferences.unavailableSubtitle",
  "profileScreen.hub.rows.articles.title",
  "profileScreen.hub.rows.articles.subtitle",
  "profileScreen.more.rows.academy.title",
  "profileScreen.more.rows.academy.subtitle",
  "profileScreen.more.rows.packages.title",
  "profileScreen.more.rows.packages.subtitle",
  "profileScreen.hub.rows.support.title",
  "profileScreen.hub.rows.support.subtitle",
  "profileScreen.logout",
  "profileScreen.common.loading",
  "profileScreen.common.syncWarning",
];

const practitionerMoreKeys = [
  "practitioner.more.title",
  "practitioner.more.subtitle",
  "practitioner.more.sections.daily",
  "practitioner.more.sections.workTools",
  "practitioner.more.sections.finance",
  "practitioner.more.sections.accountSupport",
  "practitioner.more.sections.workEarnings",
  "practitioner.more.sections.account",
  "practitioner.more.sections.help",
  "practitioner.more.sections.accountAction",
  "practitioner.more.dailySubtitle",
  "practitioner.more.workToolsSubtitle",
  "practitioner.more.financeSubtitle",
  "practitioner.more.accountSupportSubtitle",
  "practitioner.more.workEarningsSubtitle",
  "practitioner.more.accountSubtitle",
  "practitioner.more.helpSubtitle",
  "practitioner.more.accountActionSubtitle",
  "practitioner.tab.more",
  ...[
    "sessions",
    "messages",
    "availability",
    "notifications",
    "finance",
    "wallet",
    "ledger",
    "settlements",
    "promoCodes",
    "account",
    "instantBookingPricing",
    "support",
    "logout",
  ].flatMap((row) => [
    `practitioner.more.rows.${row}.title`,
    `practitioner.more.rows.${row}.subtitle`,
  ]),
];

describe("authenticated More navigation and translation contract", () => {
  test.each(["ar", "en"] as const)("has complete Patient More translations in %s", (language) => {
    const translations = locale(language);
    for (const key of patientMoreKeys) {
      expect(at(translations, key)).toEqual(expect.any(String));
      expect(at(translations, key)).not.toBe("");
    }
  });

  test.each(["ar", "en"] as const)("has complete Practitioner More translations in %s", (language) => {
    const translations = locale(language);
    for (const key of practitionerMoreKeys) {
      expect(at(translations, key)).toEqual(expect.any(String));
      expect(at(translations, key)).not.toBe("");
    }
  });

  test("More translation key sets have exact parity", () => {
    expect(patientMoreKeys.filter((key) => at(locale("ar"), key) !== undefined)).toEqual(patientMoreKeys);
    expect(patientMoreKeys.filter((key) => at(locale("en"), key) !== undefined)).toEqual(patientMoreKeys);
    expect(practitionerMoreKeys.filter((key) => at(locale("ar"), key) !== undefined)).toEqual(practitionerMoreKeys);
    expect(practitionerMoreKeys.filter((key) => at(locale("en"), key) !== undefined)).toEqual(practitionerMoreKeys);
  });

  test("patient and practitioner visible tabs exclude Settings and utility routes", () => {
    const patientLayout = read("app/(patient)/_layout.tsx");
    const practitionerLayout = read("app/(practitioner)/_layout.tsx");
    for (const layout of [patientLayout, practitionerLayout]) {
      expect(layout).not.toMatch(/Tabs\.Screen[\s\S]{0,120}name=["']settings["']/);
      expect(layout).not.toMatch(/Tabs\.Screen[\s\S]{0,120}name=["']support\/new["'][\s\S]{0,160}tabBarIcon/);
    }
    expect(patientLayout).toMatch(/name="index"/);
    expect(patientLayout).toMatch(/name="discovery\/index"/);
    expect(patientLayout).toMatch(/name="sessions"/);
    expect(patientLayout).toMatch(/name="messages\/index"/);
    expect(patientLayout).toMatch(/name="profile"/);
    expect(patientLayout).toMatch(/name="notifications"[\s\S]{0,100}href: null/);
    expect(practitionerLayout).toMatch(/name="index"/);
    expect(practitionerLayout).toMatch(/name="availability\/index"/);
    expect(practitionerLayout).toMatch(/name="sessions\/index"/);
    expect(practitionerLayout).toMatch(/name="messages\/index"/);
    expect(practitionerLayout).toMatch(/name="more"/);
  });

  test("Practitioner primary destinations are not duplicated in More", () => {
    const more = read("app/(practitioner)/more.tsx");
    expect(more).not.toMatch(/key: "sessions"/);
    expect(more).not.toMatch(/key: "messages"/);
    expect(more).not.toMatch(/key: "availability"/);
  });

  test("Patient Home does not duplicate primary tabs as quick actions", () => {
    const home = read("app/(patient)/index.tsx");
    const profile = read("app/(patient)/profile.tsx");
    expect(home).toContain("PatientHomeDiscoverySurface");
    expect(home).not.toContain("QuickAction");
    expect(home).not.toContain('/(patient)/sessions"');
    expect(home).not.toContain('/(patient)/payments"');
    expect(profile).not.toContain('profileScreen.hub.rows.messages.title');
  });

  test.each(["ar", "en"] as const)("has focused Patient Home copy in %s", (language) => {
    const translations = locale(language);
    for (const key of [
      "home.discoverTab",
      "home.sessionsTab",
      "home.messagesTab",
      "home.moreTab",
      "home.discovery.title",
      "home.discovery.body",
      "home.discovery.cta",
      "home.session.paymentTitle",
      "home.session.joinTitle",
      "home.session.upcomingTitle",
    ]) {
      expect(at(translations, key)).toEqual(expect.any(String));
      expect(at(translations, key)).not.toBe("");
    }
  });

  test("More screens reach their role-owned Settings routes", () => {
    expect(read("app/(patient)/profile.tsx")).toContain('router.push("/(patient)/profile-preferences"');
    expect(read("app/(practitioner)/more.tsx")).toContain('router.push("/(settings)"');
    expect(fs.existsSync(path.join(root, "app/(settings)/index.tsx"))).toBe(true);
    expect(read("app/(settings)/_layout.tsx")).toContain("Stack");
  });

  test("Patient More keeps primary tabs and Notification Center out of the secondary menu", () => {
    const more = read("app/(patient)/profile.tsx");
    expect(more).not.toContain("notificationCenter.title");
    expect(more).not.toContain('router.push("/(patient)/notifications"');
    expect(more).not.toContain("P-{ ");
    expect(more).toContain('router.push("/(patient)/messages?tab=support"');
    expect(more).toContain('router.push("/(patient)/payments"');
  });

  test("Practitioner More owns only secondary destinations and approved vocabulary", () => {
    const more = read("app/(practitioner)/more.tsx");
    expect(more).toContain('router.push("/(practitioner)/finance")');
    expect(more).toContain('router.push("/(settings)")');
    expect(more).toContain('router.push("/(practitioner)/messages?tab=support")');
    expect(more).not.toContain('router.push("/(practitioner)/notifications")');
    expect(more).not.toMatch(/key: "(sessions|messages|availability|notifications|wallet|ledger|settlements)"/);

    expect(at(locale("ar"), "practitioner.more.rows.finance.title")).toBe("الأرباح");
    expect(at(locale("en"), "practitioner.more.rows.finance.title")).toBe("Earnings");
    expect(at(locale("ar"), "practitioner.more.rows.account.title")).toBe("الملف الشخصي");
    expect(at(locale("en"), "practitioner.more.rows.account.title")).toBe("Profile");
    expect(at(locale("ar"), "practitioner.more.rows.instantBookingPricing.title")).toBe("الحجز الفوري");
    expect(at(locale("en"), "practitioner.more.rows.instantBookingPricing.title")).toBe("Instant booking");
    expect(at(locale("ar"), "practitioner.more.rows.logout.title")).toBe("تسجيل الخروج");
    expect(at(locale("en"), "practitioner.more.rows.logout.title")).toBe("Log out");
  });
});

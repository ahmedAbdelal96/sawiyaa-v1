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
  "practitioner.more.dailySubtitle",
  "practitioner.more.workToolsSubtitle",
  "practitioner.more.financeSubtitle",
  "practitioner.more.accountSupportSubtitle",
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
    expect(patientLayout).toMatch(/name="sessions"/);
    expect(patientLayout).toMatch(/name="notifications"/);
    expect(patientLayout).toMatch(/name="profile"/);
    expect(practitionerLayout).toMatch(/name="index"/);
    expect(practitionerLayout).toMatch(/name="sessions\/index"/);
    expect(practitionerLayout).toMatch(/name="availability\/index"/);
    expect(practitionerLayout).toMatch(/name="more"/);
  });

  test("both More screens reach the shared non-tab Settings route", () => {
    expect(read("app/(patient)/profile.tsx")).toContain('router.push("/(settings)"');
    expect(read("app/(practitioner)/more.tsx")).toContain('router.push("/(settings)"');
    expect(fs.existsSync(path.join(root, "app/(settings)/index.tsx"))).toBe(true);
    expect(read("app/(settings)/_layout.tsx")).toContain("Stack");
  });
});

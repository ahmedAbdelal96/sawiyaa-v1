import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function read(locale, namespace) {
  return JSON.parse(
    fs.readFileSync(path.join(root, "messages", locale, `${namespace}.json`), "utf8"),
  );
}

function get(object, key) {
  return key.split(".").reduce((value, part) => value?.[part], object);
}

function values(object, prefix = "") {
  if (!object || typeof object !== "object") return [];
  return Object.entries(object).flatMap(([key, value]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return values(value, next);
    }
    return typeof value === "string" ? [{ key: next, value }] : [];
  });
}

function expectEqual(actual, expected, label) {
  if (actual !== expected) {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function expectNoValue(object, pattern, label) {
  for (const entry of values(object)) {
    if (pattern.test(entry.value)) {
      failures.push(`${label}.${entry.key}: forbidden user-facing value ${JSON.stringify(entry.value)}`);
    }
  }
}

const enNavigation = read("en", "navigation");
const arNavigation = read("ar", "navigation");
const enFinance = read("en", "practitioner-finance");
const arFinance = read("ar", "practitioner-finance");
const enListing = read("en", "practitioners-listing");
const arListing = read("ar", "practitioners-listing");
const enNotifications = read("en", "notifications");
const arNotifications = read("ar", "notifications");
const auditedNamespaces = [
  "home", "guided-matching", "instant-booking", "patient-journey",
  "practitioners-listing", "specialties-public", "care-chat", "sessions",
  "support", "messages-shell", "payments", "package-purchases", "auth",
  "public-articles", "practitioner-profile", "assessments", "notifications",
  "practitioner-finance",
];

expectEqual(get(enNavigation, "practitionerAvailability.title"), "Schedule", "EN practitioner schedule label");
expectEqual(get(arNavigation, "practitionerAvailability.title"), "الجدول", "AR practitioner schedule label");
expectEqual(get(enNavigation, "practitionerFinance.title"), "Earnings", "EN practitioner earnings label");
expectEqual(get(arNavigation, "practitionerFinance.title"), "الأرباح", "AR practitioner earnings label");
expectEqual(get(enNavigation, "practitionerNavigation.earnings"), "Earnings", "EN practitioner earnings navigation");
expectEqual(get(arNavigation, "practitionerNavigation.earnings"), "الأرباح", "AR practitioner earnings navigation");
expectEqual(get(enNavigation, "patientNavigation.practitioners"), "Specialists", "EN patient specialist navigation");
expectEqual(get(arNavigation, "patientNavigation.practitioners"), "المختصون", "AR patient specialist navigation");

expectEqual(get(enFinance, "summary.cards.available"), "Available balance", "EN available balance");
expectEqual(get(arFinance, "summary.cards.available"), "الرصيد المتاح", "AR available balance");
expectEqual(get(enFinance, "settlements.eyebrow"), "Transfers", "EN transfer surface");
expectEqual(get(arFinance, "settlements.eyebrow"), "التحويلات", "AR transfer surface");
expectEqual(get(enFinance, "ledger.eyebrow"), "Transactions", "EN transaction surface");
expectEqual(get(arFinance, "ledger.eyebrow"), "المعاملات", "AR transaction surface");
expectEqual(get(enListing, "filter.practitionerTypeDoctor"), "Specialist", "EN public role vocabulary");
expectEqual(get(arListing, "filter.practitionerTypeDoctor"), "مختص", "AR public role vocabulary");
expectEqual(get(read("en", "home"), "nav.practitioners"), "Specialists", "EN home specialist vocabulary");
expectEqual(get(read("ar", "home"), "nav.practitioners"), "المختصون", "AR home specialist vocabulary");
expectEqual(get(read("en", "guided-matching"), "journey.title"), "Find the right specialist", "EN matching title");
expectEqual(get(read("ar", "guided-matching"), "journey.title"), "اكتشف المختص المناسب", "AR matching title");
expectEqual(get(read("en", "instant-booking"), "empty.heading"), "No specialists are available right now", "EN instant-booking empty state");
expectEqual(get(read("ar", "instant-booking"), "empty.heading"), "لا يوجد مختصون متاحون الآن", "AR instant-booking empty state");

expectNoValue(enFinance, /\b(finance|ledger|settlement)s?\b/i, "EN practitioner finance copy");
expectNoValue(arFinance, /المالية|دفتر|تسوية/, "AR practitioner finance copy");
expectNoValue(enNotifications.slugs, /Finance|Push notification|\b(PUSH|IN_APP|EMAIL)\b/, "EN notification copy");
expectNoValue(arNotifications.slugs, /مالية|إشعار هاتف|\b(PUSH|IN_APP|EMAIL)\b/, "AR notification copy");

for (const locale of ["en", "ar"]) {
  for (const namespace of auditedNamespaces) {
    expectNoValue(read(locale, namespace), /\b(finance|ledger|settlement)\b/i, `${locale}/${namespace}`);
    expectNoValue(read(locale, namespace), /\b(PUSH|IN_APP|EMAIL|PAYMOB)\b/, `${locale}/${namespace}`);
  }
}

for (const [locale, namespace] of [
  ["en", "navigation"],
  ["ar", "navigation"],
  ["en", "practitioner-finance"],
  ["ar", "practitioner-finance"],
  ["en", "practitioner-area"],
  ["ar", "practitioner-area"],
  ["en", "patient-profile"],
  ["ar", "patient-profile"],
]) {
  expectNoValue(read(locale, namespace), /(?:Africa|Asia)\/[A-Za-z_]+/, `${locale}/${namespace}`);
}

if (failures.length) {
  console.error("Web product-copy validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Web product-copy validation passed.");

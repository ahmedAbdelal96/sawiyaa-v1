import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const drawerPath = path.join(
  root,
  "src/features/admin/practitioner-payouts/components/AdminPractitionerSettlementDrawer.tsx"
);
const apiPath = path.join(
  root,
  "src/features/admin/practitioner-payouts/api/admin-practitioner-payouts.api.ts"
);
const arPath = path.join(root, "messages/ar/admin-practitioner-payouts.json");
const enPath = path.join(root, "messages/en/admin-practitioner-payouts.json");

const drawerSource = fs.readFileSync(drawerPath, "utf8");
const apiSource = fs.readFileSync(apiPath, "utf8");
const ar = JSON.parse(fs.readFileSync(arPath, "utf8"));
const en = JSON.parse(fs.readFileSync(enPath, "utf8"));

function fail(message) {
  throw new Error(message);
}

if (!drawerSource.includes('role="combobox"')) {
  fail("Settlement drawer must use a searchable combobox for practitioner selection.");
}

if (!drawerSource.includes('<Modal')) {
  fail("Settlement drawer should use a centered modal layout instead of a side drawer.");
}

if (drawerSource.includes('<Drawer')) {
  fail("Settlement drawer must not use the narrow side drawer shell anymore.");
}

if (!drawerSource.includes('!max-h-[90vh]')) {
  fail("Settlement drawer modal should cap its height around 90vh.");
}

if (!drawerSource.includes('limit: 30')) {
  fail("Settlement drawer search must cap practitioner results at 30.");
}

if (drawerSource.includes('searchTerm.trim().length < 2')) {
  fail("Settlement drawer must not require a minimum search length before showing results.");
}

if (!drawerSource.includes('drawer.initialEmptyMessage')) {
  fail("Settlement drawer should show the default empty-state message when no practitioners are returned.");
}

if (!drawerSource.includes('drawer.identityConfirmation')) {
  fail("Settlement drawer should confirm the selected practitioner identity before recording the settlement.");
}

if (!drawerSource.includes('drawer.destinationSummary')) {
  fail("Settlement drawer should show a generic masked payout destination summary label.");
}

if (!drawerSource.includes('label={t("drawer.destinationSummary")}')) {
  fail("Settlement drawer should render the masked payout summary with a generic destination summary label.");
}

if (!drawerSource.includes('drawer.confirmationCheckboxLabel')) {
  fail("Settlement drawer should require an explicit confirmation checkbox before submit.");
}

if (!drawerSource.includes('type="checkbox"')) {
  fail("Settlement drawer should render a confirmation checkbox.");
}

for (const token of [
  "PractitionerAvatarBadge",
  "summary.avatarUrl",
  "getPractitionerCode(summary)",
  "getPractitionerSpecialty(summary)",
  "getPractitionerPayoutSummary(summary)",
  "selection.safeDisplayCode",
  "selection.primarySpecialtyName",
]) {
  if (!drawerSource.includes(token)) {
    fail(`Settlement drawer must include practitioner identity safety token: ${token}`);
  }
}

if (drawerSource.includes("PractitionerSearchResults")) {
  fail("Legacy practitioner result cards must not remain in the settlement drawer.");
}

if (!apiSource.includes("listAdminPractitionerPayoutSummaries")) {
  fail("Settlement drawer should reuse the existing practitioner payout summaries search endpoint.");
}

if (!apiSource.includes("/admin/practitioner-payouts/practitioners")) {
  fail("Settlement drawer API must still target the lightweight practitioner payout summaries endpoint.");
}

for (const locale of [ar, en]) {
  const drawer = locale.drawer;
  if (!drawer) {
    fail("Admin practitioner payout drawer translations are missing.");
  }

  if (typeof drawer.searchPlaceholder !== "string" || drawer.searchPlaceholder.trim().length === 0) {
    fail("Admin practitioner payout drawer must expose a localized search placeholder.");
  }

  for (const key of [
    "searchDescription",
    "searchHint",
    "initialEmptyMessage",
    "searchEmptyTitle",
    "searchEmptyDescription",
    "searchPlaceholder",
    "comboboxLabel",
    "clearSearch",
    "searchError",
    "destinationAvailable",
    "destinationMissingShort",
    "identityConfirmation",
    "destinationSummary",
    "confirmationCheckboxLabel",
  ]) {
    const value = drawer[key];
    if (typeof value !== "string" || value.trim().length === 0) {
      fail(`Missing settlement drawer translation key: drawer.${key}`);
    }
  }
}

if (ar.drawer.searchPlaceholder !== "ابحث باسم المعالج أو الكود") {
  fail("Arabic practitioner drawer placeholder must match the combobox search copy.");
}

if (en.drawer.searchPlaceholder !== "Search by practitioner name or code") {
  fail("English practitioner drawer placeholder must match the combobox search copy.");
}

if (ar.drawer.destinationSummary !== "ملخص وجهة الدفع") {
  fail("Arabic practitioner drawer must expose the masked payout destination summary label.");
}

if (en.drawer.destinationSummary !== "Payout destination summary") {
  fail("English practitioner drawer must expose the masked payout destination summary label.");
}

if (ar.drawer.identityConfirmation !== "تأكد من بيانات المعالج قبل تسجيل التسوية.") {
  fail("Arabic practitioner drawer must confirm the selected practitioner identity.");
}

if (en.drawer.identityConfirmation !== "Confirm the practitioner details before recording the settlement.") {
  fail("English practitioner drawer must confirm the selected practitioner identity.");
}

if (typeof ar.drawer.confirmationCheckboxLabel !== "string" || ar.drawer.confirmationCheckboxLabel.trim().length === 0) {
  fail("Arabic practitioner drawer must expose a confirmation checkbox label.");
}

if (typeof en.drawer.confirmationCheckboxLabel !== "string" || en.drawer.confirmationCheckboxLabel.trim().length === 0) {
  fail("English practitioner drawer must expose a confirmation checkbox label.");
}

if (JSON.stringify(ar).includes("Select an option") || JSON.stringify(en).includes("Select an option")) {
  fail("Settlement drawer translations should not leak generic English placeholders.");
}

if (JSON.stringify(ar).includes("????") || JSON.stringify(en).includes("????")) {
  fail("Settlement drawer translations contain question-mark corruption.");
}

console.log("[validate-admin-practitioner-settlements] ok");

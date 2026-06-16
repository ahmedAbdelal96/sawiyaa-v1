import fs from "node:fs";
import path from "node:path";

const root = "D:/Web/full-projects/fayed/fayed-frontend-v1";
const locales = ["en", "ar"];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function get(obj, dottedPath) {
  return dottedPath.split(".").reduce((current, key) => current?.[key], obj);
}

const requiredPaths = [
  "availability.exceptions.steps.eyebrow",
  "availability.exceptions.steps.step1",
  "availability.exceptions.steps.step1Hint",
  "availability.exceptions.steps.step2",
  "availability.exceptions.steps.step2Hint",
  "availability.exceptions.steps.step3",
  "availability.exceptions.steps.step3Hint",
  "availability.exceptions.actionHeading",
  "availability.exceptions.actionHint",
  "availability.exceptions.selectedAction",
  "availability.exceptions.dateSummary.note",
  "availability.exceptions.currentExceptions.heading",
  "availability.exceptions.currentExceptions.subtitle",
  "availability.exceptions.currentExceptions.empty",
  "availability.exceptions.currentExceptions.selectedDateMatch",
  "availability.exceptions.currentExceptions.filters.all",
  "availability.exceptions.currentExceptions.filters.blocking",
  "availability.exceptions.currentExceptions.filters.extra",
  "availability.exceptions.currentExceptions.columns.date",
  "availability.exceptions.currentExceptions.columns.weekday",
  "availability.exceptions.currentExceptions.columns.type",
  "availability.exceptions.currentExceptions.columns.range",
  "availability.exceptions.currentExceptions.columns.duration",
  "availability.exceptions.currentExceptions.columns.note",
  "availability.exceptions.currentExceptions.columns.status",
  "availability.exceptions.currentExceptions.actions",
  "availability.exceptions.currentExceptions.status.active",
  "availability.exceptions.currentExceptions.status.ended",
  "availability.exceptions.currentExceptions.noInternalNote",
  "availability.exceptions.labels.preventBookings",
  "availability.exceptions.labels.blockedTimes",
  "availability.exceptions.labels.duration",
  "availability.exceptions.modes.dayOff.noteTitle",
  "availability.exceptions.modes.dayOff.note",
  "availability.exceptions.validation.actionRequired",
  "availability.exceptions.dateSummary.dayBlocked",
  "availability.exceptions.dateSummary.dayHasExceptions",
];

for (const locale of locales) {
  const filePath = path.join(root, "messages", locale, "practitioner-area.json");
  const data = readJson(filePath);
  for (const requiredPath of requiredPaths) {
    const value = get(data, requiredPath);
    assert(
      typeof value === "string" && value.trim().length > 0,
      `${locale} is missing ${requiredPath}`,
    );
  }

  if (locale === "ar") {
    const subtree = JSON.stringify(data.availability.exceptions);
    assert(!/\?{3,}/.test(subtree), "Arabic availability exceptions subtree contains placeholder question marks");
    assert(!subtree.includes("استثناءات هذا اليوم"), "Selected-day-only heading still exists in Arabic availability exceptions subtree");
    assert(!subtree.includes("تعرض هنا أي تعديلات تمت إضافتها لهذا التاريخ فقط"), "Selected-day-only subtitle still exists in Arabic availability exceptions subtree");
    assert(subtree.includes("الاستثناءات الحالية"), "Arabic global exceptions heading is missing");
    assert(subtree.includes("لا توجد استثناءات حالية أو مستقبلية"), "Arabic global exceptions empty state is missing");
  }
}

const componentPath = path.join(
  root,
  "src",
  "features",
  "availability",
  "components",
  "AvailabilityExceptionsList.tsx",
);
const componentSource = fs.readFileSync(componentPath, "utf8");

for (const expectedSnippet of [
  't("steps.step1")',
  't("steps.step2")',
  't("steps.step3")',
  't("dateSummary.note")',
  't("currentExceptions.heading")',
  't("currentExceptions.filters.all")',
  't("currentExceptions.columns.date")',
  't("currentExceptions.status.active")',
  't("currentExceptions.noInternalNote")',
  't("currentExceptions.actions")',
  't("selectedAction")',
  "setSelectedMode(null)",
  "selectedMode === option.id",
  't("dateSummary.dayBlocked")',
  't("dateSummary.dayHasExceptions")',
  'overviewExceptions.map',
  'overviewFilter',
  '<DataTable',
  'rowActionsHeader={t("currentExceptions.actions")}',
  'rowActions={(row) =>',
  'getRowClassName={(row)',
]) {
  assert(componentSource.includes(expectedSnippet), `missing component reference: ${expectedSnippet}`);
}

for (const forbiddenSnippet of [
  "function ExceptionRow",
  "ExceptionRow(",
  "rounded-2xl border bg-white p-4 shadow-sm",
  "grid-cols-[minmax(0,1.3fr)",
]) {
  assert(!componentSource.includes(forbiddenSnippet), `forbidden card-row implementation snippet still exists: ${forbiddenSnippet}`);
}

console.log("practitioner availability exceptions validation passed.");

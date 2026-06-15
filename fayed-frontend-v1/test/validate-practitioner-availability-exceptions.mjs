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
  "availability.exceptions.modes.dayOff.noteTitle",
  "availability.exceptions.modes.dayOff.note",
  "availability.exceptions.validation.actionRequired",
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
  't("selectedAction")',
  "setSelectedMode(null)",
  "selectedMode === option.id",
]) {
  assert(componentSource.includes(expectedSnippet), `missing component reference: ${expectedSnippet}`);
}

console.log("practitioner availability exceptions validation passed.");

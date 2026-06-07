import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve("D:/Web/full-projects/fayed/fayed-mobile");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start === -1) {
    throw new Error(`Missing start marker: ${startMarker}`);
  }

  const end = source.indexOf(endMarker, start);
  if (end === -1) {
    throw new Error(`Missing end marker: ${endMarker}`);
  }

  return source.slice(start, end);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function loadJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function getPathValue(object, dottedPath) {
  return dottedPath.split(".").reduce((value, key) => {
    if (!value || typeof value !== "object") {
      return undefined;
    }

    return value[key];
  }, object);
}

const patientSessionsScreen = read("app/(patient)/sessions.tsx");
const i18nIndex = read("src/i18n/index.ts");
const workspaceBody = sliceBetween(
  patientSessionsScreen,
  "function buildWorkspaceSections(sessions: SessionListItem[]) {",
  "function buildOverview(sessions: SessionListItem[]) {",
);
const overviewBody = sliceBetween(
  patientSessionsScreen,
  "function buildOverview(sessions: SessionListItem[]) {",
  "function sortBySchedule(sessions: SessionListItem[], direction: \"asc\" | \"desc\") {",
);

assert(
  workspaceBody.includes('session.presentationStatus === "JOINABLE"') &&
    workspaceBody.includes('session.presentationStatus === "IN_PROGRESS"'),
  "Workspace sections should use presentationStatus for active grouping.",
);
assert(
  !workspaceBody.includes("session.status") &&
    !workspaceBody.includes("isSessionJoinableNow(session)"),
  "Workspace sections must not use raw status or joinability for grouping.",
);
assert(
  overviewBody.includes('session.presentationStatus === "JOINABLE"') &&
    overviewBody.includes('session.presentationStatus === "IN_PROGRESS"'),
  "Overview fallback should use presentationStatus.",
);
assert(
  !overviewBody.includes("session.status") &&
    !overviewBody.includes("isSessionJoinableNow(session)"),
  "Overview fallback must not use raw status or joinability.",
);

const ar = loadJson("src/i18n/locales/ar.json");
const en = loadJson("src/i18n/locales/en.json");

assert(
  i18nIndex.includes('import en from "./locales/en.json";') &&
    i18nIndex.includes('import ar from "./locales/ar.json";') &&
    !i18nIndex.includes("copy.json"),
  "i18n index should load only the real ar/en locale files.",
);

const requiredKeys = [
  "patientSessionsFlow.detail.summary",
  "patientSessionsFlow.detail.sessionAt",
  "patientSessionsFlow.detail.heroMode",
  "patientSessionsFlow.detail.actionsTitle",
  "patientSessionsFlow.detail.blocked.SESSION_JOIN_WINDOW_CLOSED",
  "patientSessionsFlow.detail.messages",
  "patientSessionsFlow.detail.actionSummary.messages",
  "patientSessionsFlow.detail.sessionFacts",
  "patientSessionsFlow.detail.duration",
  "patientSessionsFlow.detail.flowType",
  "patientSessionsFlow.detail.flowTypeValue.SCHEDULED",
  "patientSessionsFlow.detail.timezone",
  "patientSessionsFlow.detail.timezoneValue",
];

for (const key of requiredKeys) {
  assert(getPathValue(ar, key) !== undefined, `Arabic translation is missing ${key}`);
  assert(getPathValue(en, key) !== undefined, `English translation is missing ${key}`);
}

assert(
  getPathValue(ar, "patientSessionsFlow.sessionDetail") === undefined,
  "Arabic translations should not keep the legacy sessionDetail namespace.",
);
assert(
  getPathValue(en, "patientSessionsFlow.sessionDetail") === undefined,
  "English translations should not keep the legacy sessionDetail namespace.",
);

const arJsonText = read("src/i18n/locales/ar.json");
assert(!arJsonText.includes("????"), "Arabic patient session translations must not contain ????");

process.stdout.write("Patient session contract guard passed.\n");

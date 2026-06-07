import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve("D:/Web/full-projects/fayed/fayed-mobile");
const files = [
  "src/features/messages/components/MessageThreadScreen.tsx",
  "src/i18n/locales/ar.json",
  "src/i18n/locales/en.json",
];

function read(file) {
  return readFileSync(resolve(root, file), "utf8");
}

const screen = read(files[0]);
const ar = JSON.parse(read(files[1]));
const en = JSON.parse(read(files[2]));

const requiredKeys = [
  "messages.thread.readOnlyTitle",
  "messages.thread.readOnlyReviewNote",
  "messages.thread.readOnlySendNote",
  "messages.thread.availabilityLoadingTitle",
  "messages.thread.availabilityLoadingNote",
];

function get(obj, path) {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
}

for (const key of requiredKeys) {
  if (get(ar, key) == null) {
    throw new Error(`Missing Arabic key: ${key}`);
  }
  if (get(en, key) == null) {
    throw new Error(`Missing English key: ${key}`);
  }
}

const requiredSnippets = [
  "chatAvailability?.canSend === true",
  "chatAvailability?.readOnly !== true",
  "showAvailabilityLoading",
  "showReadOnlyNotice",
  "showComposer",
];

for (const snippet of requiredSnippets) {
  if (!screen.includes(snippet)) {
    throw new Error(`Expected MessageThreadScreen to include: ${snippet}`);
  }
}

if (screen.includes("?? true")) {
  throw new Error("MessageThreadScreen must fail closed; found `?? true` fallback.");
}

console.log("Session chat composer contract validation passed.");

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve("D:/Web/full-projects/fayed/fayed-frontend-v1");
const files = [
  "src/features/chat/components/SessionChatPanel.tsx",
  "src/features/messages-shell/components/SessionLaneThread.tsx",
  "src/features/messages-shell/components/UnifiedMessagesLauncher.tsx",
  "messages/ar/sessions.json",
  "messages/en/sessions.json",
];

function read(file) {
  return readFileSync(resolve(root, file), "utf8");
}

const panel = read(files[0]);
const lane = read(files[1]);
const launcher = read(files[2]);
const ar = JSON.parse(read(files[3]));
const en = JSON.parse(read(files[4]));

const requiredSessionKeys = [
  "detail.chat.states.readOnly.heading",
  "detail.chat.states.readOnly.review",
  "detail.chat.states.readOnly.sendBlocked",
  "detail.chat.states.availabilityLoading.heading",
  "detail.chat.states.availabilityLoading.note",
];

function get(obj, path) {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
}

for (const key of requiredSessionKeys) {
  if (get(ar, key) == null) {
    throw new Error(`Missing Arabic key: ${key}`);
  }
  if (get(en, key) == null) {
    throw new Error(`Missing English key: ${key}`);
  }
}

const panelSnippets = [
  "showAvailabilityLoading",
  "showReadOnlyNotice",
  "showComposer",
  "sessionChatAvailability?.canSend === true",
  "sessionChatAvailability?.readOnly !== true",
];

for (const snippet of panelSnippets) {
  if (!panel.includes(snippet)) {
    throw new Error(`Expected SessionChatPanel to include: ${snippet}`);
  }
}

const laneSnippets = [
  "showAvailabilityLoading",
  "showReadOnlyNotice",
  "showComposer",
  "chatAvailability?.canSend === true",
  "chatAvailability?.readOnly !== true",
];

for (const snippet of laneSnippets) {
  if (!lane.includes(snippet)) {
    throw new Error(`Expected SessionLaneThread to include: ${snippet}`);
  }
}

const launcherSnippets = [
  "sessionReadOnlyHint",
  "sessionReadOnlyReview",
  "sessionReadOnlySendBlocked",
];

for (const snippet of launcherSnippets) {
  if (!launcher.includes(snippet)) {
    throw new Error(`Expected UnifiedMessagesLauncher to include: ${snippet}`);
  }
}

if (panel.includes("?? true") || lane.includes("?? true")) {
  throw new Error("Session chat composers must fail closed; found `?? true` fallback.");
}

console.log("Web session chat composer contract validation passed.");

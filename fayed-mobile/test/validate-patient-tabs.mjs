import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const layoutPath = path.join(root, "app/(patient)/_layout.tsx");
const layoutSource = fs.readFileSync(layoutPath, "utf8");

const visibleTabNames = [...layoutSource.matchAll(/<Tabs\.Screen\s+name="([^"]+)"(?![\s\S]*?options=\{\{\s*href:\s*null\s*\}\})/g)].map(
  (match) => match[1],
);

const hiddenRoutes = [
  "discovery/index",
  "discovery/filters",
  "discovery/[slug]",
  "assessments/index",
  "assessments/[slug]",
  "assessments/[slug]/questions",
  "assessments/submissions/[submissionId]",
  "articles/index",
  "articles/[slug]",
  "academy/index",
  "academy/[slug]",
  "academy/enroll/[slug]",
  "academy/enrollments/[id]",
  "academy/enrollments/[id]/payment-return",
  "package-purchases/index",
  "package-purchases/[id]",
  "package-purchases/create",
  "package-purchases/[id]/pay",
  "sessions/select-time",
  "sessions/confirm",
  "sessions/success",
  "sessions/[id]",
  "sessions/[id]/pay",
  "sessions/[id]/payment-return",
  "sessions/[id]/cancel-preview",
  "payments",
  "payments/transactions",
  "matching/intro",
  "matching/questions",
  "matching/results",
  "support/index",
  "support/new",
  "support/[id]",
  "messages/index",
  "messages/[id]",
  "profile-details",
  "profile-details/edit",
  "profile-preferences",
  "profile-notifications",
  "care-chat/index",
  "care-chat/new",
  "care-chat/[id]",
  "care-chat/request/[id]",
];

function fail(message) {
  throw new Error(message);
}

const visibleTabs = [...layoutSource.matchAll(/<Tabs\.Screen\s+name="([^"]+)"\s+options=\{(?!\{[^}]*href:\s*null)/g)].map(
  (match) => match[1],
);

const expectedVisibleTabs = ["index", "sessions", "notifications", "profile"];

if (visibleTabs.length !== expectedVisibleTabs.length) {
  fail(`Expected ${expectedVisibleTabs.length} visible patient tabs, found ${visibleTabs.length}: ${visibleTabs.join(", ")}`);
}

for (const tab of expectedVisibleTabs) {
  if (!visibleTabs.includes(tab)) {
    fail(`Missing expected visible patient tab: ${tab}`);
  }
}

for (const route of hiddenRoutes) {
  const pattern = new RegExp(`<Tabs\\.Screen\\s+name="${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s+options=\\{\\{\\s*href:\\s*null\\s*\\}\\}`, "m");
  if (!pattern.test(layoutSource)) {
    fail(`Missing hidden route in patient tabs layout: ${route}`);
  }
}

if (/academy\/enroll\/\[slug\].*?title=/.test(layoutSource)) {
  fail("academy/enroll/[slug] should not be a visible tab.");
}

console.log("[validate-patient-tabs] ok");

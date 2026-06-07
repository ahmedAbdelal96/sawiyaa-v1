import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve("D:/Web/full-projects/fayed/fayed-frontend-v1");

const practitionerWeb = readFileSync(
  `${root}/src/features/sessions/components/PractitionerSessionsPanel.tsx`,
  "utf8",
);
const practitionerMobile = readFileSync(
  "D:/Web/full-projects/fayed/fayed-mobile/app/(practitioner)/sessions/index.tsx",
  "utf8",
);

const failures = [];

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

assert(
  practitionerWeb.includes("presentationFilter:"),
  "Practitioner web should pass presentationFilter to the backend query.",
);
assert(
  !practitionerWeb.includes("filterSessionsByKey("),
  "Practitioner web should not client-filter sessions after loading pages.",
);
assert(
  !practitionerWeb.includes("matches.has(item.presentationStatus)"),
  "Practitioner web should not filter loaded pages by presentationStatus in memory.",
);

assert(
  practitionerMobile.includes("presentationFilter"),
  "Practitioner mobile should pass presentationFilter to the backend query.",
);
assert(
  !practitionerMobile.includes("filterSessionsByKey("),
  "Practitioner mobile should not client-filter sessions after loading pages.",
);

if (failures.length > 0) {
  console.error("Session filter scaling guard failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Session filter scaling guard passed.");

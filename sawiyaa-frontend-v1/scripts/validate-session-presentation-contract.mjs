import fs from "node:fs";
import path from "node:path";

const root = path.resolve("D:/Web/full-projects/sawiyaa/sawiyaa-frontend-v1");

const targets = [
  "src/features/sessions/components/PatientSessionsPanel.tsx",
  "src/features/sessions/components/PatientSessionDetailPanel.tsx",
  "src/features/sessions/components/PatientSessionNextStepsPanel.tsx",
  "src/features/sessions/components/PractitionerSessionsPanel.tsx",
  "src/features/sessions/components/PractitionerSessionDetailPanel.tsx",
  "src/features/sessions/components/SessionStatusBadge.tsx",
];

const forbiddenPatterns = [
  {
    id: "patient-list-runtime-hints",
    pattern: "list.runtimeHints.${session.status}",
  },
  {
    id: "patient-detail-runtime-status",
    pattern: "detail.runtime.status.${session.status}",
  },
  {
    id: "detail-raw-session-note",
    pattern: "detail.${session.status}.note",
  },
  {
    id: "practitioner-raw-status-filter",
    pattern: "SESSION_STATUS_FILTERS",
  },
  {
    id: "practitioner-raw-status-option-label",
    pattern: "tStatus(sessionStatus)",
  },
];

let failed = false;

for (const relativePath of targets) {
  const filePath = path.join(root, relativePath);
  const contents = fs.readFileSync(filePath, "utf8");

  for (const rule of forbiddenPatterns) {
    if (contents.includes(rule.pattern)) {
      failed = true;
      console.error(`[fail] ${relativePath} still contains ${rule.pattern}`);
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log("Session presentation contract guard passed.");

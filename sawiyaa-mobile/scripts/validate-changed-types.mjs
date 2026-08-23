import { spawnSync } from "node:child_process";
import process from "node:process";

const changedFiles = [
  "app/_layout.tsx",
  "app/(patient)/index.tsx",
  "app/(patient)/support/new.tsx",
  "app/(practitioner)/index.tsx",
  "app/(practitioner)/support/new.tsx",
  "src/components/RuntimeErrorBoundary.tsx",
  "src/components/auth/PatientGoogleSignInButton.tsx",
  "src/config/mobile-environment.ts",
  "src/features/messages/components/MessageThreadScreen.tsx",
  "src/features/messages/message-identity.ts",
  "src/features/settings/components/SettingsScreen.tsx",
  "src/lib/mobile-uuid.ts",
  "src/lib/route-params.ts",
];

// Existing debt recorded during the safety-gate rollout; changes in other lines still fail.
const knownBaselineErrors = new Set([
  "app/(practitioner)/index.tsx(351,17)",
  "app/(practitioner)/index.tsx(410,45)",
  "src/features/messages/components/MessageThreadScreen.tsx(194,54)",
]);

const result = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", ["tsc", "--noEmit"], {
  encoding: "utf8",
  shell: process.platform === "win32",
});
if (result.error) {
  console.error(`Could not run TypeScript validation: ${result.error.message}`);
  process.exit(1);
}
const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
const changedErrors = output
  .split(/\r?\n/)
  .filter((line) => changedFiles.some((file) => line.includes(file)))
  .filter((line) => ![...knownBaselineErrors].some((marker) => line.includes(marker)));

if (changedErrors.length > 0) {
  console.error("Changed-code TypeScript gate failed:");
  console.error(changedErrors.join("\n"));
  process.exit(1);
}

const totalErrors = output.split(/\r?\n/).filter((line) => /TS\d+/.test(line)).length;
console.log(`Changed-code TypeScript gate passed. Existing repository errors outside this phase: ${totalErrors}.`);

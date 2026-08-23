import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const apk = path.join(root, "android", "app", "build", "outputs", "apk", "release", "app-release.apk");
const flows = [
  ".maestro/flows/cold-launch.yaml",
  ".maestro/flows/patient-critical-navigation.yaml",
  ".maestro/flows/practitioner-critical-navigation.yaml",
  ".maestro/flows/settings-language-theme.yaml",
  ".maestro/flows/patient-browse-and-details.yaml",
  ".maestro/flows/public-discovery.yaml",
  ".maestro/flows/patient-session-details.yaml",
  ".maestro/flows/practitioner-session-details.yaml",
  ".maestro/flows/patient-messages.yaml",
  ".maestro/flows/practitioner-messages.yaml",
  ".maestro/flows/patient-message-thread.yaml",
  ".maestro/flows/practitioner-message-thread.yaml",
  ".maestro/flows/patient-booking-entry.yaml",
  ".maestro/flows/patient-profile-picker.yaml",
  ".maestro/flows/practitioner-document-picker.yaml",
  ".maestro/flows/patient-notifications.yaml",
  ".maestro/flows/practitioner-notifications.yaml",
  ".maestro/flows/practitioner-finance.yaml",
  ".maestro/flows/patient-payment-entry.yaml",
  ".maestro/flows/patient-academy.yaml",
];

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function capture(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", shell: process.platform === "win32" });
  if (result.error || result.status !== 0) return "";
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

if (!fs.existsSync(apk)) {
  console.error(`Release APK not found: ${apk}. Run npm run verify:android-release first.`);
  process.exit(1);
}

const devices = capture("adb", ["devices"])
  .split(/\r?\n/)
  .filter((line) => /\tdevice$/.test(line));
if (devices.length === 0) {
  console.error("Android device gate blocked: no ADB device in the 'device' state.");
  process.exit(1);
}
if (!capture("maestro", ["--version"])) {
  console.error("Android device gate blocked: Maestro is not installed or not on PATH.");
  process.exit(1);
}

run("adb", ["install", "-r", "-d", apk]);

for (const flow of flows) {
  run("npm", ["run", "android-crash:clear"]);
  run("maestro", ["test", flow]);
  run("npm", ["run", "android-crash:check"]);
}

console.log("Android device gate passed: all standalone APK Maestro flows and crash checks passed.");

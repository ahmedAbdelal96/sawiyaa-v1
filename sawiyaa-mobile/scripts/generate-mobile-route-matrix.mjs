import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appRoot = path.join(root, "app");
const nativeSignals = [
  ["expo-crypto", "UUID/crypto"],
  ["expo-document-picker", "document picker"],
  ["expo-image-picker", "image picker"],
  ["expo-notifications", "notifications"],
  ["expo-secure-store", "SecureStore"],
  ["WebBrowser", "browser/auth session"],
  ["Linking", "deep link"],
  ["socket.io", "socket"],
  ["AsyncStorage", "AsyncStorage"],
  ["Platform", "platform branch"],
];
const flowFiles = new Set(fs.existsSync(path.join(root, ".maestro", "flows"))
  ? fs.readdirSync(path.join(root, ".maestro", "flows"))
  : []);

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return files(absolute);
    return /\.(tsx|ts|jsx|js)$/.test(entry.name) ? [absolute] : [];
  });
}

function routeFor(relative) {
  const withoutExt = relative.replace(/\.(tsx|ts|jsx|js)$/, "");
  const segments = withoutExt.split("/").filter((segment) => !/^\([^)]*\)$/.test(segment));
  const normalized = segments
    .map((segment) => segment === "index" ? "" : segment.replace(/^\[\.\.\.(.+)\]$/, ":[...$1]").replace(/^\[(.+)\]$/, ":$1"))
    .filter(Boolean)
    .join("/");
  return `/${normalized}`.replace(/\/+/g, "/") || "/";
}

const rows = files(appRoot).sort().map((absolute) => {
  const relative = path.relative(appRoot, absolute).split(path.sep).join("/");
  const source = fs.readFileSync(absolute, "utf8");
  const group = relative.match(/^\(([^)]+)\)/)?.[1] ?? "shared";
  const role = group === "patient" ? "Patient" : group === "practitioner" ? "Practitioner" : group === "public" ? "Guest" : group === "auth" ? "Unauthenticated" : "Shared";
  const hasParams = relative.includes("[") ? "Yes" : "No";
  const dependencies = nativeSignals.filter(([signal]) => source.includes(signal)).map(([, label]) => label).join(", ") || "None detected";
  const route = routeFor(relative);
  const reachability = group === "auth" ? "Auth entry" :
    /\(patient\)\/(index|sessions|messages|notifications|profile|settings|support\/index)\.tsx$/.test(relative) ? "Patient tab/More" :
    /\(practitioner\)\/(index|sessions\/index|messages\/index|notifications|more|settings|support\/index)\.tsx$/.test(relative) ? "Practitioner tab/More" :
    group === "public" ? "Public navigation" : hasParams === "Yes" ? "Nested/deep link" : "Nested flow";
  const testFlow = /support\/new\.tsx$/.test(relative) ? `${role.toLowerCase()}-critical-navigation.yaml` :
    /settings\.tsx$/.test(relative) ? "settings-language-theme.yaml" :
    /\(patient\)\/discovery\/\[slug\]/.test(relative) ? "patient-browse-and-details.yaml" :
    /\(public\)\/discovery\/\[slug\]/.test(relative) ? "public-discovery.yaml" :
    /\(patient\)\/sessions\/\[id\](?!\/)/.test(relative) ? "patient-session-details.yaml" :
    /\(practitioner\)\/sessions\/\[id\]/.test(relative) ? "practitioner-session-details.yaml" :
    /\(patient\)\/messages\/\[id\]\.tsx$/.test(relative) ? "patient-message-thread.yaml" :
    /\(practitioner\)\/messages\/\[id\]\.tsx$/.test(relative) ? "practitioner-message-thread.yaml" :
    /\(patient\)\/messages\/index\.tsx$/.test(relative) ? "patient-messages.yaml" :
    /\(practitioner\)\/messages\/index\.tsx$/.test(relative) ? "practitioner-messages.yaml" :
    /\(patient\)\/profile-details/.test(relative) ? "patient-profile-picker.yaml" :
    /\(practitioner\)\/onboarding/.test(relative) ? "practitioner-document-picker.yaml" :
    /\(patient\)\/notifications\.tsx$/.test(relative) ? "patient-notifications.yaml" :
    /\(practitioner\)\/notifications\.tsx$/.test(relative) ? "practitioner-notifications.yaml" :
    /\(practitioner\)\/finance\/wallet\.tsx$/.test(relative) ? "practitioner-finance.yaml" :
    /\(patient\)\/payments\.tsx$/.test(relative) ? "patient-payment-entry.yaml" :
    /\(patient\)\/academy\/index\.tsx$/.test(relative) ? "patient-academy.yaml" :
    /\(patient\)\/sessions\/(select-time|confirm|success)\.tsx$/.test(relative) ? "patient-booking-entry.yaml" : "—";
  const hasFlow = testFlow !== "—" && flowFiles.has(testFlow);
  const highRisk = /crypto|SecureStore|picker|notification|socket|payment|FormData|browser\/auth|deep link|timezone|platform branch|sessions\/(select-time|confirm|success)/i.test(`${dependencies} ${relative}`);
  const criticalRisk = /support\/new|messages\/\[|payment-return|pay\.tsx|application-status|onboarding\.tsx/.test(relative);
  const risk = criticalRisk ? "CRITICAL" : highRisk || hasParams === "Yes" ? "HIGH" : dependencies !== "None detected" ? "MEDIUM" : "LOW";
  const status = hasFlow ? "AUTOMATED" : risk === "HIGH" || risk === "CRITICAL" ? "DATA-BLOCKED" : "MANUAL-BLOCKED";
  const manualDependency = hasFlow ? "Standalone APK + ADB + Maestro; authenticated routes require deterministic test account/data" : risk === "HIGH" || risk === "CRITICAL" ? "No deterministic fixture/flow currently available; install Release APK, navigate to route with valid params, expect controlled screen, then run npm run android-crash:check" : "Standalone APK/manual navigation not yet scripted";
  return `| \`${route}\` | ${role.toUpperCase()} | ${reachability} | \`${relative}\` | ${hasParams} | ${dependencies} | ${risk} | ${status} | ${testFlow} | ${manualDependency} |`;
});

const output = `# Mobile production route matrix\n\nGenerated from the Expo Router production source tree. HIGH/CRITICAL rows have explicit coverage status: AUTOMATED, DATA-BLOCKED, or MANUAL-BLOCKED.\n\n| Route | Role | Reachability | Entry path | Requires params? | Native/runtime dependencies | Risk level | Coverage status | Test flow | Manual/data dependency and procedure |\n|---|---|---|---|---|---|---|---|---|---|\n${rows.join("\n")}\n`;
const outputPath = path.join(root, "docs", "mobile-route-matrix.md");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output, "utf8");
console.log(`Wrote ${rows.length} route rows to ${path.relative(root, outputPath)}.`);

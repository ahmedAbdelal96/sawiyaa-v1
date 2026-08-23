import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const localeDir = path.join(root, "src", "i18n", "locales");
const locales = {
  ar: JSON.parse(fs.readFileSync(path.join(localeDir, "ar.json"), "utf8")),
  en: JSON.parse(fs.readFileSync(path.join(localeDir, "en.json"), "utf8")),
};

const productionRoots = ["app", "src"];
const ignoredDirs = new Set(["node_modules", ".expo", "dist", "android", "ios"]);
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(absolute);
  }
}

for (const relative of productionRoots) walk(path.join(root, relative));

function valueAt(object, key) {
  return key.split(".").reduce((current, part) => current?.[part], object);
}

function flatten(object, prefix = "") {
  const result = [];
  for (const [key, value] of Object.entries(object)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) result.push(...flatten(value, full));
    else result.push(full);
  }
  return result;
}

const arKeys = new Set(flatten(locales.ar));
const enKeys = new Set(flatten(locales.en));
const errors = [];

for (const key of [...arKeys].sort()) if (!enKeys.has(key)) errors.push(`EN missing locale key: ${key}`);
for (const key of [...enKeys].sort()) if (!arKeys.has(key)) errors.push(`AR missing locale key: ${key}`);
for (const language of ["ar", "en"]) {
  for (const key of flatten(locales[language])) {
    const value = valueAt(locales[language], key);
    if (typeof value !== "string" || !value.trim()) errors.push(`${language.toUpperCase()} invalid/empty locale value: ${key}`);
  }
}

const used = new Set();
const dynamicFamilies = new Map([
  ["practitioner.presentationStatus.", ["DRAFT", "PENDING_PAYMENT", "PENDING_PRACTITIONER_CONFIRMATION", "UPCOMING", "READY_TO_JOIN", "IN_PROGRESS", "AWAITING_COMPLETION_CONFIRMATION", "COMPLETED", "CANCELLED", "PATIENT_NO_SHOW", "PRACTITIONER_NO_SHOW", "BOTH_NO_SHOW", "EXPIRED"]],
  ["patientSessionsFlow.presentationStatus.", ["UPCOMING", "READY_TO_JOIN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "AWAITING_COMPLETION_CONFIRMATION", "EXPIRED", "PATIENT_NO_SHOW", "PRACTITIONER_NO_SHOW", "BOTH_NO_SHOW"]],
  ["packagePurchases.presentationStatuses.", ["UPCOMING", "READY_TO_JOIN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "AWAITING_COMPLETION_CONFIRMATION", "EXPIRED", "PATIENT_NO_SHOW", "PRACTITIONER_NO_SHOW", "BOTH_NO_SHOW", "UNKNOWN"]],
]);

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(/\bt\(\s*["']([^"']+)["']/g)) used.add(match[1]);
  for (const match of source.matchAll(/i18n\.t\(\s*["']([^"']+)["']/g)) used.add(match[1]);
}
for (const [prefix, values] of dynamicFamilies) for (const value of values) used.add(`${prefix}${value}`);

for (const key of [...used].sort()) {
  if (key.includes("{{") || key.endsWith(".")) continue;
  if (!arKeys.has(key)) errors.push(`AR missing used translation key: ${key}`);
  if (!enKeys.has(key)) errors.push(`EN missing used translation key: ${key}`);
}

if (errors.length) {
  console.error(`Mobile i18n validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Mobile i18n validation passed: ${arKeys.size} locale keys, ${used.size} statically used/dynamic keys.`);

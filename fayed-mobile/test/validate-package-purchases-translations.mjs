import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const arPath = path.join(root, "src/i18n/locales/ar.json");
const enPath = path.join(root, "src/i18n/locales/en.json");

const packagePurchaseFiles = [
  "src/features/patient/package-plans/components/PackagePurchasesScreen.tsx",
  "src/features/patient/package-plans/components/PackagePurchaseDetailScreen.tsx",
  "src/features/patient/package-plans/components/PackagePurchaseCreateScreen.tsx",
  "src/features/patient/package-plans/components/PackagePurchasePayScreen.tsx",
  "src/features/patient/package-plans/lib/package-purchase-display.ts",
];
const packagePurchaseDisplayPath = path.join(
  root,
  "src/features/patient/package-plans/lib/package-purchase-display.ts",
);
const packagePurchaseDetailPath = path.join(
  root,
  "src/features/patient/package-plans/components/PackagePurchaseDetailScreen.tsx",
);

const pluralSuffixes = ["zero", "one", "two", "few", "many", "other"];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getNodeByPath(obj, segments) {
  let current = obj;
  for (const segment of segments) {
    if (!current || typeof current !== "object" || !(segment in current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function hasTranslationPath(obj, pathSegments) {
  const exact = getNodeByPath(obj, pathSegments);
  if (typeof exact === "string") {
    return true;
  }

  if (pathSegments.length === 0) {
    return false;
  }

  const parent = getNodeByPath(obj, pathSegments.slice(0, -1));
  if (!parent || typeof parent !== "object") {
    return false;
  }

  const leaf = pathSegments[pathSegments.length - 1];
  return pluralSuffixes.some((suffix) => typeof parent[`${leaf}_${suffix}`] === "string");
}

function collectLeafValues(node, values = []) {
  if (!node || typeof node !== "object") {
    return values;
  }

  for (const value of Object.values(node)) {
    if (typeof value === "string") {
      values.push(value);
      continue;
    }

    collectLeafValues(value, values);
  }

  return values;
}

function normalizeForEnglishCheck(value) {
  return value.replace(/\{\{[^}]+\}\}/g, "").replace(/\d+/g, "");
}

function collectPackagePurchaseKeys() {
  const keys = new Set();
  const keyPattern = /packagePurchases\.[A-Za-z0-9_${}.:-]+/g;

  for (const relativeFile of packagePurchaseFiles) {
    const filePath = path.join(root, relativeFile);
    const text = fs.readFileSync(filePath, "utf8");
    for (const match of text.matchAll(keyPattern)) {
      let key = match[0];
      if (key.includes("${label}")) {
        for (const label of ["morning", "afternoon", "evening"]) {
          keys.add(key.replace("${label}", label));
        }
        continue;
      }

      keys.add(key);
    }
  }

  return [...keys].sort();
}

function fail(message) {
  throw new Error(message);
}

const ar = readJson(arPath);
const en = readJson(enPath);
const arPackage = ar.packagePurchases;
const enPackage = en.packagePurchases;

if (!arPackage || !enPackage) {
  fail("Missing packagePurchases root in ar/en translations.");
}

const expectedPresentationStatuses = [
  "UPCOMING",
  "JOINABLE",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "ENDED",
  "UNAVAILABLE",
  "UNKNOWN",
];

for (const key of expectedPresentationStatuses) {
  if (typeof arPackage.presentationStatuses?.[key] !== "string") {
    fail(`Missing ar packagePurchases.presentationStatuses.${key}`);
  }
  if (typeof enPackage.presentationStatuses?.[key] !== "string") {
    fail(`Missing en packagePurchases.presentationStatuses.${key}`);
  }
}

if (typeof arPackage.detail?.joinAvailableAt !== "string") {
  fail("Missing ar packagePurchases.detail.joinAvailableAt");
}
if (typeof enPackage.detail?.joinAvailableAt !== "string") {
  fail("Missing en packagePurchases.detail.joinAvailableAt");
}

const usedKeys = collectPackagePurchaseKeys();
const missing = [];

for (const key of usedKeys) {
  const segments = key.split(".");
  if (!hasTranslationPath(ar, segments)) {
    missing.push(`ar:${key}`);
  }
  if (!hasTranslationPath(en, segments)) {
    missing.push(`en:${key}`);
  }
}

if (missing.length > 0) {
  fail(`Missing package purchase translation keys: ${missing.join(", ")}`);
}

const arValues = collectLeafValues(arPackage);
const enValues = collectLeafValues(enPackage);
const englishLeak = arValues.find((value) => {
  const normalized = normalizeForEnglishCheck(value);
  return /[A-Za-z]/.test(normalized);
});

if (englishLeak) {
  fail(`Arabic packagePurchases translation still contains English-looking text: ${englishLeak}`);
}

const rawQuestionMarks = [...arValues, ...enValues].find((value) =>
  value.includes("????"),
);

if (rawQuestionMarks) {
  fail(`Found raw question marks in package purchase translations: ${rawQuestionMarks}`);
}

const bannedVisiblePhrases = [
  /linked sessions/i,
  /payment window/i,
  /mismatch/i,
  /Â·/,
  /Ã‚Â·/,
];

const bannedVisiblePhrase = [...arValues, ...enValues].find((value) =>
  bannedVisiblePhrases.some((pattern) => pattern.test(value)),
);

if (bannedVisiblePhrase) {
  fail(`Found an internal package purchase phrase in visible copy: ${bannedVisiblePhrase}`);
}

const keyShapeMismatch = JSON.stringify(Object.keys(arPackage).sort()) !== JSON.stringify(Object.keys(enPackage).sort());
if (keyShapeMismatch) {
  fail("packagePurchases top-level key shape differs between ar and en.");
}

const displaySource = fs.readFileSync(packagePurchaseDisplayPath, "utf8");
if (!displaySource.includes("console.warn") || !displaySource.includes("__DEV__")) {
  fail("Missing dev-only package purchase contract mismatch warning helper.");
}

const detailSource = fs.readFileSync(packagePurchaseDetailPath, "utf8");
const forbiddenDetailPatterns = [
  "getPackagePurchaseSessionStatusTranslationKey(",
  "getPackagePurchaseSessionStatusTone(",
  "session.status",
];

for (const pattern of forbiddenDetailPatterns) {
  if (detailSource.includes(pattern)) {
    fail(`Found raw session status usage in package purchase detail screen: ${pattern}`);
  }
}

if (!detailSource.includes("presentationStatus") || !detailSource.includes("joinAvailability")) {
  fail("Package purchase detail screen is not consuming the presentation contract.");
}

console.log(`[validate-package-purchases-translations] ok, ${usedKeys.length} keys checked.`);

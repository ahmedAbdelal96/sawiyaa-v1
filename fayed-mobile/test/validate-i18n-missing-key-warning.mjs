import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const i18nIndex = read("src/i18n/index.ts");
const warningHelper = read("src/i18n/missing-key-warning.ts");
const profileScreen = read("app/(patient)/profile.tsx");
const profileDetails = read("app/(patient)/profile-details.tsx");
const profileDetailsEdit = read("app/(patient)/profile-details/edit.tsx");
const arMessages = JSON.parse(read("src/i18n/locales/ar.json"));
const enMessages = JSON.parse(read("src/i18n/locales/en.json"));

assert(
  i18nIndex.includes("saveMissing: process.env.NODE_ENV !== \"production\""),
  "Mobile i18n init should enable saveMissing only in development.",
);
assert(
  i18nIndex.includes("missingKeyHandler("),
  "Mobile i18n init should register a missingKeyHandler.",
);
assert(
  i18nIndex.includes("const originalTranslate = i18n.t.bind(i18n);"),
  "Mobile i18n should patch t() centrally to catch current-locale misses.",
);
assert(
  i18nIndex.includes("existsInCurrentLanguage"),
  "Mobile i18n should check the current locale before fallback kicks in.",
);
assert(
  i18nIndex.includes("hasPluralizedTranslation"),
  "Mobile i18n should avoid false missing warnings for pluralized keys.",
);
assert(
  warningHelper.includes("process.env.NODE_ENV === \"production\""),
  "Mobile missing-key logger should be disabled in production.",
);
assert(
  warningHelper.includes("console.warn"),
  "Mobile missing-key logger should warn in development.",
);
assert(
  warningHelper.includes("globalThis"),
  "Mobile missing-key logger should dedupe warnings across the session.",
);
assert(
  warningHelper.includes("[Fayed i18n missing] lang="),
  "Mobile missing-key logger should emit a searchable lang-based warning label.",
);
assert(
  warningHelper.includes("fallback="),
  "Mobile missing-key logger should mention fallback language when available.",
);

const requiredKeys = [
  "retry",
  "home.topRated.reviewsCount_zero",
  "home.topRated.reviewsCount_one",
  "home.topRated.reviewsCount_two",
  "home.topRated.reviewsCount_few",
  "home.topRated.reviewsCount_many",
  "home.topRated.reviewsCount_other",
];

const getPath = (source, dottedPath) =>
  dottedPath.split(".").reduce((value, segment) => (value ? value[segment] : undefined), source);

for (const key of requiredKeys) {
  assert(getPath(arMessages, key) !== undefined, `Arabic locale is missing required key: ${key}`);
  assert(getPath(enMessages, key) !== undefined, `English locale is missing required key: ${key}`);
}

assert(
  getPath(arMessages, "home.topRated.reviewsCount") === undefined &&
    getPath(enMessages, "home.topRated.reviewsCount") === undefined,
  "Pluralized reviewsCount should be exposed only through plural suffix keys.",
);

const forbiddenPatterns = [
  't("profileScreen.hub.rows.articles.title", "Articles")',
  't("profileScreen.hub.rows.articles.subtitle", "Browse health content and guidance")',
  't("profileScreen.hub.rows.messages.title", "Messages")',
  't("profileScreen.hub.rows.messages.subtitle", "Open conversations with your practitioner")',
  "profileScreen.details.genderOptions.MALE",
  "profileScreen.details.genderOptions.FEMALE",
  "????",
  't("retry", "Retry")',
];

for (const pattern of forbiddenPatterns) {
  assert(!profileScreen.includes(pattern), `Forbidden fallback still exists in profile.tsx: ${pattern}`);
  assert(!profileDetails.includes(pattern), `Forbidden fallback still exists in profile-details.tsx: ${pattern}`);
  assert(!profileDetailsEdit.includes(pattern), `Forbidden fallback still exists in profile-details/edit.tsx: ${pattern}`);
}

console.log("Mobile i18n missing-key warning setup passed.");

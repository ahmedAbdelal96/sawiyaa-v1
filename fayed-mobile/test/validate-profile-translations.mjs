import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function getPath(obj, dottedPath) {
  return dottedPath.split(".").reduce((acc, key) => {
    if (acc && Object.prototype.hasOwnProperty.call(acc, key)) {
      return acc[key];
    }
    return undefined;
  }, obj);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const ar = readJson("src/i18n/locales/ar.json");
const en = readJson("src/i18n/locales/en.json");

const requiredKeys = [
  "profileScreen.moreTitle",
  "profileScreen.moreSections.account",
  "profileScreen.moreSections.accountSubtitle",
  "profileScreen.moreSections.contentSupport",
  "profileScreen.moreSections.contentSupportSubtitle",
  "profileScreen.moreSections.learningPurchases",
  "profileScreen.moreSections.learningPurchasesSubtitle",
  "profileScreen.moreSections.accountLogoutSubtitle",
  "profileScreen.more.rows.academy.title",
  "profileScreen.more.rows.academy.subtitle",
  "profileScreen.more.rows.packages.title",
  "profileScreen.more.rows.packages.subtitle",
  "profileScreen.hub.rows.articles.title",
  "profileScreen.hub.rows.articles.subtitle",
  "profileScreen.hub.rows.messages.title",
  "profileScreen.hub.rows.messages.subtitle",
  "profileScreen.details.genderOptions.male",
  "profileScreen.details.genderOptions.female",
  "profileScreen.details.genderOptions.other",
  "profileScreen.details.genderOptions.prefer_not_to_say",
  "profileScreen.details.genderOptions.unspecified",
];

for (const key of requiredKeys) {
  const arValue = getPath(ar, key);
  const enValue = getPath(en, key);
  assert(
    typeof arValue === "string" && arValue.trim().length > 0,
    `Missing Arabic translation key: ${key}`,
  );
  assert(
    typeof enValue === "string" && enValue.trim().length > 0,
    `Missing English translation key: ${key}`,
  );
}

const profileSourceFiles = [
  "app/(patient)/profile.tsx",
  "app/(patient)/profile-details.tsx",
  "app/(patient)/profile-details/edit.tsx",
  "src/features/patient/profile/components/GenderSelectModal.tsx",
];

const forbiddenPatterns = [
  "t(\"profileScreen.hub.rows.articles.title\", \"Articles\")",
  "t(\"profileScreen.hub.rows.articles.subtitle\", \"Browse health content and guidance\")",
  "t(\"profileScreen.hub.rows.messages.title\", \"Messages\")",
  "t(\"profileScreen.hub.rows.messages.subtitle\", \"Open conversations with your practitioner\")",
  "profileScreen.details.genderOptions.MALE",
  "profileScreen.details.genderOptions.FEMALE",
  "profileScreen.details.genderOptions.${profile.gender}",
  "profileScreen.details.genderOptions.${profile.gender?.trim()}",
  "????",
];

for (const relativePath of profileSourceFiles) {
  const fileContents = fs.readFileSync(path.join(root, relativePath), "utf8");
  for (const pattern of forbiddenPatterns) {
    assert(
      !fileContents.includes(pattern),
      `Forbidden profile fallback found in ${relativePath}: ${pattern}`,
    );
  }
}

assert(
  !JSON.stringify(ar).includes("profileScreen.sessionDetail"),
  "Arabic locale still contains old profileScreen.sessionDetail namespace",
);
assert(
  !JSON.stringify(en).includes("profileScreen.sessionDetail"),
  "English locale still contains old profileScreen.sessionDetail namespace",
);

console.log("Profile translation contract passed.");

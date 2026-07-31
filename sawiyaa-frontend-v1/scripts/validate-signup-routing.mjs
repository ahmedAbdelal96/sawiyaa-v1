import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const patientPage = read("src/app/[locale]/(auth)/signup/patient/page.tsx");
const practitionerPage = read(
  "src/app/[locale]/(auth)/signup/practitioner/page.tsx",
);
const legacyPage = read("src/app/[locale]/(auth)/signup/page.tsx");
const form = read("src/components/auth/SignUpForm.tsx");
const patientForm = read("src/components/auth/PatientSignUpForm.tsx");
const localeNavigation = read("src/i18n/locale-navigation.ts");
const authHeader = read("src/app/[locale]/(auth)/_components/AuthAppHeader.tsx");
const publicLanguageToggle = read("src/components/public/LanguageToggle.tsx");

assert.match(patientPage, /<PatientSignUpForm \/>/);
assert.match(practitionerPage, /<SignUpForm accountType="practitioner" \/>/);

// Patient flow never requests specialties or categories
assert.doesNotMatch(patientForm, /specialt/i);
assert.doesNotMatch(patientForm, /categor/i);

// Practitioner flow retains specialties
assert.match(form, /specialt/i);

assert.match(legacyPage, /signup\/\$\{mode\}/);
assert.match(legacyPage, /entryCards\.patient\.secondaryCta/);
assert.match(legacyPage, /entryCards\.practitioner\.secondaryCta/);
assert.match(form, /type SignUpFormProps = \{\s*accountType: SignUpMode;/s);
assert.doesNotMatch(form, /useSearchParams\(\).*mode/);
assert.match(localeNavigation, /preservePathAndQuery/);
assert.match(authHeader, /preservePathAndQuery\(pathname, searchParams\)/);
assert.match(publicLanguageToggle, /preservePathAndQuery\(pathname, searchParams\)/);

const productionSourceFiles = [
  "src/components/auth/AuthSplitCard.tsx",
  "src/components/auth/SignInForm.tsx",
  "src/components/public/PublicNavbar.tsx",
  "src/components/public/PublicFooter.tsx",
  "src/features/articles-public/components/PublicArticleDetailScreen.tsx",
  "src/features/practitioner-profile/components/ProfileTrustSection.tsx",
  "src/features/home/components/PractitionerCTASection.tsx",
  "src/features/home/components/GuidedEntrySection.tsx",
];
for (const relativePath of productionSourceFiles) {
  assert.doesNotMatch(read(relativePath), /\/(signup|signin)\?mode=/, relativePath);
}

function sourceFiles(directory) {
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(relative);
    return /\.(ts|tsx)$/.test(entry.name) ? [relative] : [];
  });
}

for (const relativePath of sourceFiles("src")) {
  assert.doesNotMatch(read(relativePath), /\/(signup|signin)\?mode=/, relativePath);
}

const preservePathAndQuery = (pathname, searchParams) => {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
};
assert.equal(
  preservePathAndQuery("/signup/practitioner", new URLSearchParams()),
  "/signup/practitioner",
);
assert.equal(
  preservePathAndQuery(
    "/signup/patient",
    new URLSearchParams("callbackUrl=%2Fpatient%2Fdashboard"),
  ),
  "/signup/patient?callbackUrl=%2Fpatient%2Fdashboard",
);

console.log("signup routing validation passed");

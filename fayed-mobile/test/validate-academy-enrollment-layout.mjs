import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());

const files = {
  input: "src/components/ui/Input.tsx",
  browse: "src/features/patient/academy/components/AcademyBrowseScreen.tsx",
  detail: "src/features/patient/academy/components/AcademyDetailScreen.tsx",
  create: "src/features/patient/academy/components/AcademyEnrollmentCreateScreen.tsx",
};

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function fail(message) {
  throw new Error(message);
}

const inputSource = read(files.input);
const browseSource = read(files.browse);
const detailSource = read(files.detail);
const createSource = read(files.create);

for (const [name, source] of Object.entries({
  input: inputSource,
  browse: browseSource,
  detail: detailSource,
  create: createSource,
})) {
  if (source.includes('textAlign: "left"') || source.includes('textAlign: "right"')) {
    fail(`Found hardcoded textAlign in academy-related layout source: ${name}`);
  }
}

if (!inputSource.includes("getAppDirection") || !inputSource.includes("writingDirection")) {
  fail("Shared Input must resolve direction from getAppDirection and set writingDirection.");
}

if (inputSource.includes("I18nManager")) {
  fail("Shared Input should not depend on I18nManager for direction anymore.");
}

for (const [name, source] of Object.entries({
  browse: browseSource,
  detail: detailSource,
  create: createSource,
})) {
  if (!source.includes("getAppDirection")) {
    fail(`Academy screen missing getAppDirection helper: ${name}`);
  }
  if (source.includes("I18nManager.isRTL")) {
    fail(`Academy screen should not use I18nManager.isRTL directly: ${name}`);
  }
}

console.log("[validate-academy-enrollment-layout] ok");

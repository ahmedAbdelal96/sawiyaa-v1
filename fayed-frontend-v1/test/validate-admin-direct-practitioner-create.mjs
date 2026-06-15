import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const componentPath = path.join(
  root,
  "src/features/admin/practitioner-applications/components/AdminPractitionerCreatePage.tsx"
);
const apiPath = path.join(
  root,
  "src/features/admin/practitioner-applications/api/practitioner-applications.api.ts"
);
const enPath = path.join(root, "messages/en/admin-area.json");
const arPath = path.join(root, "messages/ar/admin-area.json");

const componentSource = fs.readFileSync(componentPath, "utf8");
const apiSource = fs.readFileSync(apiPath, "utf8");
const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
const ar = JSON.parse(fs.readFileSync(arPath, "utf8"));

function fail(message) {
  throw new Error(message);
}

if (!componentSource.includes("useUploadAdminDirectPractitionerCredentialFile")) {
  fail("Admin direct-create page must use the dedicated credential upload mutation.");
}

if (!componentSource.includes('const STEP_ORDER: StepId[]')) {
  fail("Admin direct-create page must keep the wizard step structure.");
}

for (const forbidden of [
  "Select an option",
  "Select option",
  "Account & profile",
  "Languages",
  "Payout method",
  "Credential file URL",
]) {
  if (componentSource.includes(forbidden)) {
    fail(`Admin direct-create page must not hardcode legacy English copy: ${forbidden}`);
  }
}

if (!apiSource.includes("/admin/practitioner-applications/direct-create/credentials/upload")) {
  fail("Admin direct-create API must target the dedicated credential upload endpoint.");
}

if (JSON.stringify(ar.applications.directCreate).includes("????")) {
  fail("Arabic direct-create translations still contain question-mark corruption.");
}

for (const locale of [en, ar]) {
  const directCreate = locale.applications?.directCreate;
  if (!directCreate) {
    fail("directCreate translations are missing.");
  }

  for (const key of [
    "steps.account.title",
    "fields.practitionerGender",
    "fields.payoutMethodType",
    "upload.submit",
    "success.title",
    "credentialType.NATIONAL_ID_FRONT",
    "credentialType.NATIONAL_ID_BACK",
  ]) {
    const value = key.split(".").reduce((current, segment) => current?.[segment], directCreate);
    if (typeof value !== "string" || value.trim().length === 0) {
      fail(`Missing directCreate translation key: ${key}`);
    }
  }
}

console.log("[validate-admin-direct-practitioner-create] ok");

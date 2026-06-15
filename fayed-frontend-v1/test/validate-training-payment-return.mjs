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

function flattenObject(obj, prefix = "", out = new Map()) {
  if (Array.isArray(obj)) {
    obj.forEach((value, index) => {
      const key = prefix ? `${prefix}.${index}` : `${index}`;
      if (value && typeof value === "object") {
        flattenObject(value, key, out);
      } else {
        out.set(key, value);
      }
    });
    return out;
  }

  for (const [key, value] of Object.entries(obj)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") {
      flattenObject(value, nextKey, out);
    } else {
      out.set(nextKey, value);
    }
  }

  return out;
}

const payPanel = read("src/features/training/components/TrainingEnrollmentPayPanel.tsx");
const returnPanel = read("src/features/training/components/TrainingEnrollmentPaymentReturnPanel.tsx");
const returnPage = read("src/app/[locale]/(patient)/patient/training/[id]/payment-return/page.tsx");
const enTraining = read("messages/en/training.json");
const arTraining = read("messages/ar/training.json");
const enTrainingJson = JSON.parse(enTraining);
const arTrainingJson = JSON.parse(arTraining);
const enTrainingKeys = flattenObject(enTrainingJson);
const arTrainingKeys = flattenObject(arTrainingJson);

assert(
  payPanel.includes("buildTrainingPaymentRedirectUrl"),
  "Training pay panel should build a backend redirect URL.",
);
assert(
  payPanel.includes("buildTrainingPaymentReturnUrl"),
  "Training pay panel should build a same-surface payment return URL.",
);
assert(
  payPanel.includes("window.location.assign"),
  "Training pay panel should navigate with a direct same-tab location change.",
);
assert(
  !payPanel.includes("window.open("),
  "Training pay panel must not use popup windows for checkout.",
);
assert(
  !payPanel.includes('target="_blank"'),
  "Training pay panel must not open checkout in a new tab.",
);
assert(
  !payPanel.includes("NEXT_PUBLIC_APP_URL"),
  "Training pay panel must not rely on the static NEXT_PUBLIC_APP_URL fallback.",
);

assert(
  returnPanel.includes("usePatientTrainingEnrollment"),
  "Training payment return panel should refetch enrollment status from the backend.",
);
assert(
  returnPanel.includes("POLL_INTERVAL_MS"),
  "Training payment return panel should poll briefly while waiting for confirmation.",
);
assert(
  returnPanel.includes("patient.return.success.action"),
  "Training payment return panel should have a backend-confirmed success CTA.",
);

assert(
  returnPage.includes("TrainingEnrollmentPaymentReturnPanel"),
  "Training payment return route should render the return panel.",
);
assert(
  returnPage.includes("redirect_status"),
  "Training payment return route should normalize provider redirect status.",
);

for (const file of [enTraining, arTraining]) {
  assert(file.includes('"patientPaymentReturnTitle"'), "Training translations should include the payment return title.");
}

for (const key of [
  "patient.return.success.action",
  "patient.return.pending.action",
  "patient.return.verifying.heading",
]) {
  assert(enTrainingKeys.has(key), `Training English translations should include ${key}.`);
  assert(arTrainingKeys.has(key), `Training Arabic translations should include ${key}.`);
}

assert(
  !arTraining.includes("أكملي"),
  "Training Arabic payment copy must stay neutral and avoid gendered forms.",
);

console.log("[validate-training-payment-return] ok");

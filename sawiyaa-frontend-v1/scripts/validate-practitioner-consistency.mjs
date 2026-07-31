import { readFile } from "node:fs/promises";

const wizardPath = "src/features/practitioners/components/PractitionerApplicationWizardThreeStep.tsx";
const source = await readFile(wizardPath, "utf8");
const helperText = "You can choose multiple sub-specialties from the dropdown.";
const englishMessages = await readFile("messages/en/practitioner-area.json", "utf8");
const arabicMessages = await readFile("messages/ar/practitioner-area.json", "utf8");

if ((source.match(new RegExp(helperText, "g")) ?? []).length !== 1) {
  throw new Error("Expected the sub-specialty helper text to render exactly once.");
}

if (!source.includes("if (!specialtyCatalogLoaded) return rawActiveSpecialtyIds;")) {
  throw new Error("Expected specialty hydration to preserve IDs while the catalog loads.");
}

if (!source.includes("setSelectedSpecialtyIds([]);")) {
  throw new Error("Expected an explicit user category change to clear sub-specialties.");
}

if (!source.includes('role="status" aria-live="polite"')) {
  throw new Error("Expected the issue summary to expose live status semantics.");
}

if (!source.includes("disabled={!canMoveNext}")) {
  throw new Error("Expected Next to be disabled for blocking requirements.");
}

for (const messages of [englishMessages, arabicMessages]) {
  if (messages.includes('"stepIssuesTitle": "Missing"') || messages.includes('"stepIssuesTitle": "مفقود"')) {
    throw new Error("Expected the issue panel heading to identify the completion action.");
  }
}

console.log("practitioner-consistency-source-guard: passed");

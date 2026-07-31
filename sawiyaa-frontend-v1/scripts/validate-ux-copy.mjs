#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

// Resolve paths relative to frontend root
const FE_MESSAGES_DIR = path.join(root, "messages");
const BE_CATALOGS_DIR = path.join(root, "..", "sawiyaa-backend-v1", "src", "common", "i18n", "catalogs");

const ROBOTIC_AR = [
  { phrase: "سيتم حفظ", rule: "Avoid robotic Arabic: سيتم حفظ" },
  { phrase: "سيقوم النظام", rule: "Avoid robotic Arabic: سيقوم النظام" },
  { phrase: "بصيغته المحلية", rule: "Avoid robotic Arabic: بصيغته المحلية" },
  { phrase: "تلقائيًا بواسطة", rule: "Avoid robotic Arabic: تلقائيًا بواسطة" },
  { phrase: "يرجى العلم", rule: "Avoid robotic Arabic: يرجى العلم" }
];

const ROBOTIC_EN = [
  { phrase: "the system will", rule: "Avoid verbose English: the system will" },
  { phrase: "will be stored automatically", rule: "Avoid verbose English: will be stored automatically" },
  { phrase: "in your usual local format", rule: "Avoid verbose English: in your usual local format" },
  { phrase: "please be informed", rule: "Avoid verbose English: please be informed" }
];

// Allowlist for legally or functionally required texts
// Format: { "filename": { "key_or_line": "Reason for exclusion" } }
const ALLOWLIST = {
  // Example:
  // "en/refund-policies.json": {
  //   "policy.terms": "Legally required refund terms statement"
  // }
};

function flattenObject(obj, prefix = "") {
  const out = new Map();
  for (const [key, value] of Object.entries(obj)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = flattenObject(value, nextKey);
      for (const [nKey, nValue] of nested.entries()) {
        out.set(nKey, nValue);
      }
    } else {
      out.set(nextKey, value);
    }
  }
  return out;
}

function checkText(text, locale, filename, keyOrLine, errors) {
  if (typeof text !== "string") return;

  const rules = locale === "ar" ? ROBOTIC_AR : ROBOTIC_EN;
  const isEn = locale === "en";

  for (const rule of rules) {
    const matched = isEn
      ? text.toLowerCase().includes(rule.phrase.toLowerCase())
      : text.includes(rule.phrase);

    if (matched) {
      // Check allowlist
      const fileAllowlist = ALLOWLIST[`${locale}/${filename}`] || ALLOWLIST[filename];
      if (fileAllowlist && fileAllowlist[keyOrLine]) {
        console.log(`[UX-GUARD] [ALLOWLISTED] [${locale}] ${filename} -> ${keyOrLine}: matched "${rule.phrase}" (Reason: ${fileAllowlist[keyOrLine]})`);
        continue;
      }

      errors.push({
        file: `${locale}/${filename}`,
        key: keyOrLine,
        locale,
        phrase: rule.phrase,
        rule: rule.rule,
        text
      });
    }
  }
}

function scanFrontend(errors) {
  if (!fs.existsSync(FE_MESSAGES_DIR)) {
    console.warn(`Frontend messages directory not found at: ${FE_MESSAGES_DIR}`);
    return;
  }

  const locales = ["ar", "en"];
  for (const locale of locales) {
    const localeDir = path.join(FE_MESSAGES_DIR, locale);
    if (!fs.existsSync(localeDir)) continue;

    const files = fs.readdirSync(localeDir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const filePath = path.join(localeDir, file);
      let json;
      try {
        json = JSON.parse(fs.readFileSync(filePath, "utf8"));
      } catch (err) {
        console.error(`Error parsing JSON file ${filePath}:`, err);
        continue;
      }

      const flat = flattenObject(json);
      for (const [key, value] of flat.entries()) {
        checkText(value, locale, file, key, errors);
      }
    }
  }
}

function scanBackend(errors) {
  if (!fs.existsSync(BE_CATALOGS_DIR)) {
    console.warn(`Backend catalogs directory not found at: ${BE_CATALOGS_DIR}`);
    return;
  }

  const locales = ["ar", "en"];
  for (const locale of locales) {
    const localeDir = path.join(BE_CATALOGS_DIR, locale);
    if (!fs.existsSync(localeDir)) continue;

    const files = fs.readdirSync(localeDir).filter((f) => f.endsWith(".catalog.ts"));
    for (const file of files) {
      const filePath = path.join(localeDir, file);
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");

      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
          return;
        }
        checkText(line, locale, file, `line ${idx + 1}`, errors);
      });
    }
  }
}

const DELETED_KEYS = [
  "phoneHelper",
  "phoneSavedAs",
  "patientSignUp.nameHint",
  "patientSignUp.passwordHint",
  "patientSignUp.pricingNote",
  "applications.directCreate.phoneHelper",
  "applications.directCreate.phoneSavedAs"
];

const SRC_DIR = path.join(root, "src");

function walkSource(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkSource(filePath, fileList);
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function scanSourceForDeletedKeys(errors) {
  if (!fs.existsSync(SRC_DIR)) {
    console.warn(`Source directory not found at: ${SRC_DIR}`);
    return;
  }

  const sourceFiles = walkSource(SRC_DIR);
  for (const filePath of sourceFiles) {
    const relativePath = path.relative(root, filePath);
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
        return;
      }

      for (const key of DELETED_KEYS) {
        if (line.includes(key)) {
          errors.push({
            file: relativePath,
            key: `line ${idx + 1}`,
            locale: "source code reference",
            phrase: key,
            rule: `Obsolete translation key "${key}" is still consumed in code.`,
            text: line
          });
        }
      }
    });
  }
}

function main() {
  console.log("Starting UX Copy Audit Guard Scan...");
  const errors = [];

  scanFrontend(errors);
  scanBackend(errors);
  scanSourceForDeletedKeys(errors);

  if (errors.length > 0) {
    console.error("\x1b[31m%s\x1b[0m", "UX Copy Guard validation failed! Prohibited copy phrases or obsolete key references detected:");
    for (const err of errors) {
      console.error(`- File: ${err.file}`);
      console.error(`  Key/Line: ${err.key}`);
      console.error(`  Locale: ${err.locale}`);
      console.error(`  Matched Phrase/Key: "${err.phrase}"`);
      console.error(`  Rule Violation: ${err.rule}`);
      console.error(`  Violating Content: "${err.text.trim()}"`);
      console.error("");
    }
    process.exit(1);
  }

  console.log("\x1b[32m%s\x1b[0m", "UX Copy Guard validation passed successfully. No prohibited phrases or obsolete key references found.");
}

main();

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const messagesRoot = path.join(root, "messages");
const baseLocale = "en";
const targetLocales = ["ar"];
const skippedNamespaces = new Set([
  "academy",
  "notifications",
  "payments",
  "practitioner-area",
  "training",
]);

const mojibakeRegex = /(Ã.|Ø.|Ù.|â.|ï¿½|�)/;
const brokenQuestionRegex = /\?{2,}/;

function readJson(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  return JSON.parse(content);
}

function flattenObject(obj, prefix = "") {
  const out = new Map();
  if (Array.isArray(obj)) {
    obj.forEach((value, index) => {
      const key = prefix ? `${prefix}.${index}` : `${index}`;
      if (value && typeof value === "object") {
        for (const [nestedKey, nestedValue] of flattenObject(value, key)) {
          out.set(nestedKey, nestedValue);
        }
      } else {
        out.set(key, value);
      }
    });
    return out;
  }

  for (const [key, value] of Object.entries(obj)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") {
      for (const [nestedKey, nestedValue] of flattenObject(value, nextKey)) {
        out.set(nestedKey, nestedValue);
      }
    } else {
      out.set(nextKey, value);
    }
  }
  return out;
}

function validateLocaleFile(locale, namespace, baseMap, localeMap, errors) {
  for (const key of baseMap.keys()) {
    if (!localeMap.has(key)) {
      errors.push(`[missing-key] ${locale}/${namespace}.json -> ${key}`);
    }
  }

  for (const key of localeMap.keys()) {
    if (!baseMap.has(key)) {
      errors.push(`[extra-key] ${locale}/${namespace}.json -> ${key}`);
    }
  }

  if (locale !== "ar") return;

  for (const [key, value] of localeMap.entries()) {
    if (typeof value !== "string") continue;
    if (brokenQuestionRegex.test(value)) {
      errors.push(`[invalid-text] ${locale}/${namespace}.json -> ${key} contains '???'`);
    }
    if (mojibakeRegex.test(value)) {
      errors.push(`[invalid-text] ${locale}/${namespace}.json -> ${key} looks mojibake`);
    }
  }
}

function main() {
  const errors = [];
  const baseLocaleDir = path.join(messagesRoot, baseLocale);
  const namespaces = fs
    .readdirSync(baseLocaleDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.basename(name, ".json"))
    .sort();

  for (const namespace of namespaces) {
    const basePath = path.join(messagesRoot, baseLocale, `${namespace}.json`);
    if (!fs.existsSync(basePath)) {
      errors.push(`[missing-file] ${baseLocale}/${namespace}.json`);
      continue;
    }

    if (skippedNamespaces.has(namespace)) {
      continue;
    }

    let baseJson;
    try {
      baseJson = readJson(basePath);
    } catch (error) {
      errors.push(`[invalid-json] ${baseLocale}/${namespace}.json -> ${error.message}`);
      continue;
    }

    const baseMap = flattenObject(baseJson);

    for (const locale of targetLocales) {
      const localePath = path.join(messagesRoot, locale, `${namespace}.json`);
      if (!fs.existsSync(localePath)) {
        errors.push(`[missing-file] ${locale}/${namespace}.json`);
        continue;
      }

      let localeJson;
      try {
        localeJson = readJson(localePath);
      } catch (error) {
        errors.push(`[invalid-json] ${locale}/${namespace}.json -> ${error.message}`);
        continue;
      }

      const localeMap = flattenObject(localeJson);
      validateLocaleFile(locale, namespace, baseMap, localeMap, errors);
    }
  }

  if (errors.length > 0) {
    console.error("i18n validation failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("i18n validation passed.");
}

main();

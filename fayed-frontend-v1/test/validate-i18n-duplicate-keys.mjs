#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateNoDuplicateKeys } from "../scripts/i18n-duplicate-key-guard.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const messagesRoot = path.join(root, "messages");
const errors = validateNoDuplicateKeys(messagesRoot);

if (errors.length > 0) {
  console.error("duplicate-key validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("[validate-i18n-duplicate-keys] ok");

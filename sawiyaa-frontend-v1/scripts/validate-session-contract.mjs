import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src");
const forbidden = /\.(presentationStatus|joinAvailability)\b/;
const files = [];

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".test.tsx")) files.push(path);
  }
}

walk(root);
const violations = files.filter((file) => forbidden.test(readFileSync(file, "utf8")));
if (violations.length) {
  throw new Error(`Legacy Session contract access is forbidden:\n${violations.join("\n")}`);
}

console.log("Session contract guard passed.");

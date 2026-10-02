import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const productionRoots = ["app", "src"];
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);

// These files intentionally contain web branches. New browser usage elsewhere is not exempt.
const documentedWebFiles = new Map([
  ["app/_layout.tsx", "root web-style injection is guarded by Platform.OS and document presence"],
  ["src/features/public/components/PublicHeader.tsx", "document direction update is guarded by document presence"],
  ["app/(patient)/sessions/[id]/pay.tsx", "checkout navigation uses window only inside Platform.OS === web"],
  ["src/features/patient/package-plans/components/PackagePurchasePayScreen.tsx", "checkout navigation uses window only inside Platform.OS === web"],
  ["src/features/patient/academy/navigation.ts", "web origin is optional and guarded"],
  ["src/features/patient/academy/components/AcademyEnrollmentDetailScreen.tsx", "redirect uses window only inside Platform.OS === web"],
  ["src/features/patient/academy/components/AcademyEnrollmentPaymentReturnScreen.tsx", "redirect uses window only inside Platform.OS === web"],
  ["src/features/messages/components/MessageThreadScreen.tsx", "attachment preview/open uses browser URL and DOM APIs only inside Platform.OS === web"],
]);
const nativeFormDataFiles = new Set([
  "src/features/practitioner/onboarding/api.ts",
  "src/features/patient/profile/api.ts",
  "src/features/messages/api.ts",
]);

function listSourceFiles(directory) {
  const absolute = path.join(root, directory);
  const files = [];
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "__tests__") continue;
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listSourceFiles(relative));
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(relative);
  }
  return files;
}

function lineNumberAt(text, index) {
  return text.slice(0, index).split("\n").length;
}

function matchesFor(text, regex) {
  return [...text.matchAll(regex)].map((match) => ({
    line: lineNumberAt(text, match.index ?? 0),
    text: match[0],
  }));
}

const findings = [];
for (const file of productionRoots.flatMap(listSourceFiles)) {
  const normalizedFile = file.split(path.sep).join("/");
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const documentedReason = documentedWebFiles.get(normalizedFile);

  for (const match of matchesFor(source, /(?:\bcrypto\s*\.\s*(?:randomUUID|getRandomValues)|globalThis\s*\.\s*crypto)\s*\.?/g)) {
    findings.push({ severity: "UNSAFE", file: normalizedFile, ...match, reason: "browser crypto API in native source" });
  }

  for (const match of matchesFor(source, /\bprocess\.env\s*\[/g)) {
    findings.push({ severity: "UNSAFE", file: normalizedFile, ...match, reason: "dynamic environment access cannot be reliably inlined by Expo/Metro" });
  }

  for (const match of matchesFor(source, /process\.env\s+as\s+Record\b/g)) {
    findings.push({ severity: "UNSAFE", file: normalizedFile, ...match, reason: "dynamic environment access cannot be reliably inlined by Expo/Metro" });
  }

  for (const match of matchesFor(source, /\b(?:localStorage|sessionStorage|indexedDB|FileReader|EventSource|BroadcastChannel|Worker)\b/g)) {
    findings.push({ severity: "UNSAFE", file: normalizedFile, ...match, reason: "browser-only global in native production source" });
  }

  for (const match of matchesFor(source, /\b(?:Blob|FormData)\b/g)) {
    if (nativeFormDataFiles.has(normalizedFile)) {
      findings.push({ severity: "SAFE", file: normalizedFile, ...match, reason: "React Native FormData upload shape; Blob cast is used only at the native upload boundary" });
    } else {
      findings.push({ severity: "UNSAFE", file: normalizedFile, ...match, reason: "file/blob API outside the documented native upload boundary" });
    }
  }

  for (const match of matchesFor(source, /\bURL\s*\.\s*createObjectURL\b/g)) {
    findings.push({
      severity: documentedReason ? "SAFE" : "UNSAFE",
      file: normalizedFile,
      ...match,
      reason: documentedReason ?? "browser-only object URL API in native production source",
    });
  }

  for (const match of matchesFor(source, /\b(?:eval|atob|btoa)\s*\(/g)) {
    findings.push({ severity: "UNSAFE", file: normalizedFile, ...match, reason: "dynamic/browser-only runtime helper in native production source" });
  }

  for (const match of matchesFor(source, /from\s+["'](?:react-dom|@testing-library\/dom|jsdom)["']/g)) {
    findings.push({ severity: "UNSAFE", file: normalizedFile, ...match, reason: "browser-only package imported into native production source" });
  }

  // Match browser APIs, not ordinary domain variables such as `for (const window of windows)`.
  for (const match of matchesFor(source, /\b(?:window\s*\.\s*(?:location|setTimeout|clearTimeout|localStorage|sessionStorage|navigator|crypto|document|File|Blob|URL)|document)\s*\./g)) {
    const isWebGuarded = documentedReason && (
      /Platform\.OS\s*===\s*["']web["']/.test(source) ||
      /typeof\s+document\s*!==\s*["']undefined["']/.test(source)
    );
    if (isWebGuarded) {
      findings.push({ severity: "SAFE", file: normalizedFile, ...match, reason: documentedReason });
    } else {
      findings.push({ severity: "UNSAFE", file: normalizedFile, ...match, reason: "browser global is not in a documented web-only file" });
    }
  }
}

const unsafe = findings.filter((finding) => finding.severity === "UNSAFE");
console.log("Mobile production runtime safety audit");
console.log(`Scanned ${productionRoots.join("/")} source trees; ${findings.length} classified browser/runtime matches.`);
for (const finding of findings) {
  console.log(`${finding.severity.padEnd(7)} ${finding.file}:${finding.line} ${finding.text} — ${finding.reason}`);
}

if (unsafe.length > 0) {
  console.error(`\nRuntime safety gate failed: ${unsafe.length} unsafe production usage(s) detected.`);
  process.exit(1);
}

console.log("\nRuntime safety gate passed: no unapproved browser/runtime hazards detected.");

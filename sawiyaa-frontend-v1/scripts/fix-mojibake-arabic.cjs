/* eslint-disable no-console */
/**
 * Fixes common Arabic mojibake that results from UTF-8 text being mis-decoded as cp1252/latin1.
 *
 * Safety rules:
 * - Only processes .json/.ts/.tsx under messages/ and src/
 * - Only replaces segments that:
 *   1) contain mojibake markers (Ø/Ù/Ã/â/�)
 *   2) decode to UTF-8 successfully AND contain Arabic letters
 *   3) reduce mojibake markers vs original
 *
 * Usage:
 *   node scripts/fix-mojibake-arabic.cjs
 *   node scripts/fix-mojibake-arabic.cjs --check
 */

const fs = require("fs");
const path = require("path");
const { TextDecoder } = require("util");

const ROOT = process.cwd();
const TARGET_DIRS = ["messages", "src"];
const TARGET_EXTS = new Set([".json", ".ts", ".tsx"]);

const MOJIBAKE_MARKERS_RE = /[ØÙÃâ�]/;
const MOJIBAKE_MARKERS_GLOBAL_RE = /[ØÙÃâ�]/g;
const ARABIC_RE = /[\u0600-\u06FF]/;
const ARABIC_GLOBAL_RE = /[\u0600-\u06FF]/g;
const REPLACEMENT_CHAR_RE = /\uFFFD/;
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;

// Minimal Windows-1252 encoder for the 0x80-0x9F range.
// Needed because mojibake strings often include cp1252 punctuation (e.g. U+201E)
// that must map back to the original byte before UTF-8 decoding.
const WIN1252_UNICODE_TO_BYTE = new Map([
  [0x20AC, 0x80],
  [0x201A, 0x82],
  [0x0192, 0x83],
  [0x201E, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02C6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017D, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201C, 0x93],
  [0x201D, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02DC, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203A, 0x9b],
  [0x0153, 0x9c],
  [0x017E, 0x9e],
  [0x0178, 0x9f],
]);

function isTextFile(filePath) {
  return TARGET_EXTS.has(path.extname(filePath));
}

function walk(dirPath, out = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    // Skip typical heavy dirs.
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "dist") {
        continue;
      }
      walk(path.join(dirPath, entry.name), out);
      continue;
    }
    if (entry.isFile()) {
      const filePath = path.join(dirPath, entry.name);
      if (isTextFile(filePath)) out.push(filePath);
    }
  }
  return out;
}

function countMarkers(text) {
  const m = text.match(MOJIBAKE_MARKERS_GLOBAL_RE);
  return m ? m.length : 0;
}

function encodeWin1252ToBytes(text) {
  const bytes = [];
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code === undefined) return null;
    if (code <= 0xff) {
      bytes.push(code);
      continue;
    }
    const mapped = WIN1252_UNICODE_TO_BYTE.get(code);
    if (mapped === undefined) return null;
    bytes.push(mapped);
  }
  return Buffer.from(bytes);
}

function tryFixSegment(segment) {
  if (!MOJIBAKE_MARKERS_RE.test(segment)) return null;
  // Emulates: segment.encode(cp1252).decode(utf-8)
  // We must encode as Windows-1252 (not latin1) because the mojibake text can contain
  // punctuation chars like U+201E that represent bytes 0x80-0x9F.
  const encoded = encodeWin1252ToBytes(segment);
  if (!encoded) return null;
  let fixed;
  try {
    fixed = new TextDecoder("utf-8", { fatal: true }).decode(encoded);
  } catch {
    return null;
  }
  // Reject if decoding produced replacement chars or control garbage.
  if (REPLACEMENT_CHAR_RE.test(fixed)) return null;
  if (CONTROL_CHARS_RE.test(fixed)) return null;
  if (!ARABIC_RE.test(fixed)) return null;
  // Avoid transforming mixed chunks that aren't mostly Arabic.
  const arabicCount = (fixed.match(ARABIC_GLOBAL_RE) ?? []).length;
  if (arabicCount / Math.max(1, fixed.length) < 0.12) return null;
  if (countMarkers(fixed) >= countMarkers(segment)) return null;
  return fixed;
}

function fixContent(content) {
  if (!MOJIBAKE_MARKERS_RE.test(content)) {
    return { changed: false, output: content, fixes: 0 };
  }

  // Replace local "runs" that include mojibake markers.
  // Avoid truncation: don't cap length, but stop at line boundaries.
  const RUN_RE = /[ØÙÃâ�][^\r\n]*/g;
  let fixes = 0;

  const output = content.replace(RUN_RE, (run) => {
    const candidate = tryFixSegment(run);
    if (!candidate) return run;
    fixes += 1;
    return candidate;
  });

  return { changed: output !== content, output, fixes };
}

function main() {
  const isCheckOnly = process.argv.includes("--check");
  const files = [];
  for (const d of TARGET_DIRS) {
    const abs = path.join(ROOT, d);
    if (fs.existsSync(abs)) walk(abs, files);
  }

  let totalFiles = 0;
  let changedFiles = 0;
  let totalFixes = 0;

  for (const filePath of files) {
    totalFiles += 1;
    const before = fs.readFileSync(filePath, "utf8");
    if (!MOJIBAKE_MARKERS_RE.test(before)) continue;

    const { changed, output, fixes } = fixContent(before);
    if (!changed) continue;

    changedFiles += 1;
    totalFixes += fixes;

    console.log(`[mojibake] ${path.relative(ROOT, filePath)}: ${fixes} fix(es)`);
    if (!isCheckOnly) {
      fs.writeFileSync(filePath, output, "utf8");
    }
  }

  console.log(
    `[mojibake] scanned ${totalFiles} files, changed ${changedFiles}, fixed ${totalFixes} run(s)`,
  );

  if (isCheckOnly && changedFiles > 0) {
    process.exitCode = 2;
  }
}

main();

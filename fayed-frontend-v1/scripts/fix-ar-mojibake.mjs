import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(process.cwd());
const arDir = path.join(repoRoot, "messages", "ar");
const emojiDetectRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
const emojiStripRegex =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;
const questionRunRegex = /\?{2,}/;

function hasArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

function looksLikeMojibake(text) {
  // When UTF-8 Arabic bytes get mis-decoded and re-saved, we typically see
  // Latin-1-ish characters like: \u00C3 (Ã), \u00D9 (Ù), \u00D8 (Ø).
  // We avoid touching files that already contain Arabic codepoints.
  if (hasArabic(text)) return false;
  return /[\u00C3\u00D9\u00D8]/.test(text);
}

function fixMojibakeUtf8FromLatin1(text) {
  // Reverse: mojibake string -> latin1 bytes -> decode as utf8
  return Buffer.from(text, "latin1").toString("utf8");
}

function stripEmoji(text) {
  return text.replace(emojiStripRegex, "").replace(/\s{2,}/g, " ").trim();
}

function collectSuspectStrings(content) {
  return {
    questionMarks: questionRunRegex.test(content),
    emoji: emojiDetectRegex.test(content),
  };
}

function main() {
  if (!fs.existsSync(arDir)) {
    console.error(`Missing directory: ${arDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(arDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join(arDir, name));

  let changed = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const suspect = collectSuspectStrings(content);
    let nextContent = content;

    if (looksLikeMojibake(nextContent)) {
      const recovered = fixMojibakeUtf8FromLatin1(nextContent);
      if (hasArabic(recovered)) {
        nextContent = recovered;
      }
    }

    if (suspect.emoji) {
      nextContent = stripEmoji(nextContent);
    }

    try {
      JSON.parse(nextContent);
    } catch {
      failed += 1;
      console.warn(`Skip (invalid JSON): ${path.relative(repoRoot, file)}`);
      continue;
    }

    if (nextContent !== content) {
      fs.writeFileSync(file, nextContent, "utf8");
      changed += 1;
      console.log(`Fixed: ${path.relative(repoRoot, file)}`);
    } else {
      skipped += 1;
    }

    if (suspect.questionMarks) {
      console.warn(`Needs manual Arabic rewrite (question marks): ${path.relative(repoRoot, file)}`);
    }
  }

  console.log(JSON.stringify({ changed, skipped, failed, scanned: files.length }, null, 2));
  if (failed > 0) process.exitCode = 2;
}

main();

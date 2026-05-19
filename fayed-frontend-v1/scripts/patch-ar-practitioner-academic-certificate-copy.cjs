/* eslint-disable no-console */
/**
 * Minimal targeted patch for messages/ar/practitioner-area.json without reformatting the whole file.
 * We intentionally avoid rewriting JSON to preserve existing formatting/newlines.
 */
const fs = require("fs");
const path = require("path");

const targetPath = path.resolve(__dirname, "..", "messages", "ar", "practitioner-area.json");
const raw = fs.readFileSync(targetPath, "utf8");
const nl = raw.includes("\r\n") ? "\r\n" : "\n";

const before = `"DOCUMENTS_CREDENTIAL_REQUIRED": {`;
if (!raw.includes(before)) {
  console.error("Anchor not found:", before);
  process.exit(1);
}

const key = `"QUALIFICATIONS_ACADEMIC_CERTIFICATE_REQUIRED": {`;
if (raw.includes(key)) {
  console.log("Already patched.");
  process.exit(0);
}

const insert =
  `        "QUALIFICATIONS_ACADEMIC_CERTIFICATE_REQUIRED": {${nl}` +
  `          "title": "شهادة علمية ناقصة",${nl}` +
  `          "description": "ارفع شهادة علمية (درجة/مؤهل) قبل إرسال طلب الانضمام.",${nl}` +
  `          "whyItMatters": "الشهادة العلمية مطلوبة كإثبات مؤهل لمراجعة الإدارة.",${nl}` +
  `          "recommendedAction": "ارفع الشهادة العلمية في خطوة المؤهلات/المستندات ثم احفظ."${nl}` +
  `        },${nl}`;

const patched = raw.replace(before, insert + `        ` + before);
fs.writeFileSync(targetPath, patched, "utf8");
console.log("Patched:", targetPath);


/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const targetPath = path.resolve(__dirname, "..", "messages", "ar", "admin-area.json");
let raw = fs.readFileSync(targetPath, "utf8");

const nl = raw.includes("\r\n") ? "\r\n" : "\n";

// 1) Remove wrong key under applicationDetails.credentials (it ended up unindented).
raw = raw.replace(new RegExp(`${nl}\"qualifications\"\\s*:\\s*\"Ø§Ù„Ù…Ø¤Ù‡Ù„Ø§Øª\",\\s*`, "g"), nl);

// 2) Add correct key under applicationDetails.sections.
// We use a very specific anchor inside applicationDetails.sections.
const anchor =
  `"credentials": "Ù…Ø³ØªÙ†Ø¯Ø§Øª Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯",${nl}      "payout":`;
if (raw.includes(anchor) && !raw.includes(`${nl}      "qualifications":`)) {
  raw = raw.replace(
    anchor,
    `"credentials": "Ù…Ø³ØªÙ†Ø¯Ø§Øª Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯",${nl}      "qualifications": "المؤهلات",${nl}      "payout":`,
  );
}

fs.writeFileSync(targetPath, raw, "utf8");
console.log("Patched:", targetPath);


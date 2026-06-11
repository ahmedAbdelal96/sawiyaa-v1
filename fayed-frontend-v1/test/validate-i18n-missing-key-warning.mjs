import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const requestConfig = read("src/i18n/request.ts");
const intlProvider = read("src/i18n/IntlProvider.tsx");
const warningHelper = read("src/i18n/missing-key-warning.ts");
const localeLayout = read("src/app/[locale]/layout.tsx");

assert(
  requestConfig.includes("warnMissingTranslation"),
  "Web request config should call the shared missing translation logger.",
);
assert(
  requestConfig.includes("process.env.NODE_ENV === \"development\""),
  "Web request config should keep non-missing errors in development only.",
);
assert(
  intlProvider.includes("warnMissingTranslation"),
  "Web IntlProvider should warn for missing translations on the client.",
);
assert(
  intlProvider.includes("IntlErrorCode.MISSING_MESSAGE"),
  "Web IntlProvider should only treat missing-message errors as warnings.",
);
assert(
  warningHelper.includes("process.env.NODE_ENV === \"production\""),
  "Web missing-key logger should be disabled in production.",
);
assert(
  warningHelper.includes("console.warn"),
  "Web missing-key logger should warn in development.",
);
assert(
  warningHelper.includes("globalThis"),
  "Web missing-key logger should dedupe warnings across the session.",
);
assert(
  warningHelper.includes("[Fayed i18n missing] lang="),
  "Web missing-key logger should emit a searchable lang-based warning label.",
);
assert(
  warningHelper.includes("fallback="),
  "Web missing-key logger should mention fallback locale when available.",
);
assert(
  localeLayout.includes("AppIntlProvider"),
  "Locale layout should use the shared IntlProvider wrapper.",
);
assert(
  !requestConfig.includes('console.warn("[i18n] Missing translation:"'),
  "Legacy missing translation console spam should be removed from request config.",
);
assert(
  !requestConfig.includes("????"),
  "Request config should not contain raw placeholder spam.",
);

const riskyFallbackPatterns = [
  't("profileScreen.hub.rows.articles.title", "Articles")',
  't("profileScreen.hub.rows.articles.subtitle", "Browse health content and guidance")',
  't("profileScreen.hub.rows.messages.title", "Messages")',
  't("profileScreen.hub.rows.messages.subtitle", "Open conversations with your practitioner")',
];

for (const pattern of riskyFallbackPatterns) {
  assert(
    !requestConfig.includes(pattern) && !intlProvider.includes(pattern),
    `Legacy raw English fallback should not be present in i18n infrastructure: ${pattern}`,
  );
}

console.log("Web i18n missing-key warning setup passed.");

import fs from "node:fs";
import path from "node:path";

type JsonValue = Record<string, any>;

const root = path.resolve(__dirname, "../..");
const readLocale = (language: "ar" | "en") =>
  JSON.parse(
    fs.readFileSync(path.join(root, "src/i18n/locales/" + language + ".json"), "utf8"),
  ) as JsonValue;

const at = (value: JsonValue, key: string) =>
  key.split(".").reduce((current, part) => current?.[part], value);

describe("Practitioner earnings vocabulary", () => {
  test.each([
    ["ar", "الأرباح"],
    ["en", "Earnings"],
  ] as const)("uses the approved destination name in %s", (language, expected) => {
    const translations = readLocale(language);

    for (const key of [
      "practitioner.more.sections.finance",
      "practitioner.more.rows.finance.title",
      "practitioner.finance.quickAccess",
      "practitioner.finance.title",
      "practitioner.finance.product.title",
      "practitioner.finance.product.tools",
    ]) {
      expect(at(translations, key)).toBe(expected);
    }
  });

  test("keeps Patient Wallet vocabulary separate", () => {
    expect(at(readLocale("ar"), "profileScreen.hub.rows.wallet.title")).toBe(
      "المحفظة",
    );
    expect(at(readLocale("en"), "profileScreen.hub.rows.wallet.title")).toBe(
      "Wallet",
    );
  });
});

import fs from "fs";
import path from "path";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const localeDir = path.resolve(__dirname, "../../src/i18n/locales");
const publicRoots = [
  path.resolve(__dirname, "../../app/(public)"),
  path.resolve(__dirname, "../../src/features/public/components"),
];

function flatten(value: JsonValue, prefix = "", output: Record<string, JsonValue> = {}) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, output);
    }
  } else if (prefix) {
    output[prefix] = value;
  }
  return output;
}

function readLocale(language: "ar" | "en") {
  return JSON.parse(fs.readFileSync(path.join(localeDir, `${language}.json`), "utf8")) as JsonValue;
}

function collectFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(filePath) : /\.(tsx?|jsx?)$/.test(entry.name) ? [filePath] : [];
  });
}

function collectPublicHomeKeys() {
  const keys = new Set<string>();
  for (const root of publicRoots) {
    for (const filePath of collectFiles(root)) {
      const source = fs.readFileSync(filePath, "utf8");
      for (const match of source.matchAll(/(?:t|i18n\.t)\(\s*["'](publicHome\.[^"']+)["']/g)) {
        keys.add(match[1]);
      }
    }
  }
  return [...keys].sort();
}

describe("Public Home translation parity", () => {
  const ar = flatten(readLocale("ar"));
  const en = flatten(readLocale("en"));

  it("keeps the complete Arabic and English locale trees in parity", () => {
    const missingArabic = Object.keys(en).filter((key) => !(key in ar));
    const missingEnglish = Object.keys(ar).filter((key) => !(key in en));

    expect({ missingArabic, missingEnglish }).toEqual({ missingArabic: [], missingEnglish: [] });
  });

  it("provides non-empty publicHome strings in both languages", () => {
    const publicKeys = new Set([...Object.keys(ar), ...Object.keys(en)].filter((key) => key.startsWith("publicHome.")));
    const invalid = [...publicKeys].filter((key) => {
      const arValue = ar[key];
      const enValue = en[key];
      return typeof arValue !== "string" || arValue.trim() === "" || typeof enValue !== "string" || enValue.trim() === "";
    });

    expect(invalid).toEqual([]);
  });

  it("defines every publicHome key used by the public routes and components", () => {
    const usedKeys = collectPublicHomeKeys();
    const missingArabic = usedKeys.filter((key) => !(key in ar));
    const missingEnglish = usedKeys.filter((key) => !(key in en));

    expect({ usedKeys, missingArabic, missingEnglish }).toMatchObject({ missingArabic: [], missingEnglish: [] });
  });

  it("does not use English fallback strings in public translation calls", () => {
    const fallbackCalls: string[] = [];
    for (const root of publicRoots) {
      for (const filePath of collectFiles(root)) {
        const source = fs.readFileSync(filePath, "utf8");
        for (const match of source.matchAll(/t\(\s*["'][^"']+["']\s*,\s*["']/g)) fallbackCalls.push(`${filePath}:${match[0]}`);
      }
    }
    expect(fallbackCalls).toEqual([]);
  });
});

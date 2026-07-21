import { IBAN_REGISTRY } from "./iban-registry";

export type PayoutValidationCode =
  | "IBAN_REQUIRED"
  | "IBAN_INVALID_CHARACTERS"
  | "IBAN_UNSUPPORTED_COUNTRY"
  | "IBAN_COUNTRY_MISMATCH"
  | "IBAN_INVALID_LENGTH"
  | "IBAN_INVALID_BBAN_FORMAT"
  | "IBAN_INVALID_CHECKSUM"
  | "PAYOUT_ACCOUNT_HOLDER_REQUIRED"
  | "PAYOUT_ACCOUNT_HOLDER_INVALID"
  | "PAYOUT_COUNTRY_REQUIRED"
  | "PAYOUT_COUNTRY_UNSUPPORTED"
  | "PAYOUT_WALLET_INVALID";

export function normalizeIban(input: string | null | undefined) {
  return (input ?? "").trim().replace(/[\s-]+/g, "").toUpperCase();
}

export function formatIbanForDisplay(input: string | null | undefined) {
  return normalizeIban(input).replace(/.{1,4}/g, (group) => `${group} `).trim();
}

export function maskIban(input: string | null | undefined) {
  const value = normalizeIban(input);
  if (!value) return "";
  return value.length <= 8
    ? `${value.slice(0, 2)} •••• ${value.slice(-2)}`
    : `${value.slice(0, 4)} •••• •••• ${value.slice(-4)}`;
}

function isValidChecksum(value: string) {
  const rearranged = `${value.slice(4)}${value.slice(0, 4)}`;
  let remainder = 0;
  for (const char of rearranged) {
    const encoded = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of encoded) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }
  return remainder === 1;
}

export function validateIban(
  input: string | null | undefined,
  expectedCountry?: string | null,
) {
  const canonical = normalizeIban(input);
  const countryCode = canonical.slice(0, 2);
  const fail = (code: PayoutValidationCode) => ({
    valid: false,
    canonical,
    countryCode,
    code,
  });

  if (!canonical) return fail("IBAN_REQUIRED");
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(canonical)) return fail("IBAN_INVALID_CHARACTERS");
  const definition = IBAN_REGISTRY[countryCode];
  if (!definition) return fail("IBAN_UNSUPPORTED_COUNTRY");
  if (countryCode !== expectedCountry?.trim().toUpperCase()) return fail("IBAN_COUNTRY_MISMATCH");
  if (canonical.length !== definition.length) return fail("IBAN_INVALID_LENGTH");
  if (!definition.bbanPattern.test(canonical.slice(4))) return fail("IBAN_INVALID_BBAN_FORMAT");
  if (!isValidChecksum(canonical)) return fail("IBAN_INVALID_CHECKSUM");
  return { valid: true, canonical, countryCode } as const;
}

export function normalizeWalletIdentifier(input: string | null | undefined, countryCode: string) {
  const value = (input ?? "").replace(/[\s()-]/g, "");
  if (!/^\+?\d+$/.test(value)) return "";
  const canonical = value.startsWith("+") ? value : `+${value}`;
  return /^\+[1-9]\d{7,14}$/.test(canonical) ? canonical : "";
}

export function normalizeAccountHolderName(input: string | null | undefined) {
  return (input ?? "").trim().replace(/\s+/g, " ");
}

export function validateAccountHolderName(input: string | null | undefined) {
  const value = normalizeAccountHolderName(input);
  if (!value) return "PAYOUT_ACCOUNT_HOLDER_REQUIRED" as const;
  if (value.length < 2 || value.length > 191 || /^[\d\p{P}\s]+$/u.test(value)) {
    return "PAYOUT_ACCOUNT_HOLDER_INVALID" as const;
  }
  return null;
}

import type { PractitionerProfile } from "@/features/practitioner-profile/types/profile";
import type { SessionMode } from "@/features/sessions/types/sessions.types";

export type CurrencyCode = "EGP" | "USD";

export type PricingMatrix = {
  session30: { egp: number | null; usd: number | null };
  session60: { egp: number | null; usd: number | null };
};

export function resolvePricingMatrix(profile: PractitionerProfile): PricingMatrix {
  const pricing = profile.pricing;
  return {
    session30: {
      egp: pricing?.session30.egp ?? profile.sessionPrice30Egp ?? null,
      usd: pricing?.session30.usd ?? profile.sessionPrice30Usd ?? null,
    },
    session60: {
      egp: pricing?.session60.egp ?? profile.sessionPrice60Egp ?? null,
      usd: pricing?.session60.usd ?? profile.sessionPrice60Usd ?? null,
    },
  };
}

export function getSupportedCurrencies(
  pricing: PricingMatrix,
  durationMinutes: 30 | 60,
): CurrencyCode[] {
  const matrix = durationMinutes === 30 ? pricing.session30 : pricing.session60;
  return (["EGP", "USD"] as const).filter((currency): currency is CurrencyCode => {
    return matrix[currency.toLowerCase() as "egp" | "usd"] !== null;
  });
}

export function resolveDefaultDuration(pricing: PricingMatrix): 30 | 60 {
  if (pricing.session60.egp !== null || pricing.session60.usd !== null) return 60;
  return 30;
}

export function resolveDefaultCurrency(
  pricing: PricingMatrix,
  durationMinutes: 30 | 60,
): CurrencyCode {
  const currencies = getSupportedCurrencies(pricing, durationMinutes);
  return currencies[0] ?? "EGP";
}

export function formatMoney(locale: string, currencyCode: CurrencyCode, amount: string) {
  const value = Number(amount);
  if (Number.isNaN(value)) return amount;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: string) {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n)}%`;
}

export function formatDurationLabel(durationMinutes: number) {
  return `${durationMinutes} min`;
}

export function isSessionModeSupported(sessionMode: SessionMode) {
  return sessionMode === "VIDEO";
}

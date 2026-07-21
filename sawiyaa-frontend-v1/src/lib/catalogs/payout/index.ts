import type { PayoutCatalogItem, PayoutCatalogOption } from "./payout-catalog.types";
import { BANK_CATALOG } from "./banks";
import { WALLET_PROVIDER_CATALOG } from "./wallet-providers";

type SupportedLocale = "ar" | "en";

function normalizeLocale(locale: string): SupportedLocale {
  return locale === "ar" ? "ar" : "en";
}

function normalizeCountryCode(countryCode?: string) {
  const normalized = countryCode?.trim().toUpperCase() ?? "";
  return normalized.length > 0 ? normalized : "";
}

function sortCatalogItems(items: PayoutCatalogItem[], locale: SupportedLocale) {
  return [...items].sort((left, right) => {
    const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.label[locale].localeCompare(right.label[locale]);
  });
}

function matchesCatalogValue(item: PayoutCatalogItem, value: string): boolean {
  const normalizedValue = value.trim().toLowerCase();
  if (!normalizedValue) return false;

  return (
    item.code.toLowerCase() === normalizedValue ||
    item.label.ar.toLowerCase() === normalizedValue ||
    item.label.en.toLowerCase() === normalizedValue ||
    item.aliases?.ar?.toLowerCase() === normalizedValue ||
    item.aliases?.en?.toLowerCase() === normalizedValue
  );
}

function findCatalogItemByValue(items: PayoutCatalogItem[], value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return items.find((item) => matchesCatalogValue(item, trimmed)) ?? null;
}

function filterCatalogItems(items: PayoutCatalogItem[], countryCode?: string) {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  return items.filter(
    (item) =>
      item.active &&
      (normalizedCountryCode.length === 0 || item.countryCodes.includes(normalizedCountryCode)),
  );
}

function getLocalizedCatalogOptions(
  items: PayoutCatalogItem[],
  locale: string,
  countryCode?: string,
  currentValue?: string,
): PayoutCatalogOption[] {
  const normalizedLocale = normalizeLocale(locale);
  const filteredItems = sortCatalogItems(filterCatalogItems(items, countryCode), normalizedLocale);

  const options = filteredItems.map((item) => ({
    value: item.code,
    label: item.label[normalizedLocale],
  }));

  const trimmedCurrent = currentValue?.trim() ?? "";
  if (trimmedCurrent && !options.some((option) => option.value === trimmedCurrent)) {
    options.unshift({
      value: trimmedCurrent,
      label: trimmedCurrent,
    });
  }

  return options;
}

function normalizeCatalogValue(items: PayoutCatalogItem[], value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const match = findCatalogItemByValue(items, trimmed);
  return match?.code ?? trimmed;
}

function resolveCatalogLabel(items: PayoutCatalogItem[], locale: string, value?: string | null): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";

  const normalizedLocale = normalizeLocale(locale);
  const match = findCatalogItemByValue(items, trimmed);
  return match?.label[normalizedLocale] ?? trimmed;
}

export function getBankOptions(
  locale: string,
  countryCode?: string,
  currentValue?: string,
): PayoutCatalogOption[] {
  return getLocalizedCatalogOptions(BANK_CATALOG, locale, countryCode, currentValue);
}

export function getWalletProviderOptions(
  locale: string,
  countryCode?: string,
  currentValue?: string,
): PayoutCatalogOption[] {
  return getLocalizedCatalogOptions(WALLET_PROVIDER_CATALOG, locale, countryCode, currentValue);
}

export function normalizeBankValue(value: string) {
  return normalizeCatalogValue(BANK_CATALOG, value);
}

export function normalizeWalletProviderValue(value: string) {
  return normalizeCatalogValue(WALLET_PROVIDER_CATALOG, value);
}

export function getBankLabel(locale: string, value?: string | null) {
  return resolveCatalogLabel(BANK_CATALOG, locale, value);
}

export function getWalletProviderLabel(locale: string, value?: string | null) {
  return resolveCatalogLabel(WALLET_PROVIDER_CATALOG, locale, value);
}

export function getCatalogItemCountryCodes(value: string) {
  const match = findCatalogItemByValue(BANK_CATALOG, value) ?? findCatalogItemByValue(WALLET_PROVIDER_CATALOG, value);
  return match?.countryCodes ?? [];
}

export const getLocalizedBankOptions = getBankOptions;
export const getLocalizedWalletProviderOptions = getWalletProviderOptions;
export const resolveBankLabel = getBankLabel;
export const resolveWalletProviderLabel = getWalletProviderLabel;

export { BANK_CATALOG, WALLET_PROVIDER_CATALOG };
export { IBAN_REGISTRY } from "./iban-registry";
export {
  formatIbanForDisplay,
  maskIban,
  normalizeAccountHolderName,
  normalizeIban,
  normalizeWalletIdentifier,
  validateAccountHolderName,
  validateIban,
} from "./validation";
export type { PayoutCatalogItem, PayoutCatalogOption, LocalizedLabel } from "./payout-catalog.types";

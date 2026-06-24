import type { PayoutCatalogItem } from "./payout-catalog.types";

export const WALLET_PROVIDER_CATALOG: PayoutCatalogItem[] = [
  {
    code: "VODAFONE_CASH",
    countryCodes: ["EG"],
    label: { ar: "فودافون كاش", en: "Vodafone Cash" },
    aliases: { ar: "فودافون", en: "Vodafone" },
    active: true,
    sortOrder: 10,
  },
  {
    code: "ORANGE_MONEY",
    countryCodes: ["EG"],
    label: { ar: "أورانج موني", en: "Orange Money" },
    aliases: { ar: "أورانج", en: "Orange" },
    active: true,
    sortOrder: 20,
  },
  {
    code: "ETISALAT_CASH",
    countryCodes: ["EG"],
    label: { ar: "اتصالات كاش", en: "Etisalat Cash" },
    aliases: { ar: "اتصالات", en: "Etisalat" },
    active: true,
    sortOrder: 30,
  },
  {
    code: "WE_PAY",
    countryCodes: ["EG"],
    label: { ar: "وي باي", en: "WE Pay" },
    active: true,
    sortOrder: 40,
  },
  {
    code: "STC_PAY",
    countryCodes: ["SA"],
    label: { ar: "إس تي سي باي", en: "STC Pay" },
    aliases: { ar: "stc", en: "STC" },
    active: true,
    sortOrder: 10,
  },
  {
    code: "ALINMA_PAY",
    countryCodes: ["SA"],
    label: { ar: "الإنماء باي", en: "Alinma Pay" },
    active: true,
    sortOrder: 20,
  },
  {
    code: "EMIRATES_WALLET",
    countryCodes: ["AE"],
    label: { ar: "محفظة الإمارات", en: "Emirates Wallet" },
    active: true,
    sortOrder: 10,
  },
  {
    code: "DU_PAY",
    countryCodes: ["AE"],
    label: { ar: "دو باي", en: "du Pay" },
    active: true,
    sortOrder: 20,
  },
];

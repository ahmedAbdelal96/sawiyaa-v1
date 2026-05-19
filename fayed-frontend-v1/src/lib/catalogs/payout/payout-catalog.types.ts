export type LocalizedLabel = {
  ar: string;
  en: string;
};

export type PayoutCatalogItem = {
  code: string;
  countryCodes: string[];
  label: LocalizedLabel;
  aliases?: LocalizedLabel;
  active: boolean;
  sortOrder?: number;
};

export type PayoutCatalogOption = {
  value: string;
  label: string;
};

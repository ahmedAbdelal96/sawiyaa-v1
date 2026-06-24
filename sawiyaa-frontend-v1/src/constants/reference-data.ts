export const SUPPORTED_COUNTRY_CODES = ["eg", "sa", "ae", "kw", "jo"] as const;

export const SUPPORTED_COUNTRY_CODE_OPTIONS = SUPPORTED_COUNTRY_CODES.map((code) => ({
  value: code.toUpperCase(),
  label: code.toUpperCase(),
}));

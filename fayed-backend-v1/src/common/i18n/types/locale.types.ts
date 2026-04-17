/**
 * Phase 1 supports Arabic and English only.
 * Keep locale usage typed from the start so other modules do not pass arbitrary language strings around.
 */
export const SUPPORTED_LOCALES = ['ar', 'en'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

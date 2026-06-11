export type ProfileGenderTranslationKey =
  | "male"
  | "female"
  | "other"
  | "prefer_not_to_say"
  | "unspecified";

const GENDER_KEY_ALIASES: Record<string, ProfileGenderTranslationKey> = {
  male: "male",
  female: "female",
  other: "other",
  unspecified: "unspecified",
  prefer_not_to_say: "prefer_not_to_say",
  prefernottosay: "prefer_not_to_say",
};

export function normalizeProfileGender(
  value: string | null | undefined,
): ProfileGenderTranslationKey | null {
  if (!value) return null;

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return GENDER_KEY_ALIASES[normalized] ?? null;
}


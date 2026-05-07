import { UpdatePractitionerProfileInput } from '../types/practitioner.types';

/**
 * Normalization keeps profile update behavior deterministic:
 * trim user-facing text and normalize country/language codes before validation and persistence.
 */
export function normalizePractitionerProfileInput(
  input: UpdatePractitionerProfileInput,
): UpdatePractitionerProfileInput {
  return {
    ...input,
    displayName:
      input.displayName === undefined ? undefined : input.displayName.trim(),
    professionalTitle:
      input.professionalTitle === undefined
        ? undefined
        : input.professionalTitle === null
          ? null
          : input.professionalTitle.trim(),
    bio:
      input.bio === undefined
        ? undefined
        : input.bio === null
          ? null
          : input.bio.trim(),
    locale: input.locale?.trim(),
    acceptsPackage: input.acceptsPackage,
    timezone: input.timezone?.trim(),
    countryCode:
      input.countryCode === undefined
        ? undefined
        : input.countryCode === null
          ? null
          : input.countryCode.trim().toUpperCase(),
    languageCodes: input.languageCodes?.map((code) =>
      code.trim().toLowerCase(),
    ),
    payoutDestination:
      input.payoutDestination === undefined
        ? undefined
        : input.payoutDestination === null
          ? null
          : {
              methodType: input.payoutDestination.methodType,
              accountHolderName:
                input.payoutDestination.accountHolderName?.trim() || null,
              bankName: input.payoutDestination.bankName?.trim() || null,
              bankAccountNumber:
                input.payoutDestination.bankAccountNumber?.trim() || null,
              iban: input.payoutDestination.iban?.trim().toUpperCase() || null,
              walletProvider:
                input.payoutDestination.walletProvider?.trim() || null,
              walletIdentifier:
                input.payoutDestination.walletIdentifier?.trim() || null,
              otherDetails:
                input.payoutDestination.otherDetails?.trim() || null,
            },
  };
}

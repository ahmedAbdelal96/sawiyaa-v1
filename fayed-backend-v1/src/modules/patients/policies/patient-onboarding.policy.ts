import { Injectable } from '@nestjs/common';

/**
 * Patient onboarding is intentionally simple in Phase 1.
 * We only require a minimum set of profile and preference fields before marking onboarding as completed.
 */
@Injectable()
export class PatientOnboardingPolicy {
  isCompletable(input: {
    displayName: string | null;
    locale: string | null;
    timezone: string | null;
    countryCode: string | null;
  }): boolean {
    return Boolean(
      input.displayName?.trim() &&
      input.locale?.trim() &&
      input.timezone?.trim() &&
      input.countryCode?.trim(),
    );
  }
}

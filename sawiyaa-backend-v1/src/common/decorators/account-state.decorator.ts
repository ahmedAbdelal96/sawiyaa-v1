import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ACCOUNT_STATE_REQUIREMENTS_KEY } from '../constants/auth-metadata.constants';
import { AccountStateRequirement } from '../enums/account-state-requirement.enum';
import { ActiveAccountGuard } from '../guards/account-state/active-account.guard';
import { VerifiedEmailGuard } from '../guards/account-state/verified-email.guard';
import { VerifiedPhoneGuard } from '../guards/account-state/verified-phone.guard';
import { PractitionerOtpVerifiedGuard } from '../guards/practitioner/practitioner-otp-verified.guard';
import { PractitionerOnboardingGuard } from '../guards/practitioner/practitioner-onboarding.guard';
import { PractitionerApprovedGuard } from '../guards/practitioner/practitioner-approved.guard';

/**
 * Shared decorator for routes that need one or more access-state checks.
 * Note: some requirements are session-derived (e.g. PRACTITIONER_OTP_VERIFIED), not strictly persisted account columns.
 * The metadata is useful for debugging and future policy tooling, while UseGuards enforces the checks now.
 */
export function RequireAccountStates(
  ...requirements: AccountStateRequirement[]
) {
  const guardMap = {
    [AccountStateRequirement.ACTIVE_ACCOUNT]: ActiveAccountGuard,
    [AccountStateRequirement.VERIFIED_EMAIL]: VerifiedEmailGuard,
    [AccountStateRequirement.VERIFIED_PHONE]: VerifiedPhoneGuard,
    [AccountStateRequirement.PRACTITIONER_OTP_VERIFIED]:
      PractitionerOtpVerifiedGuard,
    [AccountStateRequirement.PRACTITIONER_ONBOARDING_COMPLETED]:
      PractitionerOnboardingGuard,
    [AccountStateRequirement.PRACTITIONER_APPROVED]: PractitionerApprovedGuard,
  };

  const guards = requirements.map((requirement) => guardMap[requirement]);

  return applyDecorators(
    SetMetadata(ACCOUNT_STATE_REQUIREMENTS_KEY, requirements),
    UseGuards(...guards),
  );
}

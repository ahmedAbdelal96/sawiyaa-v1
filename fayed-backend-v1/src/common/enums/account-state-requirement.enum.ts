/**
 * These requirements describe access preconditions that may come from:
 * - persistent account state (active/verified/approved)
 * - authenticated session context (such as practitioner OTP completion in the current session)
 * The name is kept for backward compatibility across current decorators/guards.
 * Dedicated guards can enforce one requirement each, while shared decorators can compose them.
 */
export enum AccountStateRequirement {
  ACTIVE_ACCOUNT = 'ACTIVE_ACCOUNT',
  VERIFIED_EMAIL = 'VERIFIED_EMAIL',
  VERIFIED_PHONE = 'VERIFIED_PHONE',
  PRACTITIONER_OTP_VERIFIED = 'PRACTITIONER_OTP_VERIFIED',
  PRACTITIONER_ONBOARDING_COMPLETED = 'PRACTITIONER_ONBOARDING_COMPLETED',
  PRACTITIONER_APPROVED = 'PRACTITIONER_APPROVED',
}

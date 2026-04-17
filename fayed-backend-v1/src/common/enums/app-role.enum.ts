/**
 * Canonical application roles.
 * Auth Module will later map persisted role records into these values inside request.user.
 */
export enum AppRole {
  ADMIN = 'ADMIN',
  SUPPORT_AGENT = 'SUPPORT_AGENT',
  CONTENT_REVIEWER = 'CONTENT_REVIEWER',
  PATIENT = 'PATIENT',
  PRACTITIONER = 'PRACTITIONER',
}

/**
 * Canonical application roles.
 * Auth Module will later map persisted role records into these values inside request.user.
 */
export enum AppRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  FINANCE_STAFF = 'FINANCE_STAFF',
  MARKETING_STAFF = 'MARKETING_STAFF',
  PRACTITIONER_REVIEWER = 'PRACTITIONER_REVIEWER',
  PATIENT_OPERATIONS = 'PATIENT_OPERATIONS',
  SUPPORT_AGENT = 'SUPPORT_AGENT',
  CONTENT_REVIEWER = 'CONTENT_REVIEWER',
  PATIENT = 'PATIENT',
  PRACTITIONER = 'PRACTITIONER',
}

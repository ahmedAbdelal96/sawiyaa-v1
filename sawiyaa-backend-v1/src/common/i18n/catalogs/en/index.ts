import { enAuthCatalog } from './auth.catalog';
import { enAdminCatalog } from './admin.catalog';
import { enAcademyCatalog } from './academy.catalog';
import { enAssessmentsCatalog } from './assessments.catalog';
import { enAvailabilityCatalog } from './availability.catalog';
import { enCareChatCatalog } from './care-chat.catalog';
import { enChatCatalog } from './chat.catalog';
import { enCommonCatalog } from './common.catalog';
import { enConfigCatalog } from './config.catalog';
import { enFinancialOperationsCatalog } from './financial-operations.catalog';
import { enFinancialRulesCatalog } from './financial-rules.catalog';
import { enInstantBookingCatalog } from './instant-booking.catalog';
import { enMatchingCatalog } from './matching.catalog';
import { enModerationCatalog } from './moderation.catalog';
import { enMessagesCatalog } from './messages.catalog';
import { enPatientJourneyCatalog } from './patient-journey.catalog';
import { enPatientsCatalog } from './patients.catalog';
import { enPaymentsCatalog } from './payments.catalog';
import { enPresenceCatalog } from './presence.catalog';
import { enPractitionersCatalog } from './practitioners.catalog';
import { enReviewsCatalog } from './reviews.catalog';
import { enRefundPoliciesCatalog } from './refund-policies.catalog';
import { enSessionsCatalog } from './sessions.catalog';
import { enSettingsCatalog } from './settings.catalog';
import { enSpecialtiesCatalog } from './specialties.catalog';
import { enSupportCatalog } from './support.catalog';
import { enTrainingCatalog } from './training.catalog';
import { enUsersCatalog } from './users.catalog';
import { enValidationCatalog } from './validation.catalog';

export const enCatalog = {
  academy: enAcademyCatalog,
  auth: enAuthCatalog,
  admin: enAdminCatalog,
  assessments: enAssessmentsCatalog,
  availability: enAvailabilityCatalog,
  careChat: enCareChatCatalog,
  chat: enChatCatalog,
  common: enCommonCatalog,
  validation: enValidationCatalog,
  config: enConfigCatalog,
  financialOperations: enFinancialOperationsCatalog,
  financialRules: enFinancialRulesCatalog,
  instantBooking: enInstantBookingCatalog,
  matching: enMatchingCatalog,
  moderation: enModerationCatalog,
  messages: enMessagesCatalog,
  patientJourney: enPatientJourneyCatalog,
  patients: enPatientsCatalog,
  payments: enPaymentsCatalog,
  presence: enPresenceCatalog,
  practitioners: enPractitionersCatalog,
  reviews: enReviewsCatalog,
  refundPolicies: enRefundPoliciesCatalog,
  sessions: enSessionsCatalog,
  settings: enSettingsCatalog,
  specialties: enSpecialtiesCatalog,
  support: enSupportCatalog,
  training: enTrainingCatalog,
  users: enUsersCatalog,
};

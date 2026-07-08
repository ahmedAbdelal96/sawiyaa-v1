import { arAuthCatalog } from './auth.catalog';
import { arAdminCatalog } from './admin.catalog';
import { arAcademyCatalog } from './academy.catalog';
import { arAssessmentsCatalog } from './assessments.catalog';
import { arAvailabilityCatalog } from './availability.catalog';
import { arCareChatCatalog } from './care-chat.catalog';
import { arChatCatalog } from './chat.catalog';
import { arCommonCatalog } from './common.catalog';
import { arConfigCatalog } from './config.catalog';
import { arFinancialOperationsCatalog } from './financial-operations.catalog';
import { arFinancialRulesCatalog } from './financial-rules.catalog';
import { arInstantBookingCatalog } from './instant-booking.catalog';
import { arMatchingCatalog } from './matching.catalog';
import { arModerationCatalog } from './moderation.catalog';
import { arMessagesCatalog } from './messages.catalog';
import { arPatientJourneyCatalog } from './patient-journey.catalog';
import { arPatientsCatalog } from './patients.catalog';
import { arPaymentsCatalog } from './payments.catalog';
import { arPresenceCatalog } from './presence.catalog';
import { arPractitionersCatalog } from './practitioners.catalog';
import { arReviewsCatalog } from './reviews.catalog';
import { arRefundPoliciesCatalog } from './refund-policies.catalog';
import { arSessionsCatalog } from './sessions.catalog';
import { arSettingsCatalog } from './settings.catalog';
import { arSpecialtiesCatalog } from './specialties.catalog';
import { arSupportCatalog } from './support.catalog';
import { arUsersCatalog } from './users.catalog';
import { arValidationCatalog } from './validation.catalog';

export const arCatalog = {
  academy: arAcademyCatalog,
  academyProgram: arAcademyCatalog.academyProgram,
  auth: arAuthCatalog,
  admin: arAdminCatalog,
  assessments: arAssessmentsCatalog,
  availability: arAvailabilityCatalog,
  careChat: arCareChatCatalog,
  chat: arChatCatalog,
  common: arCommonCatalog,
  validation: arValidationCatalog,
  config: arConfigCatalog,
  financialOperations: arFinancialOperationsCatalog,
  financialRules: arFinancialRulesCatalog,
  instantBooking: arInstantBookingCatalog,
  matching: arMatchingCatalog,
  moderation: arModerationCatalog,
  messages: arMessagesCatalog,
  patientJourney: arPatientJourneyCatalog,
  patients: arPatientsCatalog,
  payments: arPaymentsCatalog,
  presence: arPresenceCatalog,
  practitioners: arPractitionersCatalog,
  reviews: arReviewsCatalog,
  refundPolicies: arRefundPoliciesCatalog,
  sessions: arSessionsCatalog,
  settings: arSettingsCatalog,
  specialties: arSpecialtiesCatalog,
  support: arSupportCatalog,
  users: arUsersCatalog,
};

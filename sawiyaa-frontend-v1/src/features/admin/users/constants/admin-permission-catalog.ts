import { PermissionKey } from "@/lib/auth/permissions";

export type AdminPermissionRisk = "normal" | "sensitive" | "critical";

export type AdminPermissionCatalogItem = {
  key: PermissionKey;
  module: string;
  moduleLabelKey: string;
  labelKey: string;
  descriptionKey?: string;
  risk: AdminPermissionRisk;
  order: number;
};

export const ADMIN_PERMISSION_CATALOG: AdminPermissionCatalogItem[] = [
  // Admin users
  {
    key: PermissionKey.ADMIN_USERS_READ,
    module: "adminUsers",
    moduleLabelKey: "permissions.modules.adminUsers.title",
    labelKey: "permissions.adminUsers.read.label",
    descriptionKey: "permissions.adminUsers.read.description",
    risk: "sensitive",
    order: 10,
  },
  {
    key: PermissionKey.ADMIN_USERS_CREATE,
    module: "adminUsers",
    moduleLabelKey: "permissions.modules.adminUsers.title",
    labelKey: "permissions.adminUsers.create.label",
    descriptionKey: "permissions.adminUsers.create.description",
    risk: "critical",
    order: 11,
  },
  {
    key: PermissionKey.ADMIN_USERS_UPDATE,
    module: "adminUsers",
    moduleLabelKey: "permissions.modules.adminUsers.title",
    labelKey: "permissions.adminUsers.update.label",
    descriptionKey: "permissions.adminUsers.update.description",
    risk: "critical",
    order: 12,
  },
  {
    key: PermissionKey.ADMIN_USERS_STATUS_UPDATE,
    module: "adminUsers",
    moduleLabelKey: "permissions.modules.adminUsers.title",
    labelKey: "permissions.adminUsers.statusUpdate.label",
    descriptionKey: "permissions.adminUsers.statusUpdate.description",
    risk: "critical",
    order: 13,
  },
  {
    key: PermissionKey.ADMIN_USERS_ROLES_UPDATE,
    module: "adminUsers",
    moduleLabelKey: "permissions.modules.adminUsers.title",
    labelKey: "permissions.adminUsers.rolesUpdate.label",
    descriptionKey: "permissions.adminUsers.rolesUpdate.description",
    risk: "critical",
    order: 14,
  },
  {
    key: PermissionKey.ADMIN_USERS_PERMISSION_OVERRIDES_READ,
    module: "adminUsers",
    moduleLabelKey: "permissions.modules.adminUsers.title",
    labelKey: "permissions.adminUsers.permissionOverridesRead.label",
    descriptionKey:
      "permissions.adminUsers.permissionOverridesRead.description",
    risk: "critical",
    order: 15,
  },
  {
    key: PermissionKey.ADMIN_USERS_PERMISSION_OVERRIDES_UPDATE,
    module: "adminUsers",
    moduleLabelKey: "permissions.modules.adminUsers.title",
    labelKey: "permissions.adminUsers.permissionOverridesUpdate.label",
    descriptionKey:
      "permissions.adminUsers.permissionOverridesUpdate.description",
    risk: "critical",
    order: 16,
  },
  {
    key: PermissionKey.ADMIN_USERS_SESSIONS_REVOKE,
    module: "adminUsers",
    moduleLabelKey: "permissions.modules.adminUsers.title",
    labelKey: "permissions.adminUsers.sessionsRevoke.label",
    descriptionKey: "permissions.adminUsers.sessionsRevoke.description",
    risk: "critical",
    order: 17,
  },
  {
    key: PermissionKey.ADMIN_USERS_TOKEN_VERSION_INVALIDATE,
    module: "adminUsers",
    moduleLabelKey: "permissions.modules.adminUsers.title",
    labelKey: "permissions.adminUsers.tokenVersionInvalidate.label",
    descriptionKey: "permissions.adminUsers.tokenVersionInvalidate.description",
    risk: "critical",
    order: 18,
  },

  // Finance
  {
    key: PermissionKey.FINANCE_EVENTS_READ,
    module: "finance",
    moduleLabelKey: "permissions.modules.finance.title",
    labelKey: "permissions.financeEventsRead.label",
    descriptionKey: "permissions.financeEventsRead.description",
    risk: "sensitive",
    order: 30,
  },
  {
    key: PermissionKey.ACCOUNTING_READ,
    module: "finance",
    moduleLabelKey: "permissions.modules.finance.title",
    labelKey: "permissions.accountingRead.label",
    descriptionKey: "permissions.accountingRead.description",
    risk: "critical",
    order: 31,
  },
  {
    key: PermissionKey.ACCOUNTING_WRITE,
    module: "finance",
    moduleLabelKey: "permissions.modules.finance.title",
    labelKey: "permissions.accountingWrite.label",
    descriptionKey: "permissions.accountingWrite.description",
    risk: "critical",
    order: 32,
  },

  // Settlements
  {
    key: PermissionKey.SETTLEMENTS_READ,
    module: "settlements",
    moduleLabelKey: "permissions.modules.settlements.title",
    labelKey: "permissions.settlementsRead.label",
    descriptionKey: "permissions.settlementsRead.description",
    risk: "critical",
    order: 40,
  },
  {
    key: PermissionKey.SETTLEMENTS_WRITE,
    module: "settlements",
    moduleLabelKey: "permissions.modules.settlements.title",
    labelKey: "permissions.settlementsWrite.label",
    descriptionKey: "permissions.settlementsWrite.description",
    risk: "critical",
    order: 41,
  },
  {
    key: PermissionKey.FINANCIAL_PACKAGE_SETTLEMENT_RELEASE,
    module: "settlements",
    moduleLabelKey: "permissions.modules.settlements.title",
    labelKey: "permissions.financialPackageSettlementRelease.label",
    descriptionKey: "permissions.financialPackageSettlementRelease.description",
    risk: "critical",
    order: 42,
  },

  // Practitioner payouts
  {
    key: PermissionKey.PRACTITIONER_PAYOUTS_READ,
    module: "payouts",
    moduleLabelKey: "permissions.modules.payouts.title",
    labelKey: "permissions.practitionerPayoutsRead.label",
    descriptionKey: "permissions.practitionerPayoutsRead.description",
    risk: "critical",
    order: 50,
  },
  {
    key: PermissionKey.PRACTITIONER_PAYOUTS_WRITE,
    module: "payouts",
    moduleLabelKey: "permissions.modules.payouts.title",
    labelKey: "permissions.practitionerPayoutsWrite.label",
    descriptionKey: "permissions.practitionerPayoutsWrite.description",
    risk: "critical",
    order: 51,
  },
  {
    key: PermissionKey.PRACTITIONER_STATEMENTS_READ,
    module: "payouts",
    moduleLabelKey: "permissions.modules.payouts.title",
    labelKey: "permissions.practitionerStatementsRead.label",
    descriptionKey: "permissions.practitionerStatementsRead.description",
    risk: "sensitive",
    order: 52,
  },

  // Academy
  {
    key: PermissionKey.ACADEMY_ENROLLMENTS_CREATE_MANUAL,
    module: "academy",
    moduleLabelKey: "permissions.modules.academy.title",
    labelKey: "permissions.academyEnrollmentsCreateManual.label",
    descriptionKey: "permissions.academyEnrollmentsCreateManual.description",
    risk: "critical",
    order: 115,
  },

  // Refunds
  {
    key: PermissionKey.REFUNDS_APPROVE,
    module: "refunds",
    moduleLabelKey: "permissions.modules.refunds.title",
    labelKey: "permissions.refundsApprove.label",
    descriptionKey: "permissions.refundsApprove.description",
    risk: "critical",
    order: 60,
  },
  {
    key: PermissionKey.REFUNDS_RETRY,
    module: "refunds",
    moduleLabelKey: "permissions.modules.refunds.title",
    labelKey: "permissions.refundsRetry.label",
    descriptionKey: "permissions.refundsRetry.description",
    risk: "critical",
    order: 61,
  },

  // Sessions
  {
    key: PermissionKey.SESSIONS_READ_ADMIN,
    module: "sessions",
    moduleLabelKey: "permissions.modules.sessions.title",
    labelKey: "permissions.sessionsReadAdmin.label",
    descriptionKey: "permissions.sessionsReadAdmin.description",
    risk: "sensitive",
    order: 70,
  },
  {
    key: PermissionKey.SESSIONS_READ_SUPPORT_SUMMARY,
    module: "sessions",
    moduleLabelKey: "permissions.modules.sessions.title",
    labelKey: "permissions.sessionsReadSupportSummary.label",
    descriptionKey: "permissions.sessionsReadSupportSummary.description",
    risk: "normal",
    order: 71,
  },

  // Care chat
  {
    key: PermissionKey.CARE_CHAT_REQUEST_DECIDE,
    module: "careChat",
    moduleLabelKey: "permissions.modules.careChat.title",
    labelKey: "permissions.careChatRequestDecide.label",
    descriptionKey: "permissions.careChatRequestDecide.description",
    risk: "critical",
    order: 80,
  },
  {
    key: PermissionKey.CARE_CHAT_REQUEST_READ_ADMIN,
    module: "careChat",
    moduleLabelKey: "permissions.modules.careChat.title",
    labelKey: "permissions.careChatRequestReadAdmin.label",
    descriptionKey: "permissions.careChatRequestReadAdmin.description",
    risk: "sensitive",
    order: 81,
  },
  {
    key: PermissionKey.CARE_CHAT_CONVERSATION_READ_ADMIN,
    module: "careChat",
    moduleLabelKey: "permissions.modules.careChat.title",
    labelKey: "permissions.careChatConversationReadAdmin.label",
    descriptionKey: "permissions.careChatConversationReadAdmin.description",
    risk: "sensitive",
    order: 82,
  },

  // Patients
  {
    key: PermissionKey.PATIENTS_READ_ADMIN,
    module: "patients",
    moduleLabelKey: "permissions.modules.patients.title",
    labelKey: "permissions.patientsReadAdmin.label",
    descriptionKey: "permissions.patientsReadAdmin.description",
    risk: "sensitive",
    order: 90,
  },
  {
    key: PermissionKey.PATIENTS_SENSITIVE_READ,
    module: "patients",
    moduleLabelKey: "permissions.modules.patients.title",
    labelKey: "permissions.patientsSensitiveRead.label",
    descriptionKey: "permissions.patientsSensitiveRead.description",
    risk: "critical",
    order: 91,
  },

  // Support
  {
    key: PermissionKey.SUPPORT_TICKET_NOTE_INTERNAL,
    module: "support",
    moduleLabelKey: "permissions.modules.support.title",
    labelKey: "permissions.supportTicketNoteInternal.label",
    descriptionKey: "permissions.supportTicketNoteInternal.description",
    risk: "sensitive",
    order: 100,
  },
  {
    key: PermissionKey.SUPPORT_TICKET_ASSIGN,
    module: "support",
    moduleLabelKey: "permissions.modules.support.title",
    labelKey: "permissions.supportTicketAssign.label",
    descriptionKey: "permissions.supportTicketAssign.description",
    risk: "sensitive",
    order: 101,
  },

  // Practitioner applications
  {
    key: PermissionKey.PRACTITIONER_APPLICATIONS_READ,
    module: "practitionerApplications",
    moduleLabelKey: "permissions.modules.practitionerApplications.title",
    labelKey: "permissions.practitionerApplicationsRead.label",
    descriptionKey: "permissions.practitionerApplicationsRead.description",
    risk: "sensitive",
    order: 110,
  },
  {
    key: PermissionKey.PRACTITIONER_APPLICATIONS_APPROVE,
    module: "practitionerApplications",
    moduleLabelKey: "permissions.modules.practitionerApplications.title",
    labelKey: "permissions.practitionerApplicationsApprove.label",
    descriptionKey: "permissions.practitionerApplicationsApprove.description",
    risk: "critical",
    order: 111,
  },
  {
    key: PermissionKey.PRACTITIONER_APPLICATIONS_REJECT,
    module: "practitionerApplications",
    moduleLabelKey: "permissions.modules.practitionerApplications.title",
    labelKey: "permissions.practitionerApplicationsReject.label",
    descriptionKey: "permissions.practitionerApplicationsReject.description",
    risk: "critical",
    order: 112,
  },
  {
    key: PermissionKey.PRACTITIONER_APPLICATIONS_REQUEST_CHANGES,
    module: "practitionerApplications",
    moduleLabelKey: "permissions.modules.practitionerApplications.title",
    labelKey: "permissions.practitionerApplicationsRequestChanges.label",
    descriptionKey:
      "permissions.practitionerApplicationsRequestChanges.description",
    risk: "critical",
    order: 113,
  },

  // Audit
  {
    key: PermissionKey.AUDIT_LOG_READ,
    module: "audit",
    moduleLabelKey: "permissions.modules.audit.title",
    labelKey: "permissions.auditLogRead.label",
    descriptionKey: "permissions.auditLogRead.description",
    risk: "critical",
    order: 120,
  },

  // Notifications
  {
    key: PermissionKey.NOTIFICATION_OPS_READ,
    module: "notifications",
    moduleLabelKey: "permissions.modules.notifications.title",
    labelKey: "permissions.notificationOpsRead.label",
    descriptionKey: "permissions.notificationOpsRead.description",
    risk: "sensitive",
    order: 130,
  },

  // Legacy Admin domains
  {
    key: PermissionKey.ARTICLES_READ,
    module: "articles",
    moduleLabelKey: "permissions.modules.articles.title",
    labelKey: "permissions.articles.read.label",
    descriptionKey: "permissions.articles.read.description",
    risk: "sensitive",
    order: 140,
  },
  {
    key: PermissionKey.ARTICLES_MANAGE,
    module: "articles",
    moduleLabelKey: "permissions.modules.articles.title",
    labelKey: "permissions.articles.manage.label",
    descriptionKey: "permissions.articles.manage.description",
    risk: "critical",
    order: 141,
  },
  {
    key: PermissionKey.HELP_READ,
    module: "help",
    moduleLabelKey: "permissions.modules.help.title",
    labelKey: "permissions.help.read.label",
    descriptionKey: "permissions.help.read.description",
    risk: "normal",
    order: 150,
  },
  {
    key: PermissionKey.HELP_MANAGE,
    module: "help",
    moduleLabelKey: "permissions.modules.help.title",
    labelKey: "permissions.help.manage.label",
    descriptionKey: "permissions.help.manage.description",
    risk: "sensitive",
    order: 151,
  },
  {
    key: PermissionKey.REVIEWS_READ,
    module: "reviews",
    moduleLabelKey: "permissions.modules.reviews.title",
    labelKey: "permissions.reviews.read.label",
    descriptionKey: "permissions.reviews.read.description",
    risk: "sensitive",
    order: 160,
  },
  {
    key: PermissionKey.REVIEWS_MODERATE,
    module: "reviews",
    moduleLabelKey: "permissions.modules.reviews.title",
    labelKey: "permissions.reviews.moderate.label",
    descriptionKey: "permissions.reviews.moderate.description",
    risk: "critical",
    order: 161,
  },
  {
    key: PermissionKey.SPECIALTIES_READ,
    module: "specialties",
    moduleLabelKey: "permissions.modules.specialties.title",
    labelKey: "permissions.specialties.read.label",
    descriptionKey: "permissions.specialties.read.description",
    risk: "normal",
    order: 170,
  },
  {
    key: PermissionKey.SPECIALTIES_MANAGE,
    module: "specialties",
    moduleLabelKey: "permissions.modules.specialties.title",
    labelKey: "permissions.specialties.manage.label",
    descriptionKey: "permissions.specialties.manage.description",
    risk: "critical",
    order: 171,
  },
  {
    key: PermissionKey.PACKAGE_PLANS_READ,
    module: "packagePlans",
    moduleLabelKey: "permissions.modules.packagePlans.title",
    labelKey: "permissions.packagePlans.read.label",
    descriptionKey: "permissions.packagePlans.read.description",
    risk: "sensitive",
    order: 180,
  },
  {
    key: PermissionKey.PACKAGE_PLANS_MANAGE,
    module: "packagePlans",
    moduleLabelKey: "permissions.modules.packagePlans.title",
    labelKey: "permissions.packagePlans.manage.label",
    descriptionKey: "permissions.packagePlans.manage.description",
    risk: "critical",
    order: 181,
  },
  {
    key: PermissionKey.ASSESSMENTS_AUTHORING_READ,
    module: "assessmentAuthoring",
    moduleLabelKey: "permissions.modules.assessmentAuthoring.title",
    labelKey: "permissions.assessmentsAuthoring.read.label",
    descriptionKey: "permissions.assessmentsAuthoring.read.description",
    risk: "sensitive",
    order: 190,
  },
  {
    key: PermissionKey.ASSESSMENTS_AUTHORING_MANAGE,
    module: "assessmentAuthoring",
    moduleLabelKey: "permissions.modules.assessmentAuthoring.title",
    labelKey: "permissions.assessmentsAuthoring.manage.label",
    descriptionKey: "permissions.assessmentsAuthoring.manage.description",
    risk: "critical",
    order: 191,
  },
  {
    key: PermissionKey.CUSTOMER_WALLETS_READ,
    module: "customerWallets",
    moduleLabelKey: "permissions.modules.customerWallets.title",
    labelKey: "permissions.customerWallets.read.label",
    descriptionKey: "permissions.customerWallets.read.description",
    risk: "critical",
    order: 200,
  },
  {
    key: PermissionKey.COUPONS_MANAGE,
    module: "coupons",
    moduleLabelKey: "permissions.modules.coupons.title",
    labelKey: "permissions.coupons.manage.label",
    descriptionKey: "permissions.coupons.manage.description",
    risk: "critical",
    order: 210,
  },
];

export const ADMIN_PERMISSION_GROUP_ORDER = [
  "adminUsers",
  "finance",
  "settlements",
  "payouts",
  "academy",
  "refunds",
  "sessions",
  "careChat",
  "patients",
  "support",
  "practitionerApplications",
  "audit",
  "notifications",
  "articles",
  "help",
  "reviews",
  "specialties",
  "packagePlans",
  "assessmentAuthoring",
  "customerWallets",
  "coupons",
  "other",
] as const;

export function getPermissionCatalogByModule() {
  const groups = new Map<string, AdminPermissionCatalogItem[]>();

  for (const item of ADMIN_PERMISSION_CATALOG) {
    const list = groups.get(item.module) ?? [];
    list.push(item);
    groups.set(item.module, list);
  }

  for (const list of groups.values()) {
    list.sort((left, right) => left.order - right.order);
  }

  return groups;
}

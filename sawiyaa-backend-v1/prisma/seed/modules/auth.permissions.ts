import { UserRoleType } from '@prisma/client';

export const permissionDefinitions: Array<{
  key: string;
  description: string;
}> = [
  {
    key: 'configuration.view',
    description: 'View safe Admin platform settings metadata and values',
  },
  {
    key: 'configuration.edit.operational',
    description: 'Edit operational Admin platform settings',
  },
  {
    key: 'configuration.edit.financial',
    description: 'Authorize financial configuration workflows',
  },
  {
    key: 'configuration.history.view',
    description: 'View safe platform configuration change history',
  },
  {
    key: 'finance.events.read',
    description: 'Read finance operation events and diagnostics',
  },
  {
    key: 'finance.accounting.read',
    description:
      'Read accounting dashboard, ledger explorer, reconciliation overview and items',
  },
  {
    key: 'finance.accounting.write',
    description: 'Mutate accounting reconciliation review decisions',
  },
  {
    key: 'settlements.read',
    description: 'Read settlement batches, dues, and payout views',
  },
  {
    key: 'settlements.write',
    description: 'Mutate settlement state and record settlement payouts',
  },
  {
    key: 'financial.settlement.view',
    description: 'View accountant settlement queue and details',
  },
  {
    key: 'financial.settlement.review',
    description: 'Review and reject accountant settlements',
  },
  {
    key: 'financial.settlement.approve',
    description: 'Approve accountant settlements and credit wallets',
  },
  {
    key: 'financial.settlement.adjust',
    description: 'Add append-only settlement adjustments before approval',
  },
  {
    key: 'financial.payout.execute',
    description: 'Execute external payout preparation for credited settlements',
  },
  {
    key: 'practitioner-payouts.read',
    description: 'Read practitioner payout dues/history/details/proofs',
  },
  {
    key: 'practitioner-payouts.write',
    description: 'Create practitioner payouts and upload payout proofs',
  },
  {
    key: 'practitioner-statements.read',
    description: 'Read and export practitioner statement timelines',
  },
  {
    key: 'notification-ops.read',
    description: 'Read notification operations diagnostics',
  },
  {
    key: 'audit-log.read',
    description: 'Read administrative audit timeline and details',
  },
  {
    key: 'refunds.approve',
    description: 'Create and approve payment refund requests',
  },
  {
    key: 'refunds.retry',
    description: 'Retry failed payment refund requests',
  },
  {
    key: 'sessions.read.admin',
    description: 'Read session operational data in admin context',
  },
  {
    key: 'sessions.read.supportSummary',
    // RESERVED: This permission is intentionally seeded but no dedicated endpoint exists yet.
    // SUPPORT_AGENT is blocked from full admin session details (sessions.read.admin).
    // When a support-safe session summary endpoint is built, it must:
    //   - Require this permission (NOT sessions.read.admin)
    //   - Return only: id, status, scheduledStartAt/End, paymentStatus summary, cancellationState
    //   - Exclude: messages, notes, assessment results, clinical details, provider tokens, full ledger
    description:
      'Read minimal support-safe session summary for customer support operations',
  },
  {
    key: 'sessions.manualDecisions.write',
    description:
      'Create and supersede admin manual session decisions (ADMIN-only; SUPPORT_AGENT must not receive this permission)',
  },
  {
    key: 'careChat.request.decide',
    description: 'Approve, reject, or revoke care chat requests',
  },
  {
    key: 'careChat.request.read.admin',
    description: 'Read care-chat approval requests in admin/support context',
  },
  {
    key: 'careChat.conversation.read.admin',
    description: 'Read care-chat conversation threads in admin/support context',
  },
  {
    key: 'chat.conversations.read',
    description: 'Read session chat conversations in admin/support context',
  },
  {
    key: 'chat.conversations.moderate',
    description: 'Moderate session chat sending state in admin context',
  },
  {
    key: 'chat.attachments.read',
    description: 'Read session chat attachments in admin/support context',
  },
  {
    key: 'moderation.reports.view',
    description: 'View moderation report queue and report metadata',
  },
  {
    key: 'moderation.evidence.view',
    description: 'View moderation evidence including conversation content',
  },
  {
    key: 'moderation.actions.execute',
    description: 'Execute moderation investigation actions and decisions',
  },
  {
    key: 'moderation.enforcement.execute',
    description: 'Execute elevated moderation enforcement actions',
  },
  {
    key: 'patients.read.admin',
    description: 'Read patient profile list and basic details in back-office',
  },
  {
    key: 'patients.sensitive.read',
    description: 'Read sensitive patient data such as assessment submissions',
  },
  {
    key: 'patients.update.admin',
    description:
      'Update patient profile data in back-office (e.g. country change for pricing correction)',
  },
  {
    key: 'support.ticket.note.internal',
    description:
      'Add internal notes to support tickets (admin-only; not visible to reporters)',
  },
  {
    key: 'support.ticket.assign',
    description: 'Assign or reassign support tickets to admin/support users',
  },
  {
    key: 'practitionerApplications.read',
    description: 'Read practitioner application list and full review details',
  },
  {
    key: 'practitionerApplications.approve',
    description:
      'Approve practitioner applications, update draft data, and manage credentials during review',
  },
  {
    key: 'practitionerApplications.reject',
    description: 'Reject practitioner applications',
  },
  {
    key: 'practitionerApplications.requestChanges',
    description: 'Send applications back to practitioner for changes',
  },
  {
    key: 'admin-users.read',
    description: 'Read internal platform users (admin/staff accounts)',
  },
  {
    key: 'admin-users.create',
    description: 'Create internal platform users (admin/staff accounts)',
  },
  {
    key: 'admin-users.update',
    description: 'Update internal platform user profile basics',
  },
  {
    key: 'admin-users.status.update',
    description: 'Enable/disable/suspend internal platform users',
  },
  {
    key: 'admin-users.roles.update',
    description: 'Assign or remove roles for internal platform users',
  },
  {
    key: 'admin-users.permission-overrides.read',
    description: 'Read permission overrides for internal platform users',
  },
  {
    key: 'admin-users.permission-overrides.update',
    description: 'Update permission overrides for internal platform users',
  },
  {
    key: 'admin-users.sessions.revoke',
    description: 'Revoke internal platform user sessions (force logout)',
  },
  {
    key: 'admin-users.token-version.invalidate',
    description: 'Invalidate internal platform user tokens (bump tokenVersion)',
  },
  // Corporate Voucher Sponsorship
  {
    key: 'corporate.organizations.read',
    description: 'Read corporate organization list and details',
  },
  {
    key: 'corporate.organizations.manage',
    description: 'Create and update corporate organizations',
  },
  {
    key: 'corporate.contracts.manage',
    description: 'Create and update corporate contracts',
  },
  {
    key: 'corporate.plans.manage',
    description: 'Create and update corporate benefit plans',
  },
  {
    key: 'corporate.codes.generate',
    description: 'Generate corporate benefit code batches',
  },
  {
    key: 'corporate.codes.export',
    description: 'Export corporate benefit codes as CSV',
  },
  {
    key: 'corporate.codes.revoke',
    description: 'Revoke corporate benefit codes',
  },
  {
    key: 'corporate.reports.read',
    description: 'Read corporate usage and financial reports',
  },
  {
    key: 'corporate.ledger.read',
    description: 'Read corporate ledger entries',
  },
  {
    key: 'featured-practitioners.read',
    description: 'Read featured practitioners placements and history',
  },
  {
    key: 'featured-practitioners.manage',
    description: 'Create and manage featured practitioners placements',
  },
];

export const rolePermissionBundles: Array<{
  role: UserRoleType;
  permissions: string[];
}> = [
  {
    role: UserRoleType.SUPER_ADMIN,
    permissions: permissionDefinitions.map((permission) => permission.key),
  },
  {
    role: UserRoleType.ADMIN,
    // ADMIN retains broad back-office access, but permission override management remains SUPER_ADMIN-only by default.
    permissions: permissionDefinitions
      .map((permission) => permission.key)
      .filter(
        (key) =>
          key !== 'admin-users.permission-overrides.read' &&
          key !== 'admin-users.permission-overrides.update',
      ),
  },
  {
    role: UserRoleType.FINANCE_STAFF,
    permissions: [
      'configuration.view',
      'configuration.history.view',
      'configuration.edit.financial',
      'finance.events.read',
      'finance.accounting.read',
      'finance.accounting.write',
      'settlements.read',
      'settlements.write',
      'financial.settlement.view',
      'financial.settlement.review',
      'financial.settlement.approve',
      'financial.settlement.adjust',
      'financial.payout.execute',
      'practitioner-payouts.read',
      'practitioner-payouts.write',
      'practitioner-statements.read',
      'refunds.approve',
      'refunds.retry',
    ],
  },
  {
    role: UserRoleType.MARKETING_STAFF,
    permissions: [
      'configuration.view',
      'configuration.history.view',
      'notification-ops.read',
      'featured-practitioners.read',
      'featured-practitioners.manage',
    ],
  },
  {
    role: UserRoleType.PRACTITIONER_REVIEWER,
    permissions: [
      'audit-log.read',
      'practitionerApplications.read',
      'practitionerApplications.approve',
      'practitionerApplications.reject',
      'practitionerApplications.requestChanges',
    ],
  },
  {
    role: UserRoleType.PATIENT_OPERATIONS,
    permissions: [
      'configuration.view',
      'configuration.history.view',
      'notification-ops.read',
      'audit-log.read',
      'sessions.read.admin',
      'patients.read.admin',
      'patients.update.admin',
    ],
  },
  {
    role: UserRoleType.CONTENT_REVIEWER,
    permissions: [
      'audit-log.read',
      'moderation.reports.view',
      'moderation.evidence.view',
      'moderation.actions.execute',
      'moderation.enforcement.execute',
    ],
  },
  {
    role: UserRoleType.SUPPORT,
    permissions: [
      'sessions.read.supportSummary',
      'patients.read.admin',
      'careChat.request.read.admin',
      'careChat.conversation.read.admin',
      'chat.conversations.read',
      'chat.attachments.read',
      'moderation.reports.view',
      'moderation.evidence.view',
      'moderation.actions.execute',
      'moderation.enforcement.execute',
      'support.ticket.assign',
      'corporate.organizations.read',
      'corporate.reports.read',
    ],
  },
  {
    role: UserRoleType.PATIENT,
    permissions: [],
  },
  {
    role: UserRoleType.PRACTITIONER,
    permissions: [],
  },
];

import { Injectable } from '@nestjs/common';

export const PACKAGE_RESERVED_SESSION_STATUSES = new Set([
  'PENDING_PAYMENT',
  'PENDING_PRACTITIONER_CONFIRMATION',
  'UPCOMING',
  'READY_TO_JOIN',
  'IN_PROGRESS',
  'AWAITING_COMPLETION_CONFIRMATION',
  'AWAITING_ADMIN_RESOLUTION',
]);

/**
 * A package unit is economically consumed only by a completed Session or an
 * explicit COUNT_AS_USED entitlement decision.  Terminal/no-show outcomes
 * remain historical Session rows, but do not consume the package unless the
 * canonical outcome policy explicitly says so.
 */
export const PACKAGE_CONSUMED_SESSION_STATUSES = new Set(['COMPLETED']);

export type PackageEntitlementSession = {
  status: string;
  packageEntitlementDecision?: { decisionType: string } | null;
};

export type PackageEntitlementSummary = {
  totalSessions: number;
  consumedSessions: number;
  completedSessions: number;
  reservedSessions: number;
  availableSessions: number;
};

/**
 * The single package entitlement projection. A linked canonical Session is
 * the reservation; only an explicit RESTORE_TO_PACKAGE decision releases it.
 */
@Injectable()
export class PackageEntitlementService {
  summarize(
    totalSessions: number,
    sessions: PackageEntitlementSession[],
  ): PackageEntitlementSummary {
    const consumedSessions = sessions.filter((session) => {
      if (session.packageEntitlementDecision?.decisionType === 'RESTORE_TO_PACKAGE') {
        return false;
      }
      return (
        PACKAGE_CONSUMED_SESSION_STATUSES.has(session.status) ||
        session.packageEntitlementDecision?.decisionType === 'COUNT_AS_USED'
      );
    }).length;
    const reservedSessions = sessions.filter((session) =>
      PACKAGE_RESERVED_SESSION_STATUSES.has(session.status),
    ).length;
    const boundedConsumed = Math.min(totalSessions, consumedSessions);
    const availableSessions = Math.max(
      0,
      totalSessions - boundedConsumed - reservedSessions,
    );

    return {
      totalSessions,
      consumedSessions: boundedConsumed,
      // Preserve the existing API's completedSessions compatibility meaning:
      // it represents sessions used/consumed by the package.
      completedSessions: boundedConsumed,
      reservedSessions,
      availableSessions,
    };
  }
}

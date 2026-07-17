import { SecurityAuditOutcome } from '@prisma/client';
export const SecurityAuditActorType = {
  USER: 'USER',
  SYSTEM: 'SYSTEM',
  SCHEDULED_JOB: 'SCHEDULED_JOB',
  PAYMENT_WEBHOOK: 'PAYMENT_WEBHOOK',
  MIGRATION: 'MIGRATION',
  SEED_QA: 'SEED_QA',
} as const;

export type SecurityAuditActorType =
  (typeof SecurityAuditActorType)[keyof typeof SecurityAuditActorType];

export enum SecurityAuditSource {
  HTTP_REQUEST = 'HTTP_REQUEST',
  SYSTEM = 'SYSTEM',
  SCHEDULED_JOB = 'SCHEDULED_JOB',
  PAYMENT_WEBHOOK = 'PAYMENT_WEBHOOK',
  MIGRATION = 'MIGRATION',
  SEED_QA = 'SEED_QA',
}

export interface AuditActorContext {
  actorType?: SecurityAuditActorType;
  actorUserId?: string | null;
  actorRoles?: string[];
  source?: SecurityAuditSource | string | null;
  requestId?: string | null;
  correlationId?: string | null;
}

export interface SecurityAuditEntry extends AuditActorContext {
  action: string;
  outcome: SecurityAuditOutcome;
  resourceType?: string | null;
  resourceId?: string | null;
  targetUserId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}

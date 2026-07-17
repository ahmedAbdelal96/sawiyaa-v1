import { SessionStatus } from '@prisma/client';

export const BLOCKING_SESSION_STATUSES: SessionStatus[] = [
  SessionStatus.PENDING_PRACTITIONER_CONFIRMATION,
  SessionStatus.UPCOMING,
  SessionStatus.UPCOMING,
  SessionStatus.READY_TO_JOIN,
  SessionStatus.IN_PROGRESS,
];
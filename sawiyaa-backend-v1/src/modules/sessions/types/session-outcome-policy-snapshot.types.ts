import type { Prisma } from '@prisma/client';

export const SESSION_OUTCOME_POLICY_VERSION = 1;

export type SessionOutcomePolicySnapshotInput = {
  version: number;
  completionOverlapPercent: number;
  minimumOverlapMinutes: number;
  patientNoShowGraceMinutes: number;
  practitionerNoShowGraceMinutes: number;
  finalizationGraceMinutes: number;
  lateEvidenceWaitingMinutes: number;
  capturedAt: Date;
  source: string;
};

export type SessionOutcomePolicySnapshotCreateData = Omit<
  Prisma.SessionOutcomePolicySnapshotUncheckedCreateInput,
  'id' | 'sessionId'
>;

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { resolveCurrentSessionOutcomePolicy } from '../config/session-outcome-policy.config';
import type { SessionOutcomePolicySnapshotInput } from '../types/session-outcome-policy-snapshot.types';

@Injectable()
export class SessionOutcomePolicySnapshotService {
  constructor(private readonly prisma: PrismaService) {}

  async captureForUpcoming(
    sessionId: string,
    tx: Prisma.TransactionClient,
    capturedAt = new Date(),
  ) {
    const policy = resolveCurrentSessionOutcomePolicy(capturedAt);
    return tx.sessionOutcomePolicySnapshot.upsert({
      where: { sessionId },
      create: { sessionId, ...policy },
      // An existing snapshot is historical evidence and must never be rewritten.
      update: {},
    });
  }

  async getForSession(sessionId: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).sessionOutcomePolicySnapshot.findUnique({
      where: { sessionId },
    });
  }

  toEvaluationPolicy(
    snapshot:
      | SessionOutcomePolicySnapshotInput
      | {
          version: number;
          completionOverlapPercent: number;
          minimumOverlapMinutes: number;
          patientNoShowGraceMinutes: number;
          practitionerNoShowGraceMinutes: number;
          finalizationGraceMinutes: number;
          lateEvidenceWaitingMinutes: number;
        },
  ) {
    return {
      completionOverlapPercent: snapshot.completionOverlapPercent,
      minimumOverlapMinutes: snapshot.minimumOverlapMinutes,
      patientNoShowGraceMinutes: snapshot.patientNoShowGraceMinutes,
      practitionerNoShowGraceMinutes: snapshot.practitionerNoShowGraceMinutes,
      finalizationGraceMinutes: snapshot.finalizationGraceMinutes,
      lateEvidenceWaitingMinutes: snapshot.lateEvidenceWaitingMinutes,
    };
  }
}

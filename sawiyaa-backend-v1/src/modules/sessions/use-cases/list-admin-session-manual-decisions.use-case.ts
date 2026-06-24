import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SessionRepository } from '../repositories/session.repository';
import type { AdminSessionManualDecisionItemDto } from '../dto/admin-session-manual-decision-response.dto';

type DecisionWithUser = Prisma.SessionAdminDecisionGetPayload<{
  include: { adminUser: { select: { id: true; displayName: true } } };
}>;

@Injectable()
export class ListAdminSessionManualDecisionsUseCase {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async execute(input: {
    sessionId: string;
  }): Promise<{ items: AdminSessionManualDecisionItemDto[]; totalCount: number }> {
    // Verify session exists
    const session = await this.sessionRepository.findById(input.sessionId);
    if (!session) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.sessionNotFound',
        error: 'SESSION_NOT_FOUND',
      });
    }

    const decisions = await this.sessionRepository.listSessionAdminDecisionsBySessionId(
      input.sessionId,
    );

    return {
      items: decisions.map((d) => this.toResponseDto(d)),
      totalCount: decisions.length,
    };
  }

  private toResponseDto(decision: DecisionWithUser): AdminSessionManualDecisionItemDto {
    return {
      id: decision.id,
      sessionId: decision.sessionId,
      decisionType: decision.decisionType,
      previousSessionStatus: decision.previousSessionStatus,
      nextSessionStatus: decision.nextSessionStatus,
      isFinal: decision.isFinal,
      supersedesDecisionId: decision.supersedesDecisionId,
      reasonCode: decision.reasonCode,
      adminNote: decision.adminNote,
      decidedBy: {
        userId: decision.adminUser.id,
        displayName: decision.adminUser.displayName,
      },
      createdAt: decision.createdAt.toISOString(),
      recommendedOutcomeSnapshot: (decision.recommendedOutcomeSnapshot as Record<string, unknown>) ?? null,
      attendanceSummarySnapshot: (decision.attendanceSummarySnapshot as Record<string, unknown>) ?? null,
      evidenceTimelineSnapshot: (decision.evidenceTimelineSnapshot as Record<string, unknown>) ?? null,
    };
  }
}

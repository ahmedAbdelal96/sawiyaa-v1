import { Injectable } from '@nestjs/common';
import { UserSessionRepository } from '../repositories/user-session.repository';

export type StepUpStatus =
  | { ok: true; expiresAt: Date }
  | {
      ok: false;
      reason: 'SESSION_INVALID' | 'NOT_VERIFIED' | 'EXPIRED';
      expiresAt?: Date | null;
    };

@Injectable()
export class StepUpService {
  constructor(private readonly userSessionRepository: UserSessionRepository) {}

  async checkSessionStepUpStatus(input: {
    userId: string;
    sessionId: string;
  }): Promise<StepUpStatus> {
    const session = await this.userSessionRepository.findStepUpStateById(
      input.sessionId,
    );

    if (!session || session.revokedAt) {
      return { ok: false, reason: 'SESSION_INVALID' };
    }

    if (session.userId !== input.userId) {
      return { ok: false, reason: 'SESSION_INVALID' };
    }

    if (!session.stepUpExpiresAt) {
      return { ok: false, reason: 'NOT_VERIFIED', expiresAt: null };
    }

    const now = Date.now();
    const expiresAt = session.stepUpExpiresAt;
    if (expiresAt.getTime() <= now) {
      return { ok: false, reason: 'EXPIRED', expiresAt };
    }

    return { ok: true, expiresAt };
  }

  async markSessionStepUpVerified(input: {
    sessionId: string;
    verifiedAt: Date;
    expiresAt: Date;
  }): Promise<void> {
    await this.userSessionRepository.updateRefreshSession(input.sessionId, {
      stepUpVerifiedAt: input.verifiedAt,
      stepUpExpiresAt: input.expiresAt,
    });
  }

  async clearSessionStepUp(input: { sessionId: string }): Promise<void> {
    await this.userSessionRepository.updateRefreshSession(input.sessionId, {
      stepUpVerifiedAt: null,
      stepUpExpiresAt: null,
    });
  }
}

import { Injectable } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { ParticipantSessionOutcomeBoundaryService } from './participant-session-outcome-boundary.service';
import { ValidateSessionStatusTransitionService } from './validate-session-status-transition.service';

/** Read-time guidance only; command use cases re-evaluate under transaction. */
@Injectable()
export class ResolvePractitionerSessionCommandActionsService {
  constructor(
    private readonly transitions: ValidateSessionStatusTransitionService,
    private readonly participantOutcomeBoundary: ParticipantSessionOutcomeBoundaryService,
  ) {}

  async resolve(input: {
    session: { id: string; status: SessionStatus; scheduledStartAt: Date | null };
    now: Date;
  }): Promise<{
    canComplete: boolean;
    canMarkPatientNoShow: boolean;
    noShowReasonCode: string | null;
  }> {
    const canComplete = this.transitions.canTransition(
      input.session.status,
      SessionStatus.COMPLETED,
    );
    const noShow = await this.participantOutcomeBoundary.decidePatientNoShow({
      session: input.session,
      now: input.now,
    });
    return {
      canComplete,
      canMarkPatientNoShow: noShow.kind === 'ALLOW',
      noShowReasonCode:
        noShow.kind === 'ALLOW' ? null : noShow.kind === 'REJECT' ? noShow.error : noShow.reason,
    };
  }
}

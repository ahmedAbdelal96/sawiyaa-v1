import { Injectable } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { ParticipantSessionOutcomeBoundaryService } from './participant-session-outcome-boundary.service';

/** Read-time guidance only; command use cases re-evaluate under transaction. */
@Injectable()
export class ResolvePractitionerSessionCommandActionsService {
  constructor(
    private readonly participantOutcomeBoundary: ParticipantSessionOutcomeBoundaryService,
  ) {}

  async resolve(input: {
    session: { id: string; status: SessionStatus; scheduledStartAt: Date | null };
    now: Date;
  }): Promise<{
    canMarkPatientNoShow: boolean;
    noShowReasonCode: string | null;
  }> {
    const noShow = await this.participantOutcomeBoundary.decidePatientNoShow({
      session: input.session,
      now: input.now,
    });
    return {
      canMarkPatientNoShow: noShow.kind === 'ALLOW',
      noShowReasonCode:
        noShow.kind === 'ALLOW' ? null : noShow.kind === 'REJECT' ? noShow.error : noShow.reason,
    };
  }
}

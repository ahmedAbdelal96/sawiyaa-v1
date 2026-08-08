import { Injectable } from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { PrismaService } from '@common/prisma/prisma.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { buildSessionJoinAvailabilityViewModel } from '../utils/session-join-policy.util';
import { SessionSchedulePolicyService } from '@modules/config/services/session-schedule-policy.service';
import { SessionOperationalInterpreterService } from '../services/session-operational-interpreter.service';
import { buildOperationalNextSessionCandidateWhere } from '../utils/session-operational-candidate-predicates.util';

@Injectable()
export class GetMyNextSessionUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionSchedulePolicyService: SessionSchedulePolicyService,
    private readonly operationalInterpreter: SessionOperationalInterpreterService,
  ) {}

  async execute(input: {
    currentUser: AuthenticatedUser;
    locale: SupportedLocale;
  }) {
    const role = input.currentUser.roles.includes(AppRole.PATIENT)
      ? AppRole.PATIENT
      : input.currentUser.roles.includes(AppRole.PRACTITIONER)
        ? AppRole.PRACTITIONER
        : null;

    if (!role) {
      return null;
    }

    const now = new Date();
    const session = await this.prisma.session.findFirst({
      where: {
        ...(role === AppRole.PATIENT
          ? { patient: { userId: input.currentUser.id } }
          : { practitioner: { userId: input.currentUser.id } }),
        ...buildOperationalNextSessionCandidateWhere(now),
      },
      orderBy: [{ scheduledStartAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        patientId: true,
        practitionerId: true,
        status: true,
        flowType: true,
        sessionMode: true,
        durationMinutes: true,
        scheduledStartAt: true,
        scheduledEndAt: true,
        joinCloseAt: true,
        joinOpenAt: true,
        expiresAt: true,
        scheduleRevision: true,
        schedulePolicySnapshotJson: true,
        timezoneSnapshot: true,
        provider: true,
        providerRoomId: true,
        providerSessionRef: true,
        videoRoomClosedAt: true,
        originalSessionId: true,
        patient: { select: { user: { select: { displayName: true } } } },
        practitioner: {
          select: {
            user: { select: { displayName: true } },
            avatarUrl: true,
          },
        },
      },
    });

    if (!session || !session.scheduledStartAt || !session.scheduledEndAt) {
      return null;
    }

    const schedulePolicy =
      this.sessionSchedulePolicyService.parseSnapshot(
        session.schedulePolicySnapshotJson,
      ) ??
      this.sessionSchedulePolicyService.withScheduleRevision(
        await this.sessionSchedulePolicyService.resolve(),
        session.scheduleRevision,
      );

    const joinAvailability = buildSessionJoinAvailabilityViewModel({
      status: session.status,
      sessionMode: session.sessionMode,
      scheduledStartAt: session.scheduledStartAt,
      scheduledEndAt: session.scheduledEndAt,
      provider: session.provider,
      providerRoomId: session.providerRoomId,
      providerSessionRef: session.providerSessionRef,
      videoRoomClosedAt: session.videoRoomClosedAt,
      joinEarlyMinutes: schedulePolicy.join.joinEarlyMinutes,
      joinAfterEndGraceMinutes: schedulePolicy.join.joinAfterEndGraceMinutes,
      now,
    });
    const operational = await this.operationalInterpreter.interpret({
      session,
      actor: role === AppRole.PATIENT ? 'PATIENT' : 'PRACTITIONER',
      now,
    });
    const counterpart =
      role === AppRole.PATIENT
        ? {
            displayName: session.practitioner.user.displayName,
            avatarUrl: session.practitioner.avatarUrl ?? null,
          }
        : {
            displayName: session.patient.user.displayName,
            avatarUrl: null,
          };
    const rolePath = role === AppRole.PATIENT ? 'patient' : 'practitioner';

    return {
      sessionId: session.id,
      role,
      counterpart,
      startsAt: session.scheduledStartAt.toISOString(),
      scheduledEndAt: session.scheduledEndAt.toISOString(),
      durationMinutes: session.durationMinutes,
      displayTimezone: session.timezoneSnapshot ?? 'UTC',
      status: session.status,
      operational,
      joinAvailable: joinAvailability.canJoin,
      joinAvailableAt: joinAvailability.availableAt,
      joinExpiresAt: joinAvailability.expiresAt,
      countdownReferenceTime: now.toISOString(),
      detailsRoute: `/${input.locale}/${rolePath}/sessions/${session.id}`,
      joinRoute: `/${input.locale}/${rolePath}/sessions/${session.id}/join`,
      isReplacement: Boolean(session.originalSessionId),
      statusReasonCode: joinAvailability.blockedReason,
    };
  }
}

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionEventType, SessionProvider, SessionStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { ValidateSessionStatusTransitionService } from '../services/validate-session-status-transition.service';
import { SessionPatientRepository } from '../repositories/session-patient.repository';
import { SessionPractitionerRepository } from '../repositories/session-practitioner.repository';
import { SessionRepository } from '../repositories/session.repository';
import { ResolveSessionJoinReadinessService } from '../services/resolve-session-join-readiness.service';
import { SessionVideoProviderRegistryService } from '../services/session-video-provider-registry.service';
import { PrepareSessionRuntimeUseCase } from './prepare-session-runtime.use-case';

@Injectable()
export class ResolveSessionJoinContractUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionRepository: SessionRepository,
    private readonly sessionPatientRepository: SessionPatientRepository,
    private readonly sessionPractitionerRepository: SessionPractitionerRepository,
    private readonly resolveSessionJoinReadinessService: ResolveSessionJoinReadinessService,
    private readonly sessionVideoProviderRegistryService: SessionVideoProviderRegistryService,
    private readonly validateSessionStatusTransitionService: ValidateSessionStatusTransitionService,
    private readonly prepareSessionRuntimeUseCase: PrepareSessionRuntimeUseCase,
  ) {}

  async execute(input: {
    userId: string;
    actorType: 'PATIENT' | 'PRACTITIONER';
    sessionId: string;
  }) {
    const session = await this.sessionRepository.findById(input.sessionId);

    if (!session) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.sessionNotFound',
        error: 'SESSION_NOT_FOUND',
      });
    }

    await this.assertOwnership({
      userId: input.userId,
      actorType: input.actorType,
      session,
    });

    let effectiveSession = session;
    let readiness = this.resolveSessionJoinReadinessService.resolve({
      status: effectiveSession.status,
      sessionMode: effectiveSession.sessionMode,
      scheduledStartAt: effectiveSession.scheduledStartAt,
      scheduledEndAt: effectiveSession.scheduledEndAt,
      provider: effectiveSession.provider,
      providerRoomId: effectiveSession.providerRoomId,
      providerSessionRef: effectiveSession.providerSessionRef,
      now: new Date(),
    });

    if (
      readiness.canPrepareRuntime &&
      readiness.blockedReason === 'SESSION_RUNTIME_NOT_PREPARED'
    ) {
      await this.prepareSessionRuntimeUseCase.execute({
        userId: input.userId,
        actorType: input.actorType,
        sessionId: input.sessionId,
      });
      const refreshed = await this.sessionRepository.findById(input.sessionId);
      if (refreshed) {
        effectiveSession = refreshed;
      }
      readiness = this.resolveSessionJoinReadinessService.resolve({
        status: effectiveSession.status,
        sessionMode: effectiveSession.sessionMode,
        scheduledStartAt: effectiveSession.scheduledStartAt,
        scheduledEndAt: effectiveSession.scheduledEndAt,
        provider: effectiveSession.provider,
        providerRoomId: effectiveSession.providerRoomId,
        providerSessionRef: effectiveSession.providerSessionRef,
        now: new Date(),
      });
    }

    if (!readiness.canJoin) {
      return {
        item: {
          sessionId: effectiveSession.id,
          status: effectiveSession.status,
          provider: effectiveSession.provider,
          canJoin: false,
          blockedReason: readiness.blockedReason,
          roomName: effectiveSession.providerRoomId,
          roomUrl: effectiveSession.providerSessionRef,
          joinToken: null,
        },
      };
    }

    const adapter = this.sessionVideoProviderRegistryService.get(SessionProvider.DAILY);
    const join = await adapter.createJoinToken({
      roomName: effectiveSession.providerRoomId!,
      userId: input.userId,
      actorType: input.actorType,
      displayName:
        input.actorType === 'PATIENT'
          ? effectiveSession.patient.user.displayName
          : effectiveSession.practitioner.user.displayName,
    });

    const promotableToReadyStatuses: SessionStatus[] = [
      SessionStatus.CONFIRMED,
      SessionStatus.UPCOMING,
    ];
    if (promotableToReadyStatuses.includes(effectiveSession.status)) {
      this.validateSessionStatusTransitionService.assertCanTransition(
        effectiveSession.status,
        SessionStatus.READY_TO_JOIN,
      );

      await this.prisma.$transaction(async (tx) => {
        await this.sessionRepository.updateStatus(
          effectiveSession.id,
          {
            status: SessionStatus.READY_TO_JOIN,
          },
          tx,
        );
        await this.sessionRepository.createEvent(
          {
            sessionId: effectiveSession.id,
            eventType: SessionEventType.SESSION_READY_TO_JOIN,
            actorUserId: input.userId,
          },
          tx,
        );
      });

      effectiveSession = (await this.sessionRepository.findById(input.sessionId))!;
    }

    return {
      item: {
        sessionId: effectiveSession.id,
        status: effectiveSession.status,
        provider: effectiveSession.provider,
        canJoin: true,
        blockedReason: null,
        roomName: effectiveSession.providerRoomId,
        roomUrl: effectiveSession.providerSessionRef,
        joinToken: join.token,
      },
    };
  }

  private async assertOwnership(input: {
    userId: string;
    actorType: 'PATIENT' | 'PRACTITIONER';
    session: Awaited<ReturnType<SessionRepository['findById']>>;
  }) {
    if (!input.session) {
      return;
    }

    if (input.actorType === 'PATIENT') {
      const patient = await this.sessionPatientRepository.findByUserId(input.userId);
      if (!patient) {
        throw new NotFoundException({
          messageKey: 'sessions.errors.patientNotFound',
          error: 'SESSION_PATIENT_NOT_FOUND',
        });
      }
      if (input.session.patient.id !== patient.id) {
        throw new ForbiddenException({
          messageKey: 'sessions.errors.sessionAccessDenied',
          error: 'SESSION_ACCESS_DENIED',
        });
      }
      return;
    }

    const practitioner =
      await this.sessionPractitionerRepository.findByUserId(input.userId);
    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.practitionerNotFound',
        error: 'SESSION_PRACTITIONER_NOT_FOUND',
      });
    }
    if (input.session.practitioner.id !== practitioner.id) {
      throw new ForbiddenException({
        messageKey: 'sessions.errors.sessionAccessDenied',
        error: 'SESSION_ACCESS_DENIED',
      });
    }
  }
}

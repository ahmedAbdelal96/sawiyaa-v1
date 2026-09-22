import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionEventType, SessionMode, SessionProvider } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionPatientRepository } from '../repositories/session-patient.repository';
import { SessionPractitionerRepository } from '../repositories/session-practitioner.repository';
import { SessionRepository } from '../repositories/session.repository';
import { SessionAccessPolicy } from '../policies/session-access.policy';
import { SessionVideoProviderRegistryService } from '../services/session-video-provider-registry.service';
import { SessionVideoProviderResolverService } from '../services/session-video-provider-resolver.service';
import { ResolveSessionJoinReadinessService } from '../services/resolve-session-join-readiness.service';
import {
  SecurityAuditActorType,
  SecurityAuditSource,
} from '@common/security-audit/security-audit.types';

@Injectable()
export class PrepareSessionRuntimeUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionRepository: SessionRepository,
    private readonly sessionPatientRepository: SessionPatientRepository,
    private readonly sessionPractitionerRepository: SessionPractitionerRepository,
    private readonly sessionVideoProviderRegistryService: SessionVideoProviderRegistryService,
    private readonly sessionVideoProviderResolverService: SessionVideoProviderResolverService,
    private readonly resolveSessionJoinReadinessService: ResolveSessionJoinReadinessService,
    private readonly sessionAccessPolicy: SessionAccessPolicy,
  ) {}

  async execute(input: {
    userId: string;
    sessionId: string;
    actorType: 'PATIENT' | 'PRACTITIONER';
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
    const latestDecision =
      await this.sessionRepository.findLatestActiveSessionAdminDecision(
        session.id,
      );

    if (session.sessionMode !== SessionMode.VIDEO) {
      throw new BadRequestException({
        messageKey: 'sessions.errors.runtimeOnlyForVideoMode',
        error: 'SESSION_RUNTIME_ONLY_FOR_VIDEO_MODE',
      });
    }

    const readiness = this.resolveSessionJoinReadinessService.resolve({
      status: session.status,
      sessionMode: session.sessionMode,
      scheduledStartAt: session.scheduledStartAt,
      scheduledEndAt: session.scheduledEndAt,
      joinOpenAt: session.joinOpenAt,
      joinCloseAt: session.joinCloseAt,
      provider: session.provider,
      providerRoomId: session.providerRoomId,
      providerSessionRef: session.providerSessionRef,
      videoRoomClosedAt: session.videoRoomClosedAt,
      finalManualDecision: latestDecision?.decisionType ?? null,
      now: new Date(),
    });

    if (!readiness.canPrepareRuntime) {
      throw new ConflictException({
        messageKey: 'sessions.errors.runtimePreparationNotAllowed',
        error: 'SESSION_RUNTIME_PREPARATION_NOT_ALLOWED',
        messageParams: {
          reason: readiness.blockedReason,
        },
      });
    }

    if (
      session.provider !== SessionProvider.NONE &&
      session.providerRoomId &&
      session.providerSessionRef
    ) {
      return {
        item: {
          provider: session.provider,
          roomName: session.providerRoomId,
          roomUrl: session.providerSessionRef,
          isPrepared: true,
          providerRuntime: this.buildProviderRuntime({
            provider: session.provider,
            roomId: session.providerRoomId,
            roomUrl: session.providerSessionRef,
          }),
        },
      };
    }

    if (!session.scheduledStartAt || !session.scheduledEndAt) {
      throw new BadRequestException({
        messageKey: 'sessions.errors.sessionScheduleMissing',
        error: 'SESSION_SCHEDULE_MISSING',
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.sessionRepository.lockRuntimePreparation(session.id, tx);
      const current = await this.sessionRepository.findById(session.id, tx);
      if (!current) {
        throw new NotFoundException({
          messageKey: 'sessions.errors.sessionNotFound',
          error: 'SESSION_NOT_FOUND',
        });
      }
      const currentDecision =
        await this.sessionRepository.findLatestActiveSessionAdminDecision(
          current.id,
          tx,
        );
      const currentReadiness = this.resolveSessionJoinReadinessService.resolve({
        status: current.status,
        sessionMode: current.sessionMode,
        scheduledStartAt: current.scheduledStartAt,
        scheduledEndAt: current.scheduledEndAt,
        joinOpenAt: current.joinOpenAt,
        joinCloseAt: current.joinCloseAt,
        provider: current.provider,
        providerRoomId: current.providerRoomId,
        providerSessionRef: current.providerSessionRef,
        videoRoomClosedAt: current.videoRoomClosedAt,
        finalManualDecision: currentDecision?.decisionType ?? null,
        now: new Date(),
      });
      if (!currentReadiness.canPrepareRuntime) {
        throw new ConflictException({
          messageKey: 'sessions.errors.runtimePreparationNotAllowed',
          error: 'SESSION_RUNTIME_PREPARATION_NOT_ALLOWED',
          messageParams: { reason: currentReadiness.blockedReason },
        });
      }
      if (
        current.provider !== SessionProvider.NONE &&
        current.providerRoomId &&
        current.providerSessionRef
      ) {
        return current;
      }
      if (!current.scheduledStartAt || !current.scheduledEndAt) {
        throw new BadRequestException({
          messageKey: 'sessions.errors.sessionScheduleMissing',
          error: 'SESSION_SCHEDULE_MISSING',
        });
      }

      const resolvedProvider =
        this.sessionVideoProviderResolverService.resolvePreparedProviderForSession(
          current,
        );
      const adapter = this.sessionVideoProviderRegistryService.get(resolvedProvider);
      const room = await adapter.createRoom({
        sessionId: current.id,
        startsAt: current.scheduledStartAt,
        endsAt: current.scheduledEndAt,
      });
      const roomId = room.roomId || room.roomName;
      const updateResult = await this.sessionRepository.updateRuntimeIfMissing(
        current.id,
        {
          provider: resolvedProvider,
          providerRoomId: roomId,
          providerSessionRef: room.roomUrl,
        },
        tx,
      );

      const persisted = await this.sessionRepository.findById(current.id, tx);
      if (!persisted) {
        throw new NotFoundException({
          messageKey: 'sessions.errors.sessionNotFound',
          error: 'SESSION_NOT_FOUND',
        });
      }

      if (updateResult.count > 0) {
        await this.sessionRepository.createEvent(
          {
            sessionId: current.id,
            eventType: SessionEventType.PROVIDER_ROOM_CREATED,
            actorType: input.userId
              ? SecurityAuditActorType.USER
              : SecurityAuditActorType.SYSTEM,
            actorUserId: input.userId,
            source: input.userId
              ? SecurityAuditSource.HTTP_REQUEST
              : SecurityAuditSource.SYSTEM,
            occurredAt: new Date(),
            metadataJson: {
              provider: resolvedProvider,
              providerRoomId: roomId,
              providerRoomUrl: room.roomUrl,
              roomName: room.roomName ?? roomId,
            },
          },
          tx,
        );
      }

      return persisted;
    });

    return {
      item: {
        provider: updated.provider,
        roomName: updated.providerRoomId,
        roomUrl: updated.providerSessionRef,
        isPrepared: Boolean(
          updated.providerRoomId && updated.providerSessionRef,
        ),
        providerRuntime: this.buildProviderRuntime({
          provider: updated.provider,
          roomId: updated.providerRoomId,
          roomUrl: updated.providerSessionRef,
        }),
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
      const patient = await this.sessionPatientRepository.findByUserId(
        input.userId,
      );
      if (!patient) {
        throw new NotFoundException({
          messageKey: 'sessions.errors.patientNotFound',
          error: 'SESSION_PATIENT_NOT_FOUND',
        });
      }

      if (input.session.patient.id !== patient.id) {
        this.sessionAccessPolicy.assertPatientOwner({
          sessionPatientId: input.session.patient.id,
          requesterPatientId: patient.id,
        });
      }
      return;
    }

    const practitioner = await this.sessionPractitionerRepository.findByUserId(
      input.userId,
    );
    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.practitionerNotFound',
        error: 'SESSION_PRACTITIONER_NOT_FOUND',
      });
    }

    if (input.session.practitioner.id !== practitioner.id) {
      this.sessionAccessPolicy.assertPractitionerOwner({
        sessionPractitionerId: input.session.practitioner.id,
        requesterPractitionerId: practitioner.id,
      });
    }
  }

  private buildProviderRuntime(input: {
    provider: SessionProvider;
    roomId: string | null;
    roomUrl: string | null;
  }) {
    return {
      name: input.provider,
      roomId: input.roomId,
      roomUrl: input.roomUrl,
      token: null,
      tokenExpiresAt: null,
      joinMode: null,
      payload: {},
    };
  }
}

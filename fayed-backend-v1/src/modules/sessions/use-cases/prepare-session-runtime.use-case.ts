import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionEventType, SessionMode, SessionProvider } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionPatientRepository } from '../repositories/session-patient.repository';
import { SessionPractitionerRepository } from '../repositories/session-practitioner.repository';
import { SessionRepository } from '../repositories/session.repository';
import { SessionVideoProviderRegistryService } from '../services/session-video-provider-registry.service';
import { SessionVideoProviderResolverService } from '../services/session-video-provider-resolver.service';
import { ResolveSessionJoinReadinessService } from '../services/resolve-session-join-readiness.service';

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
      provider: session.provider,
      providerRoomId: session.providerRoomId,
      providerSessionRef: session.providerSessionRef,
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

    const resolvedProvider =
      this.sessionVideoProviderResolverService.resolvePreparedProviderForSession(
        session,
      );
    const adapter =
      this.sessionVideoProviderRegistryService.get(resolvedProvider);
    const room = await adapter.createRoom({
      sessionId: session.id,
      startsAt: session.scheduledStartAt,
      endsAt: session.scheduledEndAt,
    });
    const roomId = room.roomId || room.roomName;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updateResult = await this.sessionRepository.updateRuntimeIfMissing(
        session.id,
        {
          provider: resolvedProvider,
          providerRoomId: roomId,
          providerSessionRef: room.roomUrl,
        },
        tx,
      );

      const persisted = await this.sessionRepository.findById(session.id, tx);
      if (!persisted) {
        throw new NotFoundException({
          messageKey: 'sessions.errors.sessionNotFound',
          error: 'SESSION_NOT_FOUND',
        });
      }

      if (updateResult.count > 0) {
        await this.sessionRepository.createEvent(
          {
            sessionId: session.id,
            eventType: SessionEventType.PROVIDER_ROOM_CREATED,
            actorUserId: input.userId,
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
        throw new ForbiddenException({
          messageKey: 'sessions.errors.sessionAccessDenied',
          error: 'SESSION_ACCESS_DENIED',
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
      throw new ForbiddenException({
        messageKey: 'sessions.errors.sessionAccessDenied',
        error: 'SESSION_ACCESS_DENIED',
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

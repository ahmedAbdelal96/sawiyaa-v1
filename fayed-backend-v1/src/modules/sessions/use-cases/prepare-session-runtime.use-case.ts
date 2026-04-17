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
import { ResolveSessionJoinReadinessService } from '../services/resolve-session-join-readiness.service';

@Injectable()
export class PrepareSessionRuntimeUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionRepository: SessionRepository,
    private readonly sessionPatientRepository: SessionPatientRepository,
    private readonly sessionPractitionerRepository: SessionPractitionerRepository,
    private readonly sessionVideoProviderRegistryService: SessionVideoProviderRegistryService,
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
      session.provider === SessionProvider.DAILY &&
      session.providerRoomId &&
      session.providerSessionRef
    ) {
      return {
        item: {
          provider: session.provider,
          roomName: session.providerRoomId,
          roomUrl: session.providerSessionRef,
          isPrepared: true,
        },
      };
    }

    if (
      session.provider !== SessionProvider.NONE &&
      session.provider !== SessionProvider.DAILY
    ) {
      throw new ConflictException({
        messageKey: 'sessions.errors.runtimeAlreadyPreparedByOtherProvider',
        error: 'SESSION_RUNTIME_ALREADY_PREPARED_BY_OTHER_PROVIDER',
      });
    }

    if (!session.scheduledStartAt || !session.scheduledEndAt) {
      throw new BadRequestException({
        messageKey: 'sessions.errors.sessionScheduleMissing',
        error: 'SESSION_SCHEDULE_MISSING',
      });
    }

    const adapter = this.sessionVideoProviderRegistryService.get(SessionProvider.DAILY);
    const room = await adapter.createRoom({
      sessionId: session.id,
      startsAt: session.scheduledStartAt,
      endsAt: session.scheduledEndAt,
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      const persisted = await this.sessionRepository.updateStatus(
        session.id,
        {
          provider: SessionProvider.DAILY,
          providerRoomId: room.roomName,
          providerSessionRef: room.roomUrl,
        },
        tx,
      );

      await this.sessionRepository.createEvent(
        {
          sessionId: session.id,
          eventType: SessionEventType.PROVIDER_ROOM_CREATED,
          actorUserId: input.userId,
          metadataJson: {
            provider: SessionProvider.DAILY,
            roomName: room.roomName,
          },
        },
        tx,
      );

      return persisted;
    });

    return {
      item: {
        provider: updated.provider,
        roomName: updated.providerRoomId,
        roomUrl: updated.providerSessionRef,
        isPrepared: Boolean(updated.providerRoomId && updated.providerSessionRef),
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

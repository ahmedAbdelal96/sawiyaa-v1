import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SessionEventType, SessionMode, SessionStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionAccessPolicy } from '../policies/session-access.policy';
import { SessionPractitionerRepository } from '../repositories/session-practitioner.repository';
import { SessionRepository } from '../repositories/session.repository';
import { SessionVideoProviderRegistryService } from '../services/session-video-provider-registry.service';
import { SessionVideoProviderResolverService } from '../services/session-video-provider-resolver.service';

const CLOSEABLE_SESSION_STATUSES = new Set<SessionStatus>([
  SessionStatus.CONFIRMED,
  SessionStatus.UPCOMING,
  SessionStatus.READY_TO_JOIN,
  SessionStatus.IN_PROGRESS,
]);

const DEFAULT_POST_END_CLOSE_REASON = 'CLOSED_AFTER_SCHEDULED_END';

@Injectable()
export class CloseSessionVideoRoomByPractitionerUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionPractitionerRepository: SessionPractitionerRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly sessionAccessPolicy: SessionAccessPolicy,
    private readonly sessionVideoProviderRegistryService: SessionVideoProviderRegistryService,
    private readonly sessionVideoProviderResolverService: SessionVideoProviderResolverService,
  ) {}

  async execute(input: {
    userId: string;
    sessionId: string;
    payload: {
      reason?: string;
      note?: string;
    };
  }) {
    const practitioner = await this.sessionPractitionerRepository.findByUserId(
      input.userId,
    );

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.practitionerNotFound',
        error: 'SESSION_PRACTITIONER_NOT_FOUND',
      });
    }

    const session = await this.sessionRepository.findById(input.sessionId);

    if (!session) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.sessionNotFound',
        error: 'SESSION_NOT_FOUND',
      });
    }

    this.sessionAccessPolicy.assertPractitionerOwner({
      sessionPractitionerId: session.practitioner.id,
      requesterPractitionerId: practitioner.id,
    });

    if (session.sessionMode !== SessionMode.VIDEO) {
      throw new BadRequestException({
        messageKey: 'sessions.errors.runtimeOnlyForVideoMode',
        error: 'SESSION_RUNTIME_ONLY_FOR_VIDEO_MODE',
      });
    }

    if (!CLOSEABLE_SESSION_STATUSES.has(session.status)) {
      throw new ConflictException({
        messageKey: 'sessions.errors.videoRoomCloseNotAllowed',
        error: 'SESSION_VIDEO_ROOM_CLOSE_NOT_ALLOWED',
      });
    }

    if (!session.scheduledStartAt) {
      throw new BadRequestException({
        messageKey: 'sessions.errors.sessionScheduleMissing',
        error: 'SESSION_SCHEDULE_MISSING',
      });
    }

    if (!session.providerRoomId || !session.providerSessionRef) {
      throw new ConflictException({
        messageKey: 'sessions.errors.runtimePreparationNotAllowed',
        error: 'SESSION_RUNTIME_NOT_PREPARED',
      });
    }

    const now = new Date();
    if (now < session.scheduledStartAt) {
      throw new ConflictException({
        messageKey: 'sessions.errors.videoRoomCloseOnlyAfterSessionStart',
        error: 'SESSION_VIDEO_ROOM_CLOSE_ONLY_AFTER_START',
      });
    }

    if (session.videoRoomClosedAt) {
      return {
        item: {
          sessionId: session.id,
          provider: session.provider,
          isClosed: true,
          wasAlreadyClosed: true,
          roomName: session.providerRoomId,
          roomUrl: session.providerSessionRef,
          closedAt: session.videoRoomClosedAt.toISOString(),
          closeReason: session.videoRoomCloseReason ?? null,
          closeNote: session.videoRoomCloseNote ?? null,
        },
      };
    }

    const trimmedReason = input.payload.reason?.trim() || null;
    const trimmedNote = input.payload.note?.trim() || null;
    const isBeforeScheduledEnd = Boolean(
      session.scheduledEndAt && now < session.scheduledEndAt,
    );

    if (isBeforeScheduledEnd && (!trimmedReason || trimmedReason.length < 3)) {
      throw new BadRequestException({
        messageKey: 'sessions.errors.videoRoomCloseReasonRequiredBeforeEnd',
        error: 'SESSION_VIDEO_ROOM_CLOSE_REASON_REQUIRED',
      });
    }

    const resolvedCloseReason =
      trimmedReason || DEFAULT_POST_END_CLOSE_REASON;

    const resolvedProvider =
      this.sessionVideoProviderResolverService.resolvePreparedProviderForSession(
        session,
      );
    const adapter =
      this.sessionVideoProviderRegistryService.get(resolvedProvider);
    const providerResult = await adapter.closeRoom({
      roomId: session.providerRoomId,
    });

    const closedAt = this.normalizeDate(providerResult.closedAt) ?? now;

    const updated = await this.prisma.$transaction(async (tx) => {
      const persisted = await this.sessionRepository.updateStatus(
        session.id,
        {
          videoRoomClosedAt: closedAt,
          videoRoomClosedByUserId: input.userId,
          videoRoomCloseReason: resolvedCloseReason,
          videoRoomCloseNote: trimmedNote,
        },
        tx,
      );

      await this.sessionRepository.createEvent(
        {
          sessionId: session.id,
          eventType: SessionEventType.PROVIDER_ROOM_ENDED,
          actorUserId: input.userId,
          metadataJson: this.toPrismaJson({
            provider: resolvedProvider,
            providerRoomId: session.providerRoomId,
            providerRoomUrl: session.providerSessionRef,
            closedAt: closedAt.toISOString(),
            closeReason: resolvedCloseReason,
            closeNote: trimmedNote,
            closedBeforeScheduledEnd: isBeforeScheduledEnd,
            closedBy: 'PRACTITIONER',
          }),
        },
        tx,
      );

      return persisted;
    });

    return {
      item: {
        sessionId: updated.id,
        provider: updated.provider,
        isClosed: true,
        wasAlreadyClosed: false,
        roomName: updated.providerRoomId,
        roomUrl: updated.providerSessionRef,
        closedAt: updated.videoRoomClosedAt?.toISOString() ?? closedAt.toISOString(),
        closeReason: updated.videoRoomCloseReason ?? resolvedCloseReason,
        closeNote: updated.videoRoomCloseNote ?? null,
      },
    };
  }

  private normalizeDate(value: Date | string | null | undefined): Date | null {
    if (!value) {
      return null;
    }

    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private toPrismaJson(value: Record<string, unknown>): Prisma.InputJsonObject {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
  }
}

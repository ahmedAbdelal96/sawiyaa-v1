import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SessionEventType, SessionProvider } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  SecurityAuditActorType,
  SecurityAuditSource,
} from '@common/security-audit/security-audit.types';
import { SessionRepository } from '../repositories/session.repository';
import { SessionVideoProviderRegistryService } from './session-video-provider-registry.service';
import { SessionVideoProviderResolverService } from './session-video-provider-resolver.service';

type RuntimeSession = NonNullable<
  Awaited<ReturnType<SessionRepository['findById']>>
>;

type RuntimePreparationPlan = {
  session: RuntimeSession;
  shouldPrepare: boolean;
};

@Injectable()
export class SessionRuntimePreparationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionRepository: SessionRepository,
    private readonly sessionVideoProviderRegistryService: SessionVideoProviderRegistryService,
    private readonly sessionVideoProviderResolverService: SessionVideoProviderResolverService,
  ) {}

  /**
   * Keeps database work short and deterministic around the external provider:
   * lock/recheck, call Daily after the transaction commits, then lock/recheck
   * and conditionally persist the provider runtime. The provider's
   * deterministic room name remains the cross-process idempotency boundary.
   */
  async prepare(input: {
    sessionId: string;
    validate: (
      session: RuntimeSession,
      tx: Prisma.TransactionClient,
    ) => Promise<boolean | void>;
    event: {
      actorType: SecurityAuditActorType;
      actorUserId: string | null;
      source: SecurityAuditSource;
    };
  }): Promise<RuntimeSession> {
    const plan = await this.prisma.$transaction(async (tx) => {
      await this.sessionRepository.lockRuntimePreparation(input.sessionId, tx);
      const current = await this.sessionRepository.findById(
        input.sessionId,
        tx,
      );
      if (!current) {
        throw new NotFoundException({
          messageKey: 'sessions.errors.sessionNotFound',
          error: 'SESSION_NOT_FOUND',
        });
      }

      const shouldPrepare = await input.validate(current, tx);
      if (this.isPrepared(current)) {
        return {
          session: current,
          shouldPrepare: false,
        } satisfies RuntimePreparationPlan;
      }
      if (shouldPrepare === false) {
        return {
          session: current,
          shouldPrepare: false,
        } satisfies RuntimePreparationPlan;
      }

      this.assertSchedule(current);
      return {
        session: current,
        shouldPrepare: true,
      } satisfies RuntimePreparationPlan;
    });

    if (!plan.shouldPrepare || this.isPrepared(plan.session)) {
      return plan.session;
    }

    const resolvedProvider =
      this.sessionVideoProviderResolverService.resolvePreparedProviderForSession(
        plan.session,
      );
    const adapter =
      this.sessionVideoProviderRegistryService.get(resolvedProvider);
    const room = await adapter.createRoom({
      sessionId: plan.session.id,
      startsAt: plan.session.scheduledStartAt as Date,
      endsAt: plan.session.scheduledEndAt as Date,
    });
    const roomId = room.roomId || room.roomName;
    if (!roomId) {
      throw new ConflictException({
        messageKey: 'sessions.errors.runtimePreparationNotAllowed',
        error: 'SESSION_RUNTIME_PREPARATION_NOT_ALLOWED',
        messageParams: { reason: 'SESSION_VIDEO_PROVIDER_ROOM_ID_MISSING' },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      await this.sessionRepository.lockRuntimePreparation(input.sessionId, tx);
      const current = await this.sessionRepository.findById(
        input.sessionId,
        tx,
      );
      if (!current) {
        throw new NotFoundException({
          messageKey: 'sessions.errors.sessionNotFound',
          error: 'SESSION_NOT_FOUND',
        });
      }

      const shouldPrepare = await input.validate(current, tx);
      if (this.isPrepared(current)) {
        return current;
      }
      if (shouldPrepare === false) {
        return current;
      }

      this.assertSchedule(current);
      if (
        current.scheduledStartAt?.getTime() !==
          plan.session.scheduledStartAt?.getTime() ||
        current.scheduledEndAt?.getTime() !==
          plan.session.scheduledEndAt?.getTime()
      ) {
        throw new ConflictException({
          messageKey: 'sessions.errors.runtimePreparationNotAllowed',
          error: 'SESSION_RUNTIME_PREPARATION_NOT_ALLOWED',
          messageParams: {
            reason: 'SESSION_SCHEDULE_CHANGED_DURING_PREPARATION',
          },
        });
      }

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
            actorType: input.event.actorType,
            actorUserId: input.event.actorUserId,
            source: input.event.source,
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
  }

  private isPrepared(session: RuntimeSession): boolean {
    return Boolean(
      session.provider !== SessionProvider.NONE &&
      session.providerRoomId &&
      session.providerSessionRef,
    );
  }

  private assertSchedule(session: RuntimeSession): void {
    if (!session.scheduledStartAt || !session.scheduledEndAt) {
      throw new ConflictException({
        messageKey: 'sessions.errors.sessionScheduleMissing',
        error: 'SESSION_SCHEDULE_MISSING',
      });
    }
  }
}

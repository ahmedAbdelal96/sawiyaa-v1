import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  SessionEventType,
  SessionProvider,
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionLifecycleService } from '../services/session-lifecycle.service';
import { SessionPatientRepository } from '../repositories/session-patient.repository';
import { SessionPractitionerRepository } from '../repositories/session-practitioner.repository';
import { SessionRepository } from '../repositories/session.repository';
import { ResolveSessionJoinReadinessService } from '../services/resolve-session-join-readiness.service';
import { SessionVideoProviderRegistryService } from '../services/session-video-provider-registry.service';
import { SessionVideoProviderResolverService } from '../services/session-video-provider-resolver.service';
import {
  computeSessionPostEndReconnectGraceClosesAt,
  resolveSessionJoinPolicy,
} from '../utils/session-join-policy.util';
import { PrepareSessionRuntimeUseCase } from './prepare-session-runtime.use-case';
import {
  SecurityAuditActorType,
  SecurityAuditSource,
} from '@common/security-audit/security-audit.types';

@Injectable()
export class ResolveSessionJoinContractUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionRepository: SessionRepository,
    private readonly sessionPatientRepository: SessionPatientRepository,
    private readonly sessionPractitionerRepository: SessionPractitionerRepository,
    private readonly resolveSessionJoinReadinessService: ResolveSessionJoinReadinessService,
    private readonly sessionVideoProviderRegistryService: SessionVideoProviderRegistryService,
    private readonly sessionVideoProviderResolverService: SessionVideoProviderResolverService,
    private readonly sessionLifecycleService: SessionLifecycleService,
    private readonly prepareSessionRuntimeUseCase: PrepareSessionRuntimeUseCase,
  ) {}

  async execute(input: {
    userId: string;
    actorType: 'PATIENT' | 'PRACTITIONER';
    sessionId: string;
  }) {
    const now = new Date();
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
    const finalManualDecision = latestDecision?.decisionType ?? null;

    // JOIN_ATTEMPTED — always emitted at the start of a join attempt
    await this.emitEvent({
      sessionId: session.id,
      eventType: SessionEventType.JOIN_ATTEMPTED,
      actorUserId: input.userId,
      metadata: {
        actorType: input.actorType,
        sessionStatus: session.status,
        sessionMode: session.sessionMode,
        occurredAt: now.toISOString(),
      },
    });

    let effectiveSession = session;
    let usedPostEndReconnectGrace = false;
    let readiness = this.resolveSessionJoinReadinessService.resolve({
      status: effectiveSession.status,
      sessionMode: effectiveSession.sessionMode,
      scheduledStartAt: effectiveSession.scheduledStartAt,
      scheduledEndAt: effectiveSession.scheduledEndAt,
      provider: effectiveSession.provider,
      providerRoomId: effectiveSession.providerRoomId,
      providerSessionRef: effectiveSession.providerSessionRef,
      videoRoomClosedAt: effectiveSession.videoRoomClosedAt,
      finalManualDecision,
      now,
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
        videoRoomClosedAt: effectiveSession.videoRoomClosedAt,
        finalManualDecision,
        now,
      });
    }

    if (
      !finalManualDecision &&
      !readiness.canJoin &&
      readiness.blockedReason === 'SESSION_JOIN_WINDOW_CLOSED'
    ) {
      const graceJoinAllowed =
        await this.canUsePostEndReconnectGrace({
          session: effectiveSession,
          userId: input.userId,
          now,
        });

      if (graceJoinAllowed) {
        usedPostEndReconnectGrace = true;
        readiness = {
          canPrepareRuntime: false,
          canJoin: true,
          blockedReason: null,
        };
      }
    }

    // JOIN_BLOCKED — emitted when the user is not allowed to join
    if (!readiness.canJoin) {
      const policy = resolveSessionJoinPolicy({
        status: effectiveSession.status,
        sessionMode: effectiveSession.sessionMode,
        scheduledStartAt: effectiveSession.scheduledStartAt,
        scheduledEndAt: effectiveSession.scheduledEndAt,
        provider: effectiveSession.provider,
        providerRoomId: effectiveSession.providerRoomId,
        providerSessionRef: effectiveSession.providerSessionRef,
        videoRoomClosedAt: effectiveSession.videoRoomClosedAt,
        finalManualDecision,
        now,
      });

      await this.emitEvent({
        sessionId: effectiveSession.id,
        eventType: SessionEventType.JOIN_BLOCKED,
        actorUserId: input.userId,
        metadata: {
          actorType: input.actorType,
          blockedReason: readiness.blockedReason,
          sessionStatus: effectiveSession.status,
          occurredAt: now.toISOString(),
        },
      });

      return {
        item: {
          sessionId: effectiveSession.id,
          status: effectiveSession.status,
          provider: effectiveSession.provider,
          canJoin: false,
          blockedReason: readiness.blockedReason,
          availableAt: policy.joinOpensAt?.toISOString() ?? null,
          expiresAt: policy.joinClosesAt?.toISOString() ?? null,
          roomName: effectiveSession.providerRoomId,
          roomUrl: effectiveSession.providerSessionRef,
          joinToken: null,
          providerRuntime: this.buildProviderRuntime({
            provider: effectiveSession.provider,
            roomId: effectiveSession.providerRoomId,
            roomUrl: effectiveSession.providerSessionRef,
          }),
        },
      };
    }

    const resolvedProvider =
      this.sessionVideoProviderResolverService.resolvePreparedProviderForSession(
        effectiveSession,
      );
    const adapter =
      this.sessionVideoProviderRegistryService.get(resolvedProvider);

    // Token idempotency: reuse if a valid token was recently issued.
    // The simplest safe approach is to always ask Daily — Daily tokens for the
    // same room_name + user_id are valid until expiry and Daily handles reuse
    // server-side. We emit JOIN_TOKEN_ISSUED only after a successful response.
    let joinToken: string;
    let tokenExpiresAt: string | null = null;
    try {
      const tokenResult = await adapter.createJoinToken({
        roomId: effectiveSession.providerRoomId!,
        userId: input.userId,
        actorType: input.actorType,
        displayName:
          input.actorType === 'PATIENT'
            ? effectiveSession.patient.user.displayName
            : effectiveSession.practitioner.user.displayName,
      });
      joinToken = tokenResult.token;
      tokenExpiresAt = this.normalizeDate(tokenResult.expiresAt);

      await this.emitEvent({
        sessionId: effectiveSession.id,
        eventType: SessionEventType.JOIN_TOKEN_ISSUED,
        actorUserId: input.userId,
        metadata: {
          actorType: input.actorType,
          provider: resolvedProvider,
          roomId: effectiveSession.providerRoomId,
          tokenExpiresAt,
          occurredAt: now.toISOString(),
        },
      });
    } catch (err) {
      await this.emitEvent({
        sessionId: effectiveSession.id,
        eventType: SessionEventType.JOIN_TOKEN_FAILED,
        actorUserId: input.userId,
        metadata: {
          actorType: input.actorType,
          provider: resolvedProvider,
          error: err instanceof Error ? err.message : String(err),
          occurredAt: now.toISOString(),
        },
      });
      throw err;
    }

    // JOIN_ALLOWED — emitted only when a token was successfully issued
    await this.emitEvent({
      sessionId: effectiveSession.id,
      eventType: SessionEventType.JOIN_ALLOWED,
      actorUserId: input.userId,
      metadata: {
        actorType: input.actorType,
        provider: resolvedProvider,
        occurredAt: now.toISOString(),
        usedPostEndReconnectGrace,
      },
    });

    const promotableToReadyStatuses: SessionStatus[] = [SessionStatus.UPCOMING];
    if (promotableToReadyStatuses.includes(effectiveSession.status)) {
      await this.prisma.$transaction(async (tx) => {
        await this.sessionLifecycleService.transition({
          session: effectiveSession,
          to: SessionStatus.READY_TO_JOIN,
          actorUserId: input.userId,
          tx,
        });
      });

      effectiveSession = (await this.sessionRepository.findById(
        input.sessionId,
      ))!;
    }

    const policy = resolveSessionJoinPolicy({
      status: effectiveSession.status,
      sessionMode: effectiveSession.sessionMode,
      scheduledStartAt: effectiveSession.scheduledStartAt,
      scheduledEndAt: effectiveSession.scheduledEndAt,
      provider: effectiveSession.provider,
      providerRoomId: effectiveSession.providerRoomId,
      providerSessionRef: effectiveSession.providerSessionRef,
      videoRoomClosedAt: effectiveSession.videoRoomClosedAt,
      finalManualDecision,
      now,
    });
    const reconnectGraceClosesAt = usedPostEndReconnectGrace
      ? computeSessionPostEndReconnectGraceClosesAt(
          effectiveSession.scheduledEndAt,
        )
      : null;

    return {
      item: {
        sessionId: effectiveSession.id,
        status: effectiveSession.status,
        provider: effectiveSession.provider,
        canJoin: true,
        blockedReason: null,
        availableAt: policy.joinOpensAt?.toISOString() ?? null,
        expiresAt:
          reconnectGraceClosesAt?.toISOString() ??
          policy.joinClosesAt?.toISOString() ??
          null,
        roomName: effectiveSession.providerRoomId,
        roomUrl: effectiveSession.providerSessionRef,
        joinToken,
        providerRuntime: this.buildProviderRuntime({
          provider: effectiveSession.provider,
          roomId: effectiveSession.providerRoomId,
          roomUrl: effectiveSession.providerSessionRef,
          token: joinToken,
          tokenExpiresAt,
          joinMode: 'redirect_url',
          payload: {},
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

  private async emitEvent(input: {
    sessionId: string;
    eventType: SessionEventType;
    actorUserId: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.sessionRepository.createEvent({
      sessionId: input.sessionId,
      eventType: input.eventType,
      actorType: SecurityAuditActorType.USER,
      actorUserId: input.actorUserId,
      source: SecurityAuditSource.HTTP_REQUEST,
      occurredAt: new Date(),
      metadataJson: this.toPrismaJson(input.metadata ?? {}),
    });
  }

  private toPrismaJson(value: Record<string, unknown>): Prisma.InputJsonObject {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
  }

  private buildProviderRuntime(input: {
    provider: SessionProvider;
    roomId: string | null;
    roomUrl: string | null;
    token?: string | null;
    tokenExpiresAt?: string | null;
    joinMode?: 'redirect_url' | 'embedded' | 'external_url' | null;
    payload?: Record<string, unknown>;
  }) {
    return {
      name: input.provider,
      roomId: input.roomId,
      roomUrl: input.roomUrl,
      token: input.token ?? null,
      tokenExpiresAt: input.tokenExpiresAt ?? null,
      joinMode: input.joinMode ?? null,
      payload: input.payload ?? {},
    };
  }

  private normalizeDate(
    value: Date | string | null | undefined,
  ): string | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  private async canUsePostEndReconnectGrace(input: {
    session: NonNullable<Awaited<ReturnType<SessionRepository['findById']>>>;
    userId: string;
    now: Date;
  }): Promise<boolean> {
    if (!input.session.scheduledEndAt) {
      return false;
    }

    if (input.session.videoRoomClosedAt) {
      return false;
    }

    const reconnectGraceClosesAt = computeSessionPostEndReconnectGraceClosesAt(
      input.session.scheduledEndAt,
    );
    if (!reconnectGraceClosesAt || input.now > reconnectGraceClosesAt) {
      return false;
    }

    const runtimePrepared =
      input.session.provider !== SessionProvider.NONE &&
      Boolean(input.session.providerRoomId) &&
      Boolean(input.session.providerSessionRef);

    if (!runtimePrepared) {
      return false;
    }

    return this.sessionRepository.hasJoinAllowanceOrAttendanceBefore({
      sessionId: input.session.id,
      userId: input.userId,
      occurredBeforeOrAt: input.session.scheduledEndAt,
    });
  }
}

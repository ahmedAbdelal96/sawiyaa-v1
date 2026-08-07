import { ConflictException, Injectable } from '@nestjs/common';
import {
  Prisma,
  SecurityAuditActorType,
  Session,
  SessionStatus,
} from '@prisma/client';
import { PostPackageSessionLedgerEntriesUseCase } from '@modules/financial-operations/use-cases/post-package-session-ledger-entries.use-case';
import { SessionEarningReviewService } from '@modules/financial-operations/services/session-earning-review.service';
import { SessionLifecycleService } from './session-lifecycle.service';
import { SessionRepository } from '../repositories/session.repository';

/**
 * Single transaction boundary for an approved session completion.
 * Callers must perform their own eligibility/authorization checks first.
 */
@Injectable()
export class CompleteSessionTransactionService {
  constructor(
    private readonly lifecycle: SessionLifecycleService,
    private readonly sessions: SessionRepository,
    private readonly packageLedger: PostPackageSessionLedgerEntriesUseCase,
    private readonly earningReview: SessionEarningReviewService,
  ) {}

  async execute<TSession extends Pick<Session, 'id' | 'status'>>(input: {
    session: TSession;
    tx: Prisma.TransactionClient;
    at: Date;
    actorUserId?: string | null;
    actorType?: SecurityAuditActorType;
    actorRoles?: string[];
    source?: string;
    requestId?: string | null;
    correlationId?: string | null;
    reason?: string | null;
    metadata?: Prisma.InputJsonObject;
  }): Promise<TSession> {
    const lockedSession = await this.sessions.findByIdForUpdate(
      input.session.id,
      input.tx,
    );
    if (!lockedSession) {
      throw new ConflictException({
        messageKey: 'sessions.errors.sessionNotFound',
        error: 'SESSION_NOT_FOUND',
      });
    }
    if (lockedSession.status === SessionStatus.COMPLETED) {
      return lockedSession as unknown as TSession;
    }
    if (lockedSession.status !== input.session.status) {
      throw new ConflictException({
        messageKey: 'sessions.errors.invalidStatusTransition',
        error: 'SESSION_COMPLETION_RACE_LOST',
      });
    }

    const completedSession = await this.lifecycle.transition({
      session: lockedSession,
      to: SessionStatus.COMPLETED,
      actorUserId: input.actorUserId ?? null,
      actorType: input.actorType,
      actorRoles: input.actorRoles,
      source: input.source,
      requestId: input.requestId,
      correlationId: input.correlationId,
      reason: input.reason ?? null,
      at: input.at,
      metadata: input.metadata,
      tx: input.tx,
    });

    await this.packageLedger.execute({
      sessionId: input.session.id,
      tx: input.tx,
    });

    await this.earningReview.syncForSessionCompletion({
      sessionId: input.session.id,
      tx: input.tx,
    });

    return completedSession as unknown as TSession;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

export const SESSION_CODE_TIMEZONE = 'Africa/Cairo';
export const SESSION_CODE_MAX_DAILY_SEQUENCE = 9_999;
export const SESSION_CODE_PATTERN = /^S-\d{6}-\d{4}$/;

type SessionCodeDb = PrismaClient | Prisma.TransactionClient;

export type SessionCodeGenerationContext = {
  creationFlow?: string;
  sessionId?: string;
};

export class SessionCodeGenerationError extends Error {
  constructor(
    public readonly code:
      | 'SESSION_CODE_DAILY_CAPACITY_EXCEEDED'
      | 'SESSION_CODE_GENERATION_FAILED',
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'SessionCodeGenerationError';
  }
}

function toNumber(value: number | bigint): number {
  return typeof value === 'bigint' ? Number(value) : value;
}

export function formatSessionCode(input: {
  dateKey: string;
  sequence: number;
}): string {
  if (!/^\d{6}$/.test(input.dateKey)) {
    throw new SessionCodeGenerationError(
      'SESSION_CODE_GENERATION_FAILED',
      'Session code date key must contain exactly six Latin digits.',
      { dateKey: input.dateKey },
    );
  }

  if (
    !Number.isInteger(input.sequence) ||
    input.sequence < 1 ||
    input.sequence > SESSION_CODE_MAX_DAILY_SEQUENCE
  ) {
    throw new SessionCodeGenerationError(
      'SESSION_CODE_DAILY_CAPACITY_EXCEEDED',
      'The Cairo session-code daily capacity was exceeded.',
      { dateKey: input.dateKey, sequence: input.sequence },
    );
  }

  return `S-${input.dateKey}-${input.sequence.toString().padStart(4, '0')}`;
}

export function resolveSessionCodeDateKey(createdAt: Date): string {
  if (Number.isNaN(createdAt.getTime())) {
    throw new SessionCodeGenerationError(
      'SESSION_CODE_GENERATION_FAILED',
      'Session creation time is invalid.',
    );
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SESSION_CODE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(createdAt);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  ) as { year?: string; month?: string; day?: string };

  const year = values.year?.slice(-2);
  const dateKey = `${year ?? ''}${values.month ?? ''}${values.day ?? ''}`;
  if (!/^\d{6}$/.test(dateKey)) {
    throw new SessionCodeGenerationError(
      'SESSION_CODE_GENERATION_FAILED',
      'Unable to resolve the Cairo session-code date key.',
      { createdAt: createdAt.toISOString(), timezone: SESSION_CODE_TIMEZONE },
    );
  }

  return dateKey;
}

@Injectable()
export class SessionCodeGeneratorService {
  private readonly logger = new Logger(SessionCodeGeneratorService.name);

  async reserveNextSessionCode(
    db: SessionCodeDb,
    createdAt: Date,
    context: SessionCodeGenerationContext = {},
  ): Promise<{ code: string; dateKey: string; sequence: number }> {
    const dateKey = resolveSessionCodeDateKey(createdAt);
    const rows = await db.$queryRaw<Array<{ currentValue: number | bigint }>>(
      Prisma.sql`
        INSERT INTO "session_code_counters"
          ("date_key", "current_value", "created_at", "updated_at")
        VALUES (${dateKey}, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("date_key") DO UPDATE
          SET "current_value" = "session_code_counters"."current_value" + 1,
              "updated_at" = CURRENT_TIMESTAMP
          WHERE "session_code_counters"."current_value" < ${SESSION_CODE_MAX_DAILY_SEQUENCE}
        RETURNING "current_value" AS "currentValue"
      `,
    );

    if (rows.length === 0) {
      throw new SessionCodeGenerationError(
        'SESSION_CODE_DAILY_CAPACITY_EXCEEDED',
        'The Cairo session-code daily capacity was exceeded.',
        { dateKey, ...context },
      );
    }

    const sequence = rows[0] ? toNumber(rows[0].currentValue) : NaN;
    if (!Number.isInteger(sequence)) {
      throw new SessionCodeGenerationError(
        'SESSION_CODE_GENERATION_FAILED',
        'The session-code counter did not return a valid sequence.',
        { dateKey, ...context },
      );
    }

    if (sequence > SESSION_CODE_MAX_DAILY_SEQUENCE) {
      this.logger.error({
        event: 'sessionCodeDailyCapacityExceeded',
        dateKey,
        attemptedValue: sequence,
        ...context,
      });
      throw new SessionCodeGenerationError(
        'SESSION_CODE_DAILY_CAPACITY_EXCEEDED',
        'The Cairo session-code daily capacity was exceeded.',
        { dateKey, attemptedValue: sequence, ...context },
      );
    }

    const code = formatSessionCode({ dateKey, sequence });
    this.logger.debug({
      event: 'sessionCodeGenerated',
      dateKey,
      sequence,
      sessionCode: code,
      ...context,
    });
    return { code, dateKey, sequence };
  }

  async advanceAfterCollision(db: SessionCodeDb, dateKey: string): Promise<void> {
    const rows = await db.$queryRaw<Array<{ currentValue: number | bigint }>>(
      Prisma.sql`
        INSERT INTO "session_code_counters"
          ("date_key", "current_value", "created_at", "updated_at")
        VALUES (${dateKey}, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("date_key") DO UPDATE
          SET "current_value" = "session_code_counters"."current_value" + 1,
              "updated_at" = CURRENT_TIMESTAMP
          WHERE "session_code_counters"."current_value" < ${SESSION_CODE_MAX_DAILY_SEQUENCE}
        RETURNING "current_value" AS "currentValue"
      `,
    );
    if (rows.length === 0) {
      throw new SessionCodeGenerationError(
        'SESSION_CODE_DAILY_CAPACITY_EXCEEDED',
        'The Cairo session-code daily capacity was exceeded while recovering from a collision.',
        { dateKey },
      );
    }
    const sequence = rows[0] ? toNumber(rows[0].currentValue) : NaN;
    if (sequence > SESSION_CODE_MAX_DAILY_SEQUENCE) {
      throw new SessionCodeGenerationError(
        'SESSION_CODE_DAILY_CAPACITY_EXCEEDED',
        'The Cairo session-code daily capacity was exceeded while recovering from a collision.',
        { dateKey, attemptedValue: sequence },
      );
    }
  }

  logCollision(input: {
    dateKey: string;
    sequence: number;
    retryAttempt: number;
    context?: SessionCodeGenerationContext;
  }): void {
    this.logger.warn({
      event: 'sessionCodeCollision',
      dateKey: input.dateKey,
      sequence: input.sequence,
      retryAttempt: input.retryAttempt,
      ...input.context,
    });
  }
}

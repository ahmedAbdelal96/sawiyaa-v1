import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  formatSessionCode,
  resolveSessionCodeDateKey,
  SESSION_CODE_MAX_DAILY_SEQUENCE,
  SESSION_CODE_PATTERN,
} from '../../src/modules/sessions/services/session-code-generator.service';

type SessionRow = {
  id: string;
  sessionCode: string;
  createdAt: Date;
};

const prisma = new PrismaClient();
const confirmed = process.argv.includes('--confirm');
const requestedDryRun = process.argv.includes('--dry-run');

function isProductionEnvironment(): boolean {
  return [process.env.NODE_ENV, process.env.APP_ENV, process.env.RUNTIME_ENV]
    .filter(Boolean)
    .some((value) => value?.toLowerCase() === 'production');
}

function assertWriteAllowed(): void {
  if (!confirmed || requestedDryRun) {
    throw new Error('Session-code backfill writes require --confirm without --dry-run.');
  }
  if (process.env.SESSION_CODE_BACKFILL_ENABLED !== 'true') {
    throw new Error(
      'Session-code backfill is disabled. Set SESSION_CODE_BACKFILL_ENABLED=true explicitly.',
    );
  }
  if (
    isProductionEnvironment() &&
    process.env.SESSION_CODE_BACKFILL_ALLOW_PRODUCTION !== 'true'
  ) {
    throw new Error(
      'Session-code backfill is blocked in production. Set SESSION_CODE_BACKFILL_ALLOW_PRODUCTION=true only after an explicit release decision.',
    );
  }
}

function buildPlan(rows: SessionRow[]) {
  const counters = new Map<string, number>();
  const plan = rows.map((row) => {
    const dateKey = resolveSessionCodeDateKey(row.createdAt);
    const next = (counters.get(dateKey) ?? 0) + 1;
    counters.set(dateKey, next);
    if (next > SESSION_CODE_MAX_DAILY_SEQUENCE) {
      throw new Error(
        `SESSION_CODE_DAILY_CAPACITY_EXCEEDED: ${dateKey} contains more than ${SESSION_CODE_MAX_DAILY_SEQUENCE} sessions.`,
      );
    }
    return {
      id: row.id,
      previousCode: row.sessionCode,
      code: formatSessionCode({ dateKey, sequence: next }),
      dateKey,
      sequence: next,
    };
  });
  return { plan, counters };
}

async function verifyPlan(plan: ReturnType<typeof buildPlan>['plan']): Promise<void> {
  const invalid = plan.filter((item) => !SESSION_CODE_PATTERN.test(item.code));
  if (invalid.length > 0) {
    throw new Error(`Generated ${invalid.length} invalid session codes.`);
  }
  const duplicates = new Set<string>();
  for (const item of plan) {
    if (duplicates.has(item.code)) {
      throw new Error(`Duplicate target session code: ${item.code}`);
    }
    duplicates.add(item.code);
  }
}

async function main(): Promise<void> {
  const rows = await prisma.session.findMany({
    select: { id: true, sessionCode: true, createdAt: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  const { plan, counters } = buildPlan(rows);
  await verifyPlan(plan);

  const changed = plan.filter((item) => item.previousCode !== item.code);
  console.log(
    JSON.stringify(
      {
        mode: confirmed && !requestedDryRun ? 'WRITE' : 'DRY_RUN',
        environment: process.env.NODE_ENV ?? process.env.APP_ENV ?? 'unknown',
        sessions: rows.length,
        changed: changed.length,
        dateKeys: counters.size,
        sample: changed.slice(0, 10),
      },
      null,
      2,
    ),
  );

  if (!confirmed || requestedDryRun) {
    return;
  }
  assertWriteAllowed();

  await prisma.$transaction(async (tx) => {
    const temporaryCodes = plan.map((item) => `T${item.id.replaceAll('-', '').slice(0, 31)}`);
    if (new Set(temporaryCodes).size !== temporaryCodes.length) {
      throw new Error('Temporary backfill codes are not unique; refusing to write.');
    }

    for (let index = 0; index < plan.length; index += 1) {
      await tx.session.update({
        where: { id: plan[index].id },
        data: { sessionCode: temporaryCodes[index] },
      });
    }
    for (const item of plan) {
      await tx.session.update({
        where: { id: item.id },
        data: { sessionCode: item.code },
      });
    }

    for (const [dateKey, currentValue] of counters) {
      await tx.$executeRaw(
        Prisma.sql`
          INSERT INTO "session_code_counters" ("date_key", "current_value", "created_at", "updated_at")
          VALUES (${dateKey}, ${currentValue}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT ("date_key") DO UPDATE SET
            "current_value" = EXCLUDED."current_value",
            "updated_at" = CURRENT_TIMESTAMP
        `,
      );
    }
  });

  const invalid = await prisma.session.count({
    where: { NOT: { sessionCode: { startsWith: 'S-' } } },
  });
  if (invalid > 0) {
    throw new Error(`Backfill verification failed: ${invalid} sessions are not canonical.`);
  }
  console.log(`Backfill complete: ${changed.length} session codes updated.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

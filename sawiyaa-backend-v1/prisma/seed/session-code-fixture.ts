import { Prisma, PrismaClient } from '@prisma/client';
import { SessionCodeGeneratorService } from '../../src/modules/sessions/services/session-code-generator.service';

type SeedDb = PrismaClient | Prisma.TransactionClient;

const generator = new SessionCodeGeneratorService();

/**
 * Seed-only adapter around the production-owned session-code generator.
 * Seed data must never invent a competing session-code format.
 */
export async function reserveSeedSessionCode(
  db: SeedDb,
  createdAt: Date,
  creationFlow: string,
): Promise<string> {
  const allocation = await generator.reserveNextSessionCode(db, createdAt, {
    creationFlow,
  });
  return allocation.code;
}

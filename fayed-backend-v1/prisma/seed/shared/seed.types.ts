import { PrismaClient } from '@prisma/client';

/**
 * Shared contract used by module seed files.
 * Every module seed stays isolated and can be reordered by the root orchestrator.
 */
export interface SeedModule {
  name: string;
  run: (prisma: PrismaClient) => Promise<void>;
}

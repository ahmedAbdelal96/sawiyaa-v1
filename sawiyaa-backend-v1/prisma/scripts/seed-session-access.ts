import { PrismaClient } from '@prisma/client';
import { seedSessionAccessFixtures } from '../seed/modules/session-access.seed';

const prisma = new PrismaClient();

seedSessionAccessFixtures(prisma)
  .then(() => console.log('Dynamic session-access fixtures refreshed successfully.'))
  .catch((error) => { console.error('Session-access fixture refresh failed:', error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());

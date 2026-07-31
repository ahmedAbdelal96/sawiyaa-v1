import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { SessionCodeGeneratorService } from '../../src/modules/sessions/services/session-code-generator.service';

const prisma = new PrismaClient();
const generator = new SessionCodeGeneratorService();
const dateKey = '991231';

async function main(): Promise<void> {
  if ([process.env.NODE_ENV, process.env.APP_ENV].includes('production')) {
    throw new Error('Concurrency verification is blocked in production.');
  }
  await prisma.sessionCodeCounter.deleteMany({ where: { dateKey } });
  const createdAt = new Date('2099-12-31T12:00:00.000Z');
  const allocations = await Promise.all(
    Array.from({ length: 100 }, () =>
      prisma.$transaction((tx) =>
        generator.reserveNextSessionCode(tx, createdAt, {
          creationFlow: 'concurrency_verification',
        }),
      ),
    ),
  );
  const sequences = allocations.map((item) => item.sequence).sort((a, b) => a - b);
  const uniqueCodes = new Set(allocations.map((item) => item.code));
  const expected = Array.from({ length: 100 }, (_, index) => index + 1);
  if (uniqueCodes.size !== 100 || sequences.some((value, index) => value !== expected[index])) {
    throw new Error('Session-code concurrency verification failed.');
  }
  console.log(JSON.stringify({ ok: true, allocations: allocations.length, first: allocations[0], last: allocations.at(-1) }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.sessionCodeCounter.deleteMany({ where: { dateKey } });
    await prisma.$disconnect();
  });

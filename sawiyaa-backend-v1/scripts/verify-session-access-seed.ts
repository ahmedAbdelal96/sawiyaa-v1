import { PrismaClient, SessionStatus } from '@prisma/client';
import { SESSION_ACCESS_SEED_NAMESPACE } from '../prisma/seed/modules/session-access.seed';

const prisma = new PrismaClient();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Session-access seed assertion failed: ${message}`);
  }
}

async function main(): Promise<void> {
  const ownedSessions = await prisma.session.findMany({
    where: {
      notesInternal: { startsWith: `${SESSION_ACCESS_SEED_NAMESPACE}:` },
    },
    select: {
      id: true,
      patientId: true,
      scheduledStartAt: true,
      scheduledEndAt: true,
      status: true,
      notesInternal: true,
    },
    orderBy: { scheduledStartAt: 'asc' },
  });

  assert(
    ownedSessions.length === 9,
    `expected 9 owned scenarios, found ${ownedSessions.length}`,
  );
  assert(
    new Set(ownedSessions.map((session) => session.notesInternal)).size === 9,
    'owned scenario markers must be unique',
  );

  for (const session of ownedSessions) {
    assert(
      session.scheduledStartAt && session.scheduledEndAt,
      `missing interval for ${session.id}`,
    );
  }

  const allPatientIntervals = await prisma.session.findMany({
    where: {
      scheduledStartAt: { not: null },
      scheduledEndAt: { not: null },
      status: {
        in: [
          SessionStatus.PENDING_PAYMENT,
          SessionStatus.PENDING_PRACTITIONER_CONFIRMATION,
          SessionStatus.UPCOMING,
          SessionStatus.READY_TO_JOIN,
          SessionStatus.IN_PROGRESS,
        ],
      },
      patientId: {
        in: [...new Set(ownedSessions.map((session) => session.patientId))],
      },
    },
    select: {
      id: true,
      patientId: true,
      scheduledStartAt: true,
      scheduledEndAt: true,
      status: true,
    },
  });

  for (let index = 0; index < allPatientIntervals.length; index += 1) {
    const left = allPatientIntervals[index];
    if (!left.scheduledStartAt || !left.scheduledEndAt) continue;
    for (
      let nextIndex = index + 1;
      nextIndex < allPatientIntervals.length;
      nextIndex += 1
    ) {
      const right = allPatientIntervals[nextIndex];
      if (
        !right.scheduledStartAt ||
        !right.scheduledEndAt ||
        left.patientId !== right.patientId
      ) {
        continue;
      }
      assert(
        left.scheduledStartAt >= right.scheduledEndAt ||
          right.scheduledStartAt >= left.scheduledEndAt,
        `patient interval overlap between ${left.id} (${left.status}) and ${right.id} (${right.status})`,
      );
    }
  }

  const demoAccounts = await prisma.userEmail.count({
    where: {
      email: { in: ['ahmed.patient@hesba.local', 'amohamef206@gmail.com'] },
    },
  });
  assert(
    demoAccounts === 2,
    'existing primary demo accounts must remain present',
  );

  console.log(
    JSON.stringify(
      {
        status: 'PASS',
        ownedSessionCount: ownedSessions.length,
        uniqueScenarioCount: new Set(
          ownedSessions.map((session) => session.notesInternal),
        ).size,
        demoAccountCount: demoAccounts,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

import { CredentialReviewStatus, CredentialType } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { PractitionerCredentialComplianceSweeperService } from './practitioner-credential-compliance-sweeper.service';

type CredentialRow = {
  id: string;
  practitionerId: string;
  credentialType: CredentialType;
  expiresAt: Date;
  practitioner: { userId: string };
};

const BATCH_ENV = 'PRACTITIONER_CREDENTIAL_COMPLIANCE_SWEEPER_BATCH_SIZE';

function credential(
  id: string,
  expiresAt = new Date('2026-01-01T00:00:00.000Z'),
): CredentialRow {
  return {
    id,
    practitionerId: `practitioner-${id}`,
    credentialType: CredentialType.LICENSE,
    expiresAt,
    practitioner: { userId: `user-${id}` },
  };
}

function currentCredential(row: CredentialRow, overrides = {}) {
  return {
    id: row.id,
    practitionerId: row.practitionerId,
    credentialType: row.credentialType,
    expiresAt: row.expiresAt,
    reviewStatus: CredentialReviewStatus.PENDING,
    practitioner: row.practitioner,
    ...overrides,
  };
}

function buildSetup(
  pages: CredentialRow[][],
  options: {
    currentById?: Map<string, Record<string, unknown> | null>;
    reviewCaseResults?: Array<{ id: string } | null>;
    requirementResults?: Array<{ id: string } | null>;
  } = {},
) {
  const findMany = jest.fn(async () => {
    return pages[findMany.mock.calls.length - 1] ?? [];
  });
  const findUnique = jest.fn(async ({ where }: { where: { id: string } }) => {
    const row = pages.flat().find((item) => item.id === where.id);
    return row
      ? (options.currentById?.get(row.id) ?? currentCredential(row))
      : null;
  });
  const reviewCaseFindFirst = jest.fn();
  for (const result of options.reviewCaseResults ?? [{ id: 'case-1' }]) {
    reviewCaseFindFirst.mockResolvedValueOnce(result);
  }
  const requirementFindFirst = jest.fn();
  for (const result of options.requirementResults ?? [
    { id: 'requirement-1' },
  ]) {
    requirementFindFirst.mockResolvedValueOnce(result);
  }
  const tx = {
    practitionerCredential: {
      findUnique,
      update: jest.fn().mockResolvedValue(undefined),
    },
    practitionerProfile: {
      update: jest.fn().mockResolvedValue(undefined),
    },
    practitionerReviewCase: {
      findFirst: reviewCaseFindFirst,
      create: jest.fn().mockResolvedValue({ id: 'created-case' }),
    },
    practitionerReviewSection: {
      upsert: jest.fn().mockResolvedValue(undefined),
    },
    practitionerReviewRequirement: {
      findFirst: requirementFindFirst,
      create: jest.fn().mockResolvedValue({ id: 'created-requirement' }),
    },
  };
  const prisma = {
    practitionerCredential: { findMany },
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };

  return {
    service: new PractitionerCredentialComplianceSweeperService(
      prisma as unknown as PrismaService,
    ),
    prisma,
    findMany,
    findUnique,
    tx,
  };
}

describe('PractitionerCredentialComplianceSweeperService', () => {
  afterEach(() => {
    delete process.env[BATCH_ENV];
  });

  it('preserves the existing expiry transaction and applies bounded query ordering', async () => {
    const now = new Date('2026-01-02T00:00:00.000Z');
    const row = credential('credential-1');
    const setup = buildSetup([[row]], {
      reviewCaseResults: [null],
      requirementResults: [null],
    });

    await expect(setup.service.sweepOnce(now)).resolves.toBe(1);

    expect(setup.findMany).toHaveBeenCalledWith({
      where: {
        expiresAt: { lte: now },
        reviewStatus: { not: CredentialReviewStatus.EXPIRED },
        practitionerId: { not: null },
      },
      orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
      take: 50,
      select: {
        id: true,
        practitionerId: true,
        credentialType: true,
        expiresAt: true,
        practitioner: { select: { userId: true } },
      },
    });
    expect(setup.findUnique).toHaveBeenCalledWith({
      where: { id: row.id },
      select: {
        id: true,
        practitionerId: true,
        credentialType: true,
        expiresAt: true,
        reviewStatus: true,
        practitioner: { select: { userId: true } },
      },
    });
    expect(setup.tx.practitionerCredential.update).toHaveBeenCalledWith({
      where: { id: row.id },
      data: {
        reviewStatus: CredentialReviewStatus.EXPIRED,
        lifecycleState: 'EXPIRED',
      },
    });
    expect(setup.tx.practitionerProfile.update).toHaveBeenCalledWith({
      where: { id: row.practitionerId },
      data: { complianceState: 'DOCUMENT_EXPIRED' },
    });
    expect(setup.tx.practitionerReviewCase.create).toHaveBeenCalledTimes(1);
    expect(setup.tx.practitionerReviewSection.upsert).toHaveBeenCalledTimes(1);
    expect(setup.tx.practitionerReviewRequirement.create).toHaveBeenCalledTimes(
      1,
    );
  });

  it('processes more records than one batch without accumulating pages', async () => {
    process.env[BATCH_ENV] = '10';
    const rows = Array.from({ length: 27 }, (_, index) =>
      credential(`credential-${String(index).padStart(2, '0')}`),
    );
    const setup = buildSetup([
      rows.slice(0, 10),
      rows.slice(10, 20),
      rows.slice(20),
    ]);

    await expect(setup.service.sweepOnce()).resolves.toBe(27);

    expect(setup.findMany).toHaveBeenCalledTimes(3);
    expect(setup.findMany.mock.calls.map((call) => call[0].take)).toEqual([
      10, 10, 10,
    ]);
    expect(setup.prisma.$transaction).toHaveBeenCalledTimes(27);
    expect(Math.max(...[10, 10, 7])).toBe(10);
  });

  it('uses the credential id as a stable tie-breaker for equal expiry timestamps', async () => {
    process.env[BATCH_ENV] = '2';
    const expiresAt = new Date('2026-01-01T00:00:00.000Z');
    const rows = [
      credential('credential-a', expiresAt),
      credential('credential-b', expiresAt),
      credential('credential-c', expiresAt),
    ];
    const setup = buildSetup([rows.slice(0, 2), rows.slice(2)]);

    await expect(setup.service.sweepOnce()).resolves.toBe(3);

    expect(setup.findMany.mock.calls[1][0].where.OR).toEqual([
      { expiresAt: { gt: expiresAt } },
      { expiresAt, id: { gt: 'credential-b' } },
    ]);
    expect(setup.prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it('revalidates a discovered credential before mutating it when eligibility changes', async () => {
    process.env[BATCH_ENV] = '2';
    const first = credential('credential-a');
    const changed = credential('credential-b');
    const later = credential('credential-c');
    const currentById = new Map<string, Record<string, unknown> | null>([
      [
        changed.id,
        currentCredential(changed, {
          expiresAt: new Date('2027-01-01T00:00:00.000Z'),
        }),
      ],
    ]);
    const setup = buildSetup([[first, changed], [later]], { currentById });

    await expect(setup.service.sweepOnce()).resolves.toBe(3);

    expect(
      setup.tx.practitionerCredential.update.mock.calls.map(
        ([input]) => input.where.id,
      ),
    ).toEqual([first.id, later.id]);
    expect(setup.findMany.mock.calls[1][0].where.OR[1]).toEqual({
      expiresAt: first.expiresAt,
      id: { gt: changed.id },
    });
  });

  it('keeps replay idempotency in the existing review-case and requirement lookups', async () => {
    const row = credential('credential-replay');
    const setup = buildSetup([[row], [row]], {
      reviewCaseResults: [null, { id: 'case-created' }],
      requirementResults: [null, { id: 'requirement-created' }],
    });

    await setup.service.sweepOnce();
    await setup.service.sweepOnce();

    expect(setup.tx.practitionerReviewCase.create).toHaveBeenCalledTimes(1);
    expect(setup.tx.practitionerReviewRequirement.create).toHaveBeenCalledTimes(
      1,
    );
    expect(setup.prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('retains stop-on-error behavior and does not fetch another page', async () => {
    process.env[BATCH_ENV] = '2';
    const first = credential('credential-a');
    const second = credential('credential-b');
    const setup = buildSetup([[first, second], [credential('credential-c')]]);
    setup.tx.practitionerCredential.update
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('credential processor failed'));

    await expect(setup.service.sweepOnce()).rejects.toThrow(
      'credential processor failed',
    );

    expect(setup.findMany).toHaveBeenCalledTimes(1);
    expect(setup.prisma.$transaction).toHaveBeenCalledTimes(2);
  });
});

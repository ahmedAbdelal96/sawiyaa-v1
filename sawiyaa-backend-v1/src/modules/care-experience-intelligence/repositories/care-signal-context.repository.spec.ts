import {
  AcademyProgramEnrollmentStatus,
  PaymentStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { CareSignalContextRepository } from './care-signal-context.repository';

describe('CareSignalContextRepository Academy enrollment signal', () => {
  const prisma = {
    academyProgramEnrollment: {
      findFirst: jest.fn(),
    },
    patientProfile: { findUnique: jest.fn() },
    assessmentSubmission: { findFirst: jest.fn() },
    session: { findFirst: jest.fn() },
    payment: { findFirst: jest.fn() },
    matchingSession: { findFirst: jest.fn() },
    supportTicket: { findFirst: jest.fn() },
  } as unknown as PrismaService;

  const repository = new CareSignalContextRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.academyProgramEnrollment.findFirst as jest.Mock).mockResolvedValue(
      null,
    );
  });

  it('uses one indexed existence query and returns false without a canonical enrollment', async () => {
    const result = await repository.readSnapshot({
      patientProfileId: 'patient-profile-1',
      userId: 'user-1',
      now: new Date('2026-07-16T00:00:00.000Z'),
    });

    expect(result.hasActiveAcademyEnrollment).toBe(false);
    expect(prisma.academyProgramEnrollment.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.academyProgramEnrollment.findFirst).toHaveBeenCalledWith({
      where: {
        status: AcademyProgramEnrollmentStatus.CONFIRMED,
        completedAt: null,
        AND: [
          {
            OR: [
              { userId: 'user-1' },
              { academyLearner: { userId: 'user-1' } },
            ],
          },
          {
            OR: [
              { paymentStatus: PaymentStatus.CAPTURED },
              {
                paymentId: null,
                academyLearner: { sourceLabel: 'admin-manual' },
              },
            ],
          },
        ],
      },
      select: { id: true },
    });
  });

  it.each([
    'free-captured',
    'paid-captured',
    'manual-confirmed',
  ])('returns true for a valid %s enrollment', async () => {
    (prisma.academyProgramEnrollment.findFirst as jest.Mock).mockResolvedValue({
      id: 'enrollment-1',
    });

    const result = await repository.readSnapshot({
      patientProfileId: 'patient-profile-1',
      userId: 'user-1',
      now: new Date('2026-07-16T00:00:00.000Z'),
    });

    expect(result.hasActiveAcademyEnrollment).toBe(true);
  });

  it.each([
    'pending payment',
    'cancelled',
    'expired',
    'refunded or non-captured',
    'completed',
    'unlinked manual',
  ])('returns false when the canonical query finds no valid %s enrollment', async () => {
    const result = await repository.readSnapshot({
      patientProfileId: 'patient-profile-1',
      userId: 'user-1',
      now: new Date('2026-07-16T00:00:00.000Z'),
    });

    expect(result.hasActiveAcademyEnrollment).toBe(false);
  });

  it('fails safely and logs without exposing patient or payment identifiers', async () => {
    (prisma.academyProgramEnrollment.findFirst as jest.Mock).mockRejectedValue(
      new Error('database unavailable'),
    );

    const result = await repository.readSnapshot({
      patientProfileId: 'patient-profile-1',
      userId: 'user-1',
      now: new Date('2026-07-16T00:00:00.000Z'),
    });

    expect(result.hasActiveAcademyEnrollment).toBe(false);
  });
});

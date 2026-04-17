import { PrismaService } from '@common/prisma/prisma.service';
import { OrchestrateTrainingEnrollmentPaymentStatusService } from './orchestrate-training-enrollment-payment-status.service';

describe('OrchestrateTrainingEnrollmentPaymentStatusService', () => {
  const prisma = {
    enrollment: {
      updateMany: jest.fn(),
      findFirst: jest.fn(),
    },
  } as unknown as PrismaService;
  const operationalNotificationService = {
    notifyTrainingEnrollmentConfirmed: jest.fn().mockResolvedValue(undefined),
    queueTrainingScheduleReminder: jest.fn().mockResolvedValue(undefined),
  };

  const service = new OrchestrateTrainingEnrollmentPaymentStatusService(
    prisma,
    operationalNotificationService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks pending enrollment as active on payment success', async () => {
    (prisma.enrollment.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue({
      id: 'en_1',
      userId: 'user_1',
      courseScheduleId: 'schedule_1',
      courseSchedule: {
        startsAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      },
    });

    await service.markEnrollmentActiveFromPayment('payment_1');

    expect(prisma.enrollment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          paymentId: 'payment_1',
          enrollmentStatus: 'PENDING_PAYMENT',
        }),
        data: expect.objectContaining({
          enrollmentStatus: 'ACTIVE',
          paymentStatus: 'CAPTURED',
        }),
      }),
    );
    expect(
      operationalNotificationService.notifyTrainingEnrollmentConfirmed,
    ).toHaveBeenCalledTimes(1);
    expect(
      operationalNotificationService.queueTrainingScheduleReminder,
    ).toHaveBeenCalledTimes(1);
  });

  it('marks payment status failed/expired without activating enrollment', async () => {
    await service.markEnrollmentPaymentFailed('payment_2');
    await service.markEnrollmentPaymentExpired('payment_3');

    expect(prisma.enrollment.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          paymentId: 'payment_2',
        }),
        data: expect.objectContaining({
          paymentStatus: 'FAILED',
        }),
      }),
    );

    expect(prisma.enrollment.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          paymentId: 'payment_3',
        }),
        data: expect.objectContaining({
          paymentStatus: 'EXPIRED',
        }),
      }),
    );
  });
});

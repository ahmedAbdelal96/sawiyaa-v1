import {
  ManualPaymentSubmissionStatus,
  PaymentProvider,
  PaymentStatus,
} from '@prisma/client';
import { ManualPaymentService } from './manual-payment.service';

describe('ManualPaymentService decision concurrency', () => {
  it('re-reads the submission after the payment advisory lock', async () => {
    const tx = {
      $executeRaw: jest.fn(),
      manualPaymentSubmission: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ paymentId: 'payment-1' })
          .mockResolvedValueOnce({
            id: 'submission-1',
            paymentId: 'payment-1',
            status: ManualPaymentSubmissionStatus.REJECTED,
            reviewedAt: new Date(),
            payment: { provider: PaymentProvider.MANUAL, status: PaymentStatus.CREATED },
          }),
      },
      academyProgramEnrollment: {
        findUnique: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const service = new ManualPaymentService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.reject({
        id: 'submission-1',
        payload: { reason: 'already decided' },
        actor: { id: 'admin-1' },
      }),
    ).rejects.toMatchObject({
      response: { error: 'MANUAL_PAYMENT_SUBMISSION_NOT_REVIEWABLE' },
    });

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.manualPaymentSubmission.findUnique).toHaveBeenCalledTimes(2);
    expect(tx.academyProgramEnrollment.findUnique).not.toHaveBeenCalled();
  });
});

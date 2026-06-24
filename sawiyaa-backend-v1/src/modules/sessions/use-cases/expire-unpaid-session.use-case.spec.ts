import { SessionStatus } from '@prisma/client';
import { CustomerWalletAccountingService } from '@modules/customer-wallets/services/customer-wallet-accounting.service';
import { PaymentRepository } from '@modules/payments/repositories/payment.repository';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionRepository } from '../repositories/session.repository';
import { ValidateSessionStatusTransitionService } from '../services/validate-session-status-transition.service';
import { ExpireUnpaidSessionUseCase } from './expire-unpaid-session.use-case';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';

describe('ExpireUnpaidSessionUseCase', () => {
  it('expires the session and cancels any future reminders', async () => {
    const sessionRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'session-1',
        status: SessionStatus.PENDING_PAYMENT,
      }),
      updateStatus: jest.fn().mockResolvedValue({
        id: 'session-1',
        status: SessionStatus.EXPIRED,
      }),
      createEvent: jest.fn().mockResolvedValue(undefined),
    } as unknown as SessionRepository;

    const validateSessionStatusTransitionService = {
      assertCanTransition: jest.fn(),
    } as unknown as ValidateSessionStatusTransitionService;

    const paymentRepository = {
      updateStatus: jest.fn().mockResolvedValue(undefined),
      createEvent: jest.fn().mockResolvedValue(undefined),
    } as unknown as PaymentRepository;

    const customerWalletAccountingService = {
      releaseReservationForPayment: jest.fn().mockResolvedValue(undefined),
    } as unknown as CustomerWalletAccountingService;

    const operationalNotificationService = {
      cancelSessionReminders: jest.fn().mockResolvedValue(undefined),
    } as unknown as OperationalNotificationService;

    const prisma = {
      $transaction: jest.fn().mockImplementation(async (fn: (...args: any[]) => any) => fn({ payment: { findMany: jest.fn().mockResolvedValue([]) } })),
    } as unknown as PrismaService;

    const useCase = new ExpireUnpaidSessionUseCase(
      prisma,
      sessionRepository,
      validateSessionStatusTransitionService,
      paymentRepository,
      customerWalletAccountingService,
      operationalNotificationService,
    );

    const result = await useCase.execute({ sessionId: 'session-1' });

    expect(result.status).toBe(SessionStatus.EXPIRED);
    expect(operationalNotificationService.cancelSessionReminders).toHaveBeenCalledWith(
      {
        sessionId: 'session-1',
        cancelledAt: expect.any(Date),
      },
    );
  });
});

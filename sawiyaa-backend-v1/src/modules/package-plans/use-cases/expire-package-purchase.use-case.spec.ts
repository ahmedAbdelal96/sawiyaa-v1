import { NotFoundException } from '@nestjs/common';
import { SessionEventType, SessionStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { ExpirePackagePurchaseUseCase } from './expire-package-purchase.use-case';

describe('ExpirePackagePurchaseUseCase', () => {
  const sessionRepository = {
    updateStatus: jest.fn(),
    createEvent: jest.fn(),
  } as never;
  const packagePurchaseRepository = {
    findById: jest.fn(),
    updateExpiryStatus: jest.fn(),
  } as never;
  const prisma = {
    $transaction: jest.fn(async (callback: (tx: never) => Promise<unknown>) =>
      callback({} as never),
    ),
  } as unknown as PrismaService;

  const useCase = new ExpirePackagePurchaseUseCase(
    prisma,
    packagePurchaseRepository,
    sessionRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('expires a pending purchase and its linked pending sessions', async () => {
    (packagePurchaseRepository.findById as jest.Mock).mockResolvedValue({
      id: 'purchase-1',
      status: 'PENDING_PAYMENT',
      paymentExpiresAt: new Date('2026-01-01T00:00:00.000Z'),
      sessions: [
        { id: 'session-1', status: SessionStatus.PENDING_PAYMENT },
        { id: 'session-2', status: SessionStatus.PENDING_PAYMENT },
      ],
    });
    (
      packagePurchaseRepository.updateExpiryStatus as jest.Mock
    ).mockResolvedValue({
      id: 'purchase-1',
      status: 'EXPIRED',
      sessions: [
        { id: 'session-1', status: SessionStatus.PENDING_PAYMENT },
        { id: 'session-2', status: SessionStatus.PENDING_PAYMENT },
      ],
    });
    (sessionRepository.updateStatus as jest.Mock).mockResolvedValue({});
    (sessionRepository.createEvent as jest.Mock).mockResolvedValue({});

    const result = await useCase.execute({
      purchaseId: 'purchase-1',
      now: new Date('2026-01-01T00:15:00.000Z'),
    });

    expect(result.expired).toBe(true);
    expect(packagePurchaseRepository.updateExpiryStatus).toHaveBeenCalledWith(
      'purchase-1',
      {
        status: 'EXPIRED',
        expiredAt: new Date('2026-01-01T00:15:00.000Z'),
      },
      expect.anything(),
    );
    expect(sessionRepository.updateStatus).toHaveBeenCalledTimes(2);
    expect(sessionRepository.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: SessionEventType.EXPIRED_UNPAID,
      }),
      expect.anything(),
    );
  });

  it('is idempotent for already expired purchases', async () => {
    (packagePurchaseRepository.findById as jest.Mock)
      .mockResolvedValueOnce({
        id: 'purchase-1',
        status: 'PENDING_PAYMENT',
        paymentExpiresAt: new Date('2026-01-01T00:00:00.000Z'),
        sessions: [],
      })
      .mockResolvedValueOnce({
        id: 'purchase-1',
        status: 'EXPIRED',
        paymentExpiresAt: new Date('2026-01-01T00:00:00.000Z'),
        sessions: [],
      });
    (
      packagePurchaseRepository.updateExpiryStatus as jest.Mock
    ).mockResolvedValue({
      id: 'purchase-1',
      status: 'EXPIRED',
      sessions: [],
    });

    await useCase.execute({
      purchaseId: 'purchase-1',
      now: new Date('2026-01-01T00:15:00.000Z'),
    });
    const second = await useCase.execute({
      purchaseId: 'purchase-1',
      now: new Date('2026-01-01T00:15:00.000Z'),
    });

    expect(second.expired).toBe(false);
    expect(packagePurchaseRepository.updateExpiryStatus).toHaveBeenCalledTimes(
      1,
    );
    expect(sessionRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('ignores active purchases', async () => {
    (packagePurchaseRepository.findById as jest.Mock).mockResolvedValue({
      id: 'purchase-1',
      status: 'ACTIVE',
      paymentExpiresAt: new Date('2026-01-01T00:00:00.000Z'),
      sessions: [],
    });

    const result = await useCase.execute({
      purchaseId: 'purchase-1',
      now: new Date('2026-01-01T00:15:00.000Z'),
    });

    expect(result.expired).toBe(false);
    expect(packagePurchaseRepository.updateExpiryStatus).not.toHaveBeenCalled();
  });

  it('throws when the purchase does not exist', async () => {
    (packagePurchaseRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        purchaseId: 'missing',
        now: new Date('2026-01-01T00:15:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

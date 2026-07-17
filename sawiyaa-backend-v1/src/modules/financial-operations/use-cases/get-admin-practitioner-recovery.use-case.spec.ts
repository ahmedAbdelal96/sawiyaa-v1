import { NotFoundException } from '@nestjs/common';
import { PractitionerRecoveryRepository } from '../repositories/practitioner-recovery.repository';
import { PractitionerRecoveryPresenter } from '../presenters/practitioner-recovery.presenter';
import { GetAdminPractitionerRecoveryUseCase } from './get-admin-practitioner-recovery.use-case';
import { PractitionerRecoveryStatus } from '@prisma/client';

describe('GetAdminPractitionerRecoveryUseCase', () => {
  function buildUseCase(existingRecovery: Record<string, unknown> | null) {
    const recoveryRepository = {
      findById: jest.fn().mockResolvedValue(existingRecovery),
    } as unknown as PractitionerRecoveryRepository;

    const presenter = {
      presentDetailItem: jest.fn().mockImplementation((row) => ({
        recoveryId: row.id,
        practitioner: { practitionerId: row.practitionerId },
        session: { sessionId: row.sessionId },
        payment: null,
        refund: null,
        sessionEarningReview: null,
        settlement: null,
        payoutId: null,
        amount: '100.00',
        recoveredAmount: '40.00',
        remainingAmount: '60.00',
        currencyCode: 'EGP',
        status: PractitionerRecoveryStatus.OPEN,
        reasonCode: 'REFUND_AFTER_PAYOUT',
        createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
        resolvedAt: null,
        internalReason: null,
        practitionerFacingNote: null,
        createdBy: null,
        resolvedBy: null,
        actionHistory: [],
      })),
      presentDetail: jest.fn().mockImplementation((item) => ({ item })),
    } as unknown as PractitionerRecoveryPresenter;

    return {
      useCase: new GetAdminPractitionerRecoveryUseCase(
        recoveryRepository,
        presenter,
      ),
      recoveryRepository,
      presenter,
    };
  }

  it('returns a linked recovery context', async () => {
    const setup = buildUseCase({
      id: 'recovery_1',
      practitionerId: 'pract_1',
    });

    const result = await setup.useCase.execute({ recoveryId: 'recovery_1' });

    expect(setup.recoveryRepository.findById).toHaveBeenCalledWith('recovery_1');
    expect(result.item.recoveryId).toBe('recovery_1');
    expect(result.item.practitioner.practitionerId).toBe('pract_1');
  });

  it('throws not found when the recovery does not exist', async () => {
    const setup = buildUseCase(null);

    await expect(setup.useCase.execute({ recoveryId: 'missing' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

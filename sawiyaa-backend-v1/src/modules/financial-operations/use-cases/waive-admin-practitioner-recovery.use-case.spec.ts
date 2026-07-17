import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { PractitionerRecoveryRepository } from '../repositories/practitioner-recovery.repository';
import { PractitionerRecoveryPresenter } from '../presenters/practitioner-recovery.presenter';
import { PractitionerRecoveryService } from '../services/practitioner-recovery.service';
import { WaiveAdminPractitionerRecoveryUseCase } from './waive-admin-practitioner-recovery.use-case';

describe('WaiveAdminPractitionerRecoveryUseCase', () => {
  function buildUseCase(existingRecovery: Record<string, unknown> | null) {
    const recoveryRepository = {
      findById: jest.fn().mockResolvedValue(existingRecovery),
    } as unknown as PractitionerRecoveryRepository;

    const recoveryService = {
      waiveRecovery: jest.fn().mockResolvedValue({
        wasAlreadyRecorded: false,
        item: {
          id: 'recovery_1',
        },
      }),
    } as unknown as PractitionerRecoveryService;

    const presenter = {
      presentDetailItem: jest.fn().mockImplementation((row) => ({
        recoveryId: row.id,
      })),
    } as unknown as PractitionerRecoveryPresenter;

    const prisma = {
      $transaction: jest.fn(async (callback: (tx: never) => Promise<unknown>) => callback(undefined as never)),
    } as unknown as PrismaService;

    return {
      useCase: new WaiveAdminPractitionerRecoveryUseCase(
        prisma,
        recoveryRepository,
        recoveryService,
        presenter,
      ),
      recoveryRepository,
      recoveryService,
      presenter,
      prisma,
    };
  }

  it('returns the updated recovery after waiver', async () => {
    const setup = buildUseCase({
      id: 'recovery_1',
    });

    const result = await setup.useCase.execute({
      recoveryId: 'recovery_1',
      operatorUserId: 'admin_1',
      body: {
        reason: 'manual correction',
        idempotencyKey: 'waive-1',
      },
    });

    expect(setup.recoveryRepository.findById).toHaveBeenCalledWith('recovery_1');
    expect(setup.recoveryService.waiveRecovery).toHaveBeenCalledWith(
      expect.objectContaining({
        recoveryId: 'recovery_1',
        operatorUserId: 'admin_1',
        reason: 'manual correction',
        idempotencyKey: 'waive-1',
      }),
    );
    expect(setup.presenter.presentDetailItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'recovery_1' }),
    );
    expect(result.item.recoveryId).toBe('recovery_1');
  });

  it('throws not found when the recovery does not exist', async () => {
    const setup = buildUseCase(null);

    await expect(
      setup.useCase.execute({
        recoveryId: 'missing',
        operatorUserId: 'admin_1',
        body: {
          reason: 'manual correction',
          idempotencyKey: 'waive-2',
        },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

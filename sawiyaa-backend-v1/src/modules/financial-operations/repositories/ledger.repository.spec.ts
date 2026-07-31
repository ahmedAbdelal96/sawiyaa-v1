import { BadRequestException } from '@nestjs/common';
import { LedgerRepository } from './ledger.repository';

describe('LedgerRepository classification boundaries', () => {
  it('disables legacy assignment of existing earnings into settlements', async () => {
    const repository = new LedgerRepository({} as never);

    await expect(
      repository.assignEntriesToSettlement(
        ['ledger-1'],
        'settlement-1',
        {} as never,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('keeps settlement references when releasing a credited earning', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'ledger-1',
        settlementId: 'settlement-1',
        balanceBucket: 'RESERVED',
      },
    ]);
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const tx = {
      ledgerEntry: { findMany, updateMany },
      ledgerClassificationEvent: { createMany },
    };
    const repository = new LedgerRepository({} as never);

    await repository.releaseSettlementEntries('settlement-1', tx as never);

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { balanceBucket: 'AVAILABLE' },
      }),
    );
    expect(createMany.mock.calls[0][0].data[0]).toMatchObject({
      previousSettlementId: 'settlement-1',
      newSettlementId: 'settlement-1',
    });
  });
});

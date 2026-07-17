import { LedgerRepository } from './ledger.repository';

describe('LedgerRepository classification boundaries', () => {
  it('records assignment and release through the supplied transaction', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValueOnce([
        { id: 'ledger-1', settlementId: null, balanceBucket: 'AVAILABLE' },
      ])
      .mockResolvedValueOnce([
        { id: 'ledger-1', settlementId: 'settlement-1', balanceBucket: 'RESERVED' },
      ]);
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const tx = {
      ledgerEntry: { findMany, updateMany },
      ledgerClassificationEvent: { createMany },
    };
    const repository = new LedgerRepository({} as never);

    await repository.assignEntriesToSettlement(['ledger-1'], 'settlement-1', tx as never);
    await repository.releaseSettlementEntries('settlement-1', tx as never);

    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(createMany).toHaveBeenCalledTimes(2);
    expect(createMany.mock.calls[0][0].data[0]).toMatchObject({
      ledgerEntryId: 'ledger-1',
      previousSettlementId: null,
      newSettlementId: 'settlement-1',
      previousBalanceBucket: 'AVAILABLE',
      newBalanceBucket: 'RESERVED',
    });
    expect(createMany.mock.calls[1][0].data[0]).toMatchObject({
      ledgerEntryId: 'ledger-1',
      previousSettlementId: 'settlement-1',
      newSettlementId: null,
      previousBalanceBucket: 'RESERVED',
      newBalanceBucket: 'AVAILABLE',
    });
  });

  it('does not append a misleading event for an identical assignment', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const createMany = jest.fn();
    const tx = {
      ledgerEntry: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'ledger-1', settlementId: 'settlement-1', balanceBucket: 'RESERVED' },
        ]),
        updateMany,
      },
      ledgerClassificationEvent: { createMany },
    };
    const repository = new LedgerRepository({} as never);

    await repository.assignEntriesToSettlement(['ledger-1'], 'settlement-1', tx as never);

    expect(updateMany).toHaveBeenCalledWith({ where: { id: { in: [] } }, data: {
      settlementId: 'settlement-1',
      balanceBucket: 'RESERVED',
    }});
    expect(createMany).not.toHaveBeenCalled();
  });
});

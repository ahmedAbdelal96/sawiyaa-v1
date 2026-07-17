import { LedgerClassificationEventRepository } from './ledger-classification-event.repository';

describe('LedgerClassificationEventRepository', () => {
  it('is append-only and queries entries in chronological order', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'event-1' });
    const findMany = jest.fn().mockResolvedValue([]);
    const repository = new LedgerClassificationEventRepository({
      ledgerClassificationEvent: { create, findMany },
    } as never);

    await repository.append({
      ledgerEntryId: 'ledger-1',
      previousSettlementId: null,
      newSettlementId: 'settlement-1',
      previousBalanceBucket: 'AVAILABLE',
      newBalanceBucket: 'RESERVED',
      actionType: 'ASSIGNED_TO_SETTLEMENT',
      actorType: 'SYSTEM',
      source: 'SYSTEM',
      reason: 'settlement-reservation',
    });
    await repository.listByLedgerEntryId('ledger-1');

    expect(create).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith({
      where: { ledgerEntryId: 'ledger-1' },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    });
    expect(Object.getOwnPropertyNames(LedgerClassificationEventRepository.prototype)).not.toEqual(
      expect.arrayContaining(['update', 'updateMany', 'delete', 'deleteMany']),
    );
  });
});

import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ListAdminLedgerExplorerUseCase } from './list-admin-ledger-explorer.use-case';

describe('ListAdminLedgerExplorerUseCase', () => {
  it('maps ledger rows and pagination', async () => {
    const repository = {
      listLedgerLines: jest.fn().mockResolvedValue([
        [
          {
            id: 'line-1',
            journalEntryId: 'journal-1',
            createdAt: new Date('2026-04-22T10:00:00.000Z'),
            direction: 'DEBIT',
            amount: new Prisma.Decimal('12.50'),
            memo: 'Gateway fee',
            referenceType: 'payment',
            referenceId: 'payment-1',
            journalEntry: {
              sourceType: 'PAYMENT_CAPTURED',
              sourceId: 'payment-1',
              occurredAt: new Date('2026-04-22T09:00:00.000Z'),
              currencyCode: 'EGP',
            },
            ledgerAccount: {
              code: 'GATEWAY_FEES_EXPENSE',
              name: 'Gateway fees expense',
              scope: 'SYSTEM',
              practitionerId: null,
            },
            ledgerAccountId: 'account-1',
          },
        ],
        1,
      ]),
    };

    const useCase = new ListAdminLedgerExplorerUseCase(repository as never);
    const result = await useCase.execute({
      page: 1,
      limit: 20,
      currencyCode: 'egp',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'line-1',
      journalEntryId: 'journal-1',
      sourceType: 'PAYMENT_CAPTURED',
      currencyCode: 'EGP',
      amount: '12.50',
      ledgerAccountCode: 'GATEWAY_FEES_EXPENSE',
    });
    expect(result.pagination.totalItems).toBe(1);
    expect(result.filters.currencyCode).toBe('EGP');
  });

  it('throws when from is greater than to', async () => {
    const repository = {
      listLedgerLines: jest.fn(),
    };

    const useCase = new ListAdminLedgerExplorerUseCase(repository as never);

    await expect(
      useCase.execute({
        from: '2026-04-23T00:00:00.000Z',
        to: '2026-04-22T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});


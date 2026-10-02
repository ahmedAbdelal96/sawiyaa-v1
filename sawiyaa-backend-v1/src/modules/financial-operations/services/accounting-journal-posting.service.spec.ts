import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Prisma } from '@prisma/client';
import { AccountingJournalPostingService } from './accounting-journal-posting.service';

describe('AccountingJournalPostingService append-only boundary', () => {
  it('creates journal entries and lines without runtime update/delete calls', () => {
    const source = readFileSync(
      resolve(__dirname, 'accounting-journal-posting.service.ts'),
      'utf8',
    );

    expect(source).toContain('tx.journalEntry.create');
    expect(source).toContain('tx.journalLine.createMany');
    expect(source).not.toMatch(/journalEntry\.(update|updateMany|delete|deleteMany)/);
    expect(source).not.toMatch(/journalLine\.(update|updateMany|delete|deleteMany)/);
    expect(source).toContain('this.assertBalanced(lines)');
  });
});

describe('AccountingJournalPostingService refund VAT allocation', () => {
  it('makes cumulative partial reversals equal the original VAT exactly', async () => {
    const service = Object.create(
      AccountingJournalPostingService.prototype,
    ) as AccountingJournalPostingService;
    Object.assign(service as any, {
      moneyAmountService: {
        toDecimal: (value: Prisma.Decimal | string) =>
          new Prisma.Decimal(value),
      },
    });
    const calculate = (service as any).calculateRefundVatReversal.bind(service);
    const payment = {
      amountTotal: new Prisma.Decimal('500.00'),
      vatAmountSnapshot: new Prisma.Decimal('14.00'),
    };
    const run = async (prior: string, amount: string, refundId: string) =>
      calculate({
        paymentId: 'payment-1',
        refundId,
        refundAmount: new Prisma.Decimal(amount),
        tx: {
          payment: { findUniqueOrThrow: jest.fn().mockResolvedValue(payment) },
          refund: {
            aggregate: jest.fn().mockResolvedValue({
              _sum: { amount: new Prisma.Decimal(prior) },
            }),
          },
        },
      });

    const first = await run('0.00', '100.00', 'refund-1');
    const second = await run('100.00', '150.00', 'refund-2');
    const third = await run('250.00', '250.00', 'refund-3');

    expect(first.toFixed(2)).toBe('2.80');
    expect(second.toFixed(2)).toBe('4.20');
    expect(third.toFixed(2)).toBe('7.00');
    expect(first.add(second).add(third).toFixed(2)).toBe('14.00');
  });
});

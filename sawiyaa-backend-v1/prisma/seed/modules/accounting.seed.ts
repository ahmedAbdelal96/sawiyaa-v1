import {
  JournalEntrySourceType,
  JournalEntryStatus,
  LedgerAccountScope,
  LedgerAccountType,
  LedgerDirection,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { createHash } from 'crypto';
import { seedIds } from '../shared/seed.constants';
import { SeedModule } from '../shared/seed.types';
import { daysAgo } from '../shared/seed.utils';

type SeedJournalLine = {
  accountCode: string;
  direction: LedgerDirection;
  amount: number;
  memo: string;
  referenceType: string;
  referenceId: string;
};

type SeedJournalEntry = {
  sourceType: JournalEntrySourceType;
  sourceId: string;
  occurredAt: Date;
  currencyCode: string;
  description: string;
  metadataJson: Prisma.InputJsonValue;
  lines: SeedJournalLine[];
};

type PlatformAccountSeed = {
  code: string;
  name: string;
  accountType: LedgerAccountType;
  scope: LedgerAccountScope;
};

const PLATFORM_ACCOUNTS: PlatformAccountSeed[] = [
  {
    code: 'ASSET_PLATFORM_CASH',
    name: 'Platform Cash',
    accountType: LedgerAccountType.ASSET,
    scope: LedgerAccountScope.PLATFORM,
  },
  {
    code: 'ASSET_GATEWAY_CLEARING',
    name: 'Gateway Clearing',
    accountType: LedgerAccountType.ASSET,
    scope: LedgerAccountScope.PLATFORM,
  },
  {
    code: 'REVENUE_PLATFORM_COMMISSION',
    name: 'Platform Revenue',
    accountType: LedgerAccountType.REVENUE,
    scope: LedgerAccountScope.PLATFORM,
  },
  {
    code: 'REVENUE_TRANSFER_FEE_RECOVERY',
    name: 'Transfer Fee Recovery Revenue',
    accountType: LedgerAccountType.REVENUE,
    scope: LedgerAccountScope.PLATFORM,
  },
  {
    code: 'LIABILITY_CUSTOMER_WALLET',
    name: 'Customer Wallet Liability',
    accountType: LedgerAccountType.LIABILITY,
    scope: LedgerAccountScope.PLATFORM,
  },
  {
    code: 'LIABILITY_VAT_PAYABLE',
    name: 'VAT Payable',
    accountType: LedgerAccountType.LIABILITY,
    scope: LedgerAccountScope.SYSTEM,
  },
  {
    code: 'EXPENSE_GATEWAY_FEES',
    name: 'Gateway Fees Expense',
    accountType: LedgerAccountType.EXPENSE,
    scope: LedgerAccountScope.PLATFORM,
  },
  {
    code: 'EXPENSE_TRANSFER_FEES',
    name: 'Transfer Fees Expense',
    accountType: LedgerAccountType.EXPENSE,
    scope: LedgerAccountScope.PLATFORM,
  },
  {
    code: 'EXPENSE_REFUND_ADJUSTMENTS',
    name: 'Refund Adjustments',
    accountType: LedgerAccountType.EXPENSE,
    scope: LedgerAccountScope.SYSTEM,
  },
];

const ACCOUNTING_CURRENCY = 'USD';

function uuid(seed: string): string {
  const h = createHash('md5').update(seed).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function money(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(2);
}

function practitionerPayableCode(practitionerId: string): string {
  return `LIABILITY_PRACTITIONER_PAYABLE:${practitionerId}`;
}

function assertBalanced(lines: SeedJournalLine[]) {
  const debit = lines
    .filter((line) => line.direction === LedgerDirection.DEBIT)
    .reduce((sum, line) => sum.add(money(line.amount)), new Prisma.Decimal(0));
  const credit = lines
    .filter((line) => line.direction === LedgerDirection.CREDIT)
    .reduce((sum, line) => sum.add(money(line.amount)), new Prisma.Decimal(0));

  if (!debit.equals(credit)) {
    throw new Error(
      `[seed:accounting] unbalanced journal lines. debit=${debit.toFixed(2)} credit=${credit.toFixed(2)}`,
    );
  }
}

export const accountingSeedModule: SeedModule = {
  name: 'accounting',
  async run(prisma: PrismaClient): Promise<void> {
    const practitioners = [
      seedIds.practitionerProfiles.practitionerB,
      seedIds.practitionerProfiles.practitionerE,
      seedIds.practitionerProfiles.practitionerF,
    ];

    const accountIdByCode = new Map<string, string>();

    await prisma.$transaction(async (tx) => {
      for (const account of PLATFORM_ACCOUNTS) {
        const record = await tx.ledgerAccount.upsert({
          where: {
            code_currencyCode: {
              code: account.code,
              currencyCode: ACCOUNTING_CURRENCY,
            },
          },
          create: {
            id: uuid(`seed-ledger-account-${account.code}-${ACCOUNTING_CURRENCY}`),
            code: account.code,
            name: account.name,
            accountType: account.accountType,
            scope: account.scope,
            currencyCode: ACCOUNTING_CURRENCY,
            isSystem: true,
            isActive: true,
          },
          update: {
            name: account.name,
            accountType: account.accountType,
            scope: account.scope,
            isSystem: true,
            isActive: true,
          },
        });
        accountIdByCode.set(record.code, record.id);
      }

      for (const practitionerId of practitioners) {
        const code = practitionerPayableCode(practitionerId);
        const record = await tx.ledgerAccount.upsert({
          where: {
            code_currencyCode: {
              code,
              currencyCode: ACCOUNTING_CURRENCY,
            },
          },
          create: {
            id: uuid(`seed-ledger-account-${code}-${ACCOUNTING_CURRENCY}`),
            code,
            name: 'Practitioner Payable',
            accountType: LedgerAccountType.LIABILITY,
            scope: LedgerAccountScope.PRACTITIONER,
            currencyCode: ACCOUNTING_CURRENCY,
            practitionerId,
            isSystem: true,
            isActive: true,
          },
          update: {
            name: 'Practitioner Payable',
            accountType: LedgerAccountType.LIABILITY,
            scope: LedgerAccountScope.PRACTITIONER,
            practitionerId,
            isSystem: true,
            isActive: true,
          },
        });
        accountIdByCode.set(record.code, record.id);
      }

      const events: SeedJournalEntry[] = [
        {
          sourceType: JournalEntrySourceType.PAYMENT_CAPTURED,
          sourceId: 'seed-payment-captured-001',
          occurredAt: daysAgo(26),
          currencyCode: ACCOUNTING_CURRENCY,
          description: 'Seed payment captured accounting posting.',
          metadataJson: {
            postingVersion: 2,
            source: 'payment-captured-seed',
            amountTotal: '1200.00',
            amountFromGateway: '1000.00',
            amountFromWallet: '200.00',
            practitionerShareAmount: '900.00',
            platformCommissionAmount: '300.00',
            gatewayFeeAmount: '25.00',
            gatewayFeeRatePercent: '2.50',
            gatewayFeeFixedAmount: '0.00',
            vatAmount: '45.00',
            vatRatePercent: '15.00',
          },
          lines: [
            {
              accountCode: 'ASSET_GATEWAY_CLEARING',
              direction: LedgerDirection.DEBIT,
              amount: 1000,
              memo: 'Increase gateway clearing for captured online payment funds.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-001',
            },
            {
              accountCode: 'REVENUE_PLATFORM_COMMISSION',
              direction: LedgerDirection.CREDIT,
              amount: 300,
              memo: 'Recognize platform commission on captured payment.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-001',
            },
            {
              accountCode: practitionerPayableCode(seedIds.practitionerProfiles.practitionerB),
              direction: LedgerDirection.CREDIT,
              amount: 900,
              memo: 'Recognize practitioner payable on captured payment.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-001',
            },
            {
              accountCode: 'LIABILITY_CUSTOMER_WALLET',
              direction: LedgerDirection.DEBIT,
              amount: 200,
              memo: 'Reduce customer wallet liability for wallet-funded payment share.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-001',
            },
            {
              accountCode: 'EXPENSE_GATEWAY_FEES',
              direction: LedgerDirection.DEBIT,
              amount: 25,
              memo: 'Recognize gateway fee expense for captured payment.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-001',
            },
            {
              accountCode: 'ASSET_GATEWAY_CLEARING',
              direction: LedgerDirection.CREDIT,
              amount: 25,
              memo: 'Reduce gateway clearing by captured gateway fee.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-001',
            },
            {
              accountCode: 'LIABILITY_VAT_PAYABLE',
              direction: LedgerDirection.CREDIT,
              amount: 45,
              memo: 'Recognize VAT payable at payment capture.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-001',
            },
            {
              accountCode: 'REVENUE_PLATFORM_COMMISSION',
              direction: LedgerDirection.DEBIT,
              amount: 45,
              memo: 'Reclassify VAT portion from gross platform revenue.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-001',
            },
          ],
        },
        {
          sourceType: JournalEntrySourceType.PAYMENT_CAPTURED,
          sourceId: 'seed-payment-captured-002',
          occurredAt: daysAgo(22),
          currencyCode: ACCOUNTING_CURRENCY,
          description: 'Seed payment captured accounting posting.',
          metadataJson: {
            postingVersion: 2,
            source: 'payment-captured-seed',
            amountTotal: '900.00',
            amountFromGateway: '900.00',
            amountFromWallet: '0.00',
            practitionerShareAmount: '675.00',
            platformCommissionAmount: '225.00',
            gatewayFeeAmount: '18.00',
            gatewayFeeRatePercent: '2.00',
            gatewayFeeFixedAmount: '0.00',
            vatAmount: '33.75',
            vatRatePercent: '15.00',
          },
          lines: [
            {
              accountCode: 'ASSET_GATEWAY_CLEARING',
              direction: LedgerDirection.DEBIT,
              amount: 900,
              memo: 'Increase gateway clearing for captured online payment funds.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-002',
            },
            {
              accountCode: 'REVENUE_PLATFORM_COMMISSION',
              direction: LedgerDirection.CREDIT,
              amount: 225,
              memo: 'Recognize platform commission on captured payment.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-002',
            },
            {
              accountCode: practitionerPayableCode(seedIds.practitionerProfiles.practitionerE),
              direction: LedgerDirection.CREDIT,
              amount: 675,
              memo: 'Recognize practitioner payable on captured payment.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-002',
            },
            {
              accountCode: 'EXPENSE_GATEWAY_FEES',
              direction: LedgerDirection.DEBIT,
              amount: 18,
              memo: 'Recognize gateway fee expense for captured payment.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-002',
            },
            {
              accountCode: 'ASSET_GATEWAY_CLEARING',
              direction: LedgerDirection.CREDIT,
              amount: 18,
              memo: 'Reduce gateway clearing by captured gateway fee.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-002',
            },
            {
              accountCode: 'LIABILITY_VAT_PAYABLE',
              direction: LedgerDirection.CREDIT,
              amount: 33.75,
              memo: 'Recognize VAT payable at payment capture.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-002',
            },
            {
              accountCode: 'REVENUE_PLATFORM_COMMISSION',
              direction: LedgerDirection.DEBIT,
              amount: 33.75,
              memo: 'Reclassify VAT portion from gross platform revenue.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-002',
            },
          ],
        },
        {
          sourceType: JournalEntrySourceType.PAYMENT_CAPTURED,
          sourceId: 'seed-payment-captured-003',
          occurredAt: daysAgo(18),
          currencyCode: ACCOUNTING_CURRENCY,
          description: 'Seed payment captured accounting posting.',
          metadataJson: {
            postingVersion: 2,
            source: 'payment-captured-seed',
            amountTotal: '1500.00',
            amountFromGateway: '1500.00',
            amountFromWallet: '0.00',
            practitionerShareAmount: '1125.00',
            platformCommissionAmount: '375.00',
            gatewayFeeAmount: '30.00',
            gatewayFeeRatePercent: '2.00',
            gatewayFeeFixedAmount: '0.00',
            vatAmount: '56.25',
            vatRatePercent: '15.00',
          },
          lines: [
            {
              accountCode: 'ASSET_GATEWAY_CLEARING',
              direction: LedgerDirection.DEBIT,
              amount: 1500,
              memo: 'Increase gateway clearing for captured online payment funds.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-003',
            },
            {
              accountCode: 'REVENUE_PLATFORM_COMMISSION',
              direction: LedgerDirection.CREDIT,
              amount: 375,
              memo: 'Recognize platform commission on captured payment.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-003',
            },
            {
              accountCode: practitionerPayableCode(seedIds.practitionerProfiles.practitionerF),
              direction: LedgerDirection.CREDIT,
              amount: 1125,
              memo: 'Recognize practitioner payable on captured payment.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-003',
            },
            {
              accountCode: 'EXPENSE_GATEWAY_FEES',
              direction: LedgerDirection.DEBIT,
              amount: 30,
              memo: 'Recognize gateway fee expense for captured payment.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-003',
            },
            {
              accountCode: 'ASSET_GATEWAY_CLEARING',
              direction: LedgerDirection.CREDIT,
              amount: 30,
              memo: 'Reduce gateway clearing by captured gateway fee.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-003',
            },
            {
              accountCode: 'LIABILITY_VAT_PAYABLE',
              direction: LedgerDirection.CREDIT,
              amount: 56.25,
              memo: 'Recognize VAT payable at payment capture.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-003',
            },
            {
              accountCode: 'REVENUE_PLATFORM_COMMISSION',
              direction: LedgerDirection.DEBIT,
              amount: 56.25,
              memo: 'Reclassify VAT portion from gross platform revenue.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-003',
            },
          ],
        },
        {
          sourceType: JournalEntrySourceType.REFUND_SUCCEEDED,
          sourceId: 'seed-refund-succeeded-001',
          occurredAt: daysAgo(15),
          currencyCode: ACCOUNTING_CURRENCY,
          description: 'Seed refund succeeded accounting posting.',
          metadataJson: {
            postingVersion: 2,
            source: 'refund-succeeded-seed',
            paymentId: 'seed-payment-captured-002',
            destination: 'ORIGINAL_METHOD',
            refundAmount: '200.00',
            practitionerRefundAmount: '150.00',
            platformRefundAmount: '50.00',
          },
          lines: [
            {
              accountCode: practitionerPayableCode(seedIds.practitionerProfiles.practitionerE),
              direction: LedgerDirection.DEBIT,
              amount: 150,
              memo: 'Reverse practitioner payable for successful refund.',
              referenceType: 'refund',
              referenceId: 'seed-refund-succeeded-001',
            },
            {
              accountCode: 'REVENUE_PLATFORM_COMMISSION',
              direction: LedgerDirection.DEBIT,
              amount: 50,
              memo: 'Reverse platform commission for successful refund.',
              referenceType: 'refund',
              referenceId: 'seed-refund-succeeded-001',
            },
            {
              accountCode: 'ASSET_GATEWAY_CLEARING',
              direction: LedgerDirection.CREDIT,
              amount: 200,
              memo: 'Reduce gateway clearing for original-method refund.',
              referenceType: 'refund',
              referenceId: 'seed-refund-succeeded-001',
            },
          ],
        },
        {
          sourceType: JournalEntrySourceType.PRACTITIONER_PAYOUT,
          sourceId: 'seed-practitioner-payout-001',
          occurredAt: daysAgo(12),
          currencyCode: ACCOUNTING_CURRENCY,
          description: 'Seed practitioner payout accounting posting.',
          metadataJson: {
            postingVersion: 2,
            source: 'practitioner-payout-seed',
            settlementId: 'seed-settlement-001',
            amountPaid: '600.00',
            settlementAppliedAmount: '600.00',
            transferFeeAmount: '15.00',
            transferFeeTreatment: 'PLATFORM_EXPENSE',
          },
          lines: [
            {
              accountCode: practitionerPayableCode(seedIds.practitionerProfiles.practitionerE),
              direction: LedgerDirection.DEBIT,
              amount: 600,
              memo: 'Settle practitioner payable via payout.',
              referenceType: 'settlement_payout',
              referenceId: 'seed-practitioner-payout-001',
            },
            {
              accountCode: 'ASSET_PLATFORM_CASH',
              direction: LedgerDirection.CREDIT,
              amount: 600,
              memo: 'Cash outflow for practitioner payout.',
              referenceType: 'settlement_payout',
              referenceId: 'seed-practitioner-payout-001',
            },
            {
              accountCode: 'EXPENSE_TRANSFER_FEES',
              direction: LedgerDirection.DEBIT,
              amount: 15,
              memo: 'Recognize transfer fee expense for practitioner payout.',
              referenceType: 'settlement_payout',
              referenceId: 'seed-practitioner-payout-001',
            },
            {
              accountCode: 'ASSET_PLATFORM_CASH',
              direction: LedgerDirection.CREDIT,
              amount: 15,
              memo: 'Cash outflow for payout transfer fee.',
              referenceType: 'settlement_payout',
              referenceId: 'seed-practitioner-payout-001',
            },
          ],
        },
        {
          sourceType: JournalEntrySourceType.PRACTITIONER_PAYOUT,
          sourceId: 'seed-practitioner-payout-002',
          occurredAt: daysAgo(9),
          currencyCode: ACCOUNTING_CURRENCY,
          description: 'Seed practitioner payout accounting posting.',
          metadataJson: {
            postingVersion: 2,
            source: 'practitioner-payout-seed',
            settlementId: 'seed-settlement-002',
            amountPaid: '440.00',
            settlementAppliedAmount: '450.00',
            transferFeeAmount: '10.00',
            transferFeeTreatment: 'DEDUCT_FROM_PRACTITIONER',
          },
          lines: [
            {
              accountCode: practitionerPayableCode(seedIds.practitionerProfiles.practitionerB),
              direction: LedgerDirection.DEBIT,
              amount: 450,
              memo: 'Settle practitioner payable via payout.',
              referenceType: 'settlement_payout',
              referenceId: 'seed-practitioner-payout-002',
            },
            {
              accountCode: 'ASSET_PLATFORM_CASH',
              direction: LedgerDirection.CREDIT,
              amount: 440,
              memo: 'Cash outflow for practitioner payout.',
              referenceType: 'settlement_payout',
              referenceId: 'seed-practitioner-payout-002',
            },
            {
              accountCode: 'REVENUE_TRANSFER_FEE_RECOVERY',
              direction: LedgerDirection.CREDIT,
              amount: 10,
              memo: 'Recognize transfer fee recovery deducted from practitioner payout.',
              referenceType: 'settlement_payout',
              referenceId: 'seed-practitioner-payout-002',
            },
          ],
        },
        {
          sourceType: JournalEntrySourceType.PAYMENT_CAPTURED,
          sourceId: 'seed-payment-captured-004',
          occurredAt: daysAgo(6),
          currencyCode: ACCOUNTING_CURRENCY,
          description: 'Seed payment captured accounting posting.',
          metadataJson: {
            postingVersion: 2,
            source: 'payment-captured-seed',
            amountTotal: '700.00',
            amountFromGateway: '500.00',
            amountFromWallet: '200.00',
            practitionerShareAmount: '525.00',
            platformCommissionAmount: '175.00',
            gatewayFeeAmount: '12.00',
            gatewayFeeRatePercent: '2.40',
            gatewayFeeFixedAmount: '0.00',
            vatAmount: '26.25',
            vatRatePercent: '15.00',
          },
          lines: [
            {
              accountCode: 'ASSET_GATEWAY_CLEARING',
              direction: LedgerDirection.DEBIT,
              amount: 500,
              memo: 'Increase gateway clearing for captured online payment funds.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-004',
            },
            {
              accountCode: 'REVENUE_PLATFORM_COMMISSION',
              direction: LedgerDirection.CREDIT,
              amount: 175,
              memo: 'Recognize platform commission on captured payment.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-004',
            },
            {
              accountCode: practitionerPayableCode(seedIds.practitionerProfiles.practitionerB),
              direction: LedgerDirection.CREDIT,
              amount: 525,
              memo: 'Recognize practitioner payable on captured payment.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-004',
            },
            {
              accountCode: 'LIABILITY_CUSTOMER_WALLET',
              direction: LedgerDirection.DEBIT,
              amount: 200,
              memo: 'Reduce customer wallet liability for wallet-funded payment share.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-004',
            },
            {
              accountCode: 'EXPENSE_GATEWAY_FEES',
              direction: LedgerDirection.DEBIT,
              amount: 12,
              memo: 'Recognize gateway fee expense for captured payment.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-004',
            },
            {
              accountCode: 'ASSET_GATEWAY_CLEARING',
              direction: LedgerDirection.CREDIT,
              amount: 12,
              memo: 'Reduce gateway clearing by captured gateway fee.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-004',
            },
            {
              accountCode: 'LIABILITY_VAT_PAYABLE',
              direction: LedgerDirection.CREDIT,
              amount: 26.25,
              memo: 'Recognize VAT payable at payment capture.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-004',
            },
            {
              accountCode: 'REVENUE_PLATFORM_COMMISSION',
              direction: LedgerDirection.DEBIT,
              amount: 26.25,
              memo: 'Reclassify VAT portion from gross platform revenue.',
              referenceType: 'payment',
              referenceId: 'seed-payment-captured-004',
            },
          ],
        },
        {
          sourceType: JournalEntrySourceType.REFUND_SUCCEEDED,
          sourceId: 'seed-refund-succeeded-002',
          occurredAt: daysAgo(3),
          currencyCode: ACCOUNTING_CURRENCY,
          description: 'Seed refund succeeded accounting posting.',
          metadataJson: {
            postingVersion: 2,
            source: 'refund-succeeded-seed',
            paymentId: 'seed-payment-captured-003',
            destination: 'CUSTOMER_WALLET',
            refundAmount: '120.00',
            practitionerRefundAmount: '90.00',
            platformRefundAmount: '30.00',
          },
          lines: [
            {
              accountCode: practitionerPayableCode(seedIds.practitionerProfiles.practitionerF),
              direction: LedgerDirection.DEBIT,
              amount: 90,
              memo: 'Reverse practitioner payable for successful refund.',
              referenceType: 'refund',
              referenceId: 'seed-refund-succeeded-002',
            },
            {
              accountCode: 'REVENUE_PLATFORM_COMMISSION',
              direction: LedgerDirection.DEBIT,
              amount: 30,
              memo: 'Reverse platform commission for successful refund.',
              referenceType: 'refund',
              referenceId: 'seed-refund-succeeded-002',
            },
            {
              accountCode: 'LIABILITY_CUSTOMER_WALLET',
              direction: LedgerDirection.CREDIT,
              amount: 120,
              memo: 'Increase customer wallet liability for wallet refund.',
              referenceType: 'refund',
              referenceId: 'seed-refund-succeeded-002',
            },
          ],
        },
      ];

      for (const event of events) {
        assertBalanced(event.lines);

        const journalEntry = await tx.journalEntry.upsert({
          where: {
            sourceType_sourceId: {
              sourceType: event.sourceType,
              sourceId: event.sourceId,
            },
          },
          create: {
            id: uuid(`seed-journal-entry-${event.sourceType}-${event.sourceId}`),
            sourceType: event.sourceType,
            sourceId: event.sourceId,
            occurredAt: event.occurredAt,
            currencyCode: event.currencyCode,
            status: JournalEntryStatus.POSTED,
            description: event.description,
            metadataJson: event.metadataJson,
          },
          update: {
            occurredAt: event.occurredAt,
            currencyCode: event.currencyCode,
            status: JournalEntryStatus.POSTED,
            description: event.description,
            metadataJson: event.metadataJson,
          },
        });

        await tx.journalLine.deleteMany({
          where: { journalEntryId: journalEntry.id },
        });

        await tx.journalLine.createMany({
          data: event.lines.map((line, index) => ({
            id: uuid(`seed-journal-line-${journalEntry.id}-${index}`),
            journalEntryId: journalEntry.id,
            ledgerAccountId: accountIdByCode.get(line.accountCode)!,
            direction: line.direction,
            amount: money(line.amount),
            memo: line.memo,
            referenceType: line.referenceType,
            referenceId: line.referenceId,
          })),
        });
      }
    });

    console.log(
      `[seed:accounting] seeded ${PLATFORM_ACCOUNTS.length} platform accounts, ${practitioners.length} practitioner payable accounts, and accounting journal fixtures`,
    );
  },
};

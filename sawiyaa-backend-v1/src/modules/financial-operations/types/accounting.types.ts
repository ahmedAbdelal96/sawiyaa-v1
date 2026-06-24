import { LedgerAccountScope, LedgerAccountType } from '@prisma/client';

export const PLATFORM_LEDGER_ACCOUNT_CODES = {
  platformCash: 'ASSET_PLATFORM_CASH',
  gatewayClearing: 'ASSET_GATEWAY_CLEARING',
  platformRevenue: 'REVENUE_PLATFORM_COMMISSION',
  transferFeeRecoveryRevenue: 'REVENUE_TRANSFER_FEE_RECOVERY',
  customerWalletLiability: 'LIABILITY_CUSTOMER_WALLET',
  vatPayable: 'LIABILITY_VAT_PAYABLE',
  gatewayFeesExpense: 'EXPENSE_GATEWAY_FEES',
  transferFeesExpense: 'EXPENSE_TRANSFER_FEES',
  refundAdjustments: 'EXPENSE_REFUND_ADJUSTMENTS',
} as const;

export type PlatformLedgerAccountCode =
  (typeof PLATFORM_LEDGER_ACCOUNT_CODES)[keyof typeof PLATFORM_LEDGER_ACCOUNT_CODES];

export type AccountingAccountSeed = {
  code: PlatformLedgerAccountCode;
  name: string;
  accountType: LedgerAccountType;
  scope: LedgerAccountScope;
};

export const PLATFORM_LEDGER_ACCOUNT_SEEDS: AccountingAccountSeed[] = [
  {
    code: PLATFORM_LEDGER_ACCOUNT_CODES.platformCash,
    name: 'Platform Cash',
    accountType: LedgerAccountType.ASSET,
    scope: LedgerAccountScope.PLATFORM,
  },
  {
    code: PLATFORM_LEDGER_ACCOUNT_CODES.gatewayClearing,
    name: 'Gateway Clearing',
    accountType: LedgerAccountType.ASSET,
    scope: LedgerAccountScope.PLATFORM,
  },
  {
    code: PLATFORM_LEDGER_ACCOUNT_CODES.platformRevenue,
    name: 'Platform Revenue',
    accountType: LedgerAccountType.REVENUE,
    scope: LedgerAccountScope.PLATFORM,
  },
  {
    code: PLATFORM_LEDGER_ACCOUNT_CODES.transferFeeRecoveryRevenue,
    name: 'Transfer Fee Recovery Revenue',
    accountType: LedgerAccountType.REVENUE,
    scope: LedgerAccountScope.PLATFORM,
  },
  {
    code: PLATFORM_LEDGER_ACCOUNT_CODES.customerWalletLiability,
    name: 'Customer Wallet Liability',
    accountType: LedgerAccountType.LIABILITY,
    scope: LedgerAccountScope.PLATFORM,
  },
  {
    code: PLATFORM_LEDGER_ACCOUNT_CODES.vatPayable,
    name: 'VAT Payable',
    accountType: LedgerAccountType.LIABILITY,
    scope: LedgerAccountScope.SYSTEM,
  },
  {
    code: PLATFORM_LEDGER_ACCOUNT_CODES.gatewayFeesExpense,
    name: 'Gateway Fees Expense',
    accountType: LedgerAccountType.EXPENSE,
    scope: LedgerAccountScope.PLATFORM,
  },
  {
    code: PLATFORM_LEDGER_ACCOUNT_CODES.transferFeesExpense,
    name: 'Transfer Fees Expense',
    accountType: LedgerAccountType.EXPENSE,
    scope: LedgerAccountScope.PLATFORM,
  },
  {
    code: PLATFORM_LEDGER_ACCOUNT_CODES.refundAdjustments,
    name: 'Refund Adjustments',
    accountType: LedgerAccountType.EXPENSE,
    scope: LedgerAccountScope.SYSTEM,
  },
];

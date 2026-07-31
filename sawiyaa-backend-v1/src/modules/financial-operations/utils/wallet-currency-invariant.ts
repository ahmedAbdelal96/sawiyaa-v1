import { BadRequestException } from '@nestjs/common';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

export type WalletCurrencyOperation =
  | 'WALLET_CREDIT'
  | 'LEDGER_EARNING'
  | 'WALLET_DEBIT'
  | 'EXTERNAL_PAYOUT'
  | 'TRANSFER_FEE'
  | 'NET_RECEIVED'
  | 'PLATFORM_OUTFLOW';

export function normalizeFinancialCurrency(currencyCode: string | null | undefined) {
  return currencyCode?.trim().toUpperCase() || null;
}

export function walletCurrencyMismatchException(input: {
  operation: WalletCurrencyOperation;
  walletCurrency: string | null | undefined;
  attemptedCurrency: string | null | undefined;
  messageKey?: string;
}) {
  return new BadRequestException({
    messageKey:
      input.messageKey ??
      'financialOperations.errors.practitionerWalletCurrencyMismatch',
    error:
      input.operation === 'LEDGER_EARNING'
        ? FINANCIAL_OPS_ERROR_CODES.ledgerWalletCurrencyMismatch
        : input.operation === 'EXTERNAL_PAYOUT' || input.operation === 'WALLET_DEBIT'
          ? FINANCIAL_OPS_ERROR_CODES.payoutWalletCurrencyMismatch
          : FINANCIAL_OPS_ERROR_CODES.practitionerWalletCurrencyMismatch,
  });
}

export function assertWalletCurrencyMatches(input: {
  operation: WalletCurrencyOperation;
  walletCurrency: string | null | undefined;
  attemptedCurrency: string | null | undefined;
}) {
  const walletCurrency = normalizeFinancialCurrency(input.walletCurrency);
  const attemptedCurrency = normalizeFinancialCurrency(input.attemptedCurrency);
  if (!walletCurrency) {
    throw walletCurrencyMismatchException({ ...input, walletCurrency, attemptedCurrency });
  }
  if (!attemptedCurrency || attemptedCurrency !== walletCurrency) {
    throw walletCurrencyMismatchException({ ...input, walletCurrency, attemptedCurrency });
  }
  return walletCurrency;
}

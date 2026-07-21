import { BadRequestException, Injectable } from '@nestjs/common';
import { PractitionerPayoutMethodType } from '@prisma/client';
import { PractitionerPayoutDestinationInput } from '../types/practitioner.types';
import { IbanValidationService } from './iban-validation.service';

@Injectable()
export class PractitionerPayoutDestinationValidationService {
  private readonly messageKeyByCode: Record<string, string> = {
    PAYOUT_ACCOUNT_HOLDER_REQUIRED: 'payoutAccountHolderRequired',
    PAYOUT_ACCOUNT_HOLDER_INVALID: 'payoutAccountHolderInvalid',
    PAYOUT_COUNTRY_REQUIRED: 'payoutCountryRequired',
    PAYOUT_COUNTRY_UNSUPPORTED: 'payoutCountryUnsupported',
    PAYOUT_MIXED_METHOD_FIELDS: 'payoutMixedMethodFields',
    PAYOUT_WALLET_INVALID: 'payoutWalletInvalid',
  };
  constructor(private readonly ibanValidationService: IbanValidationService) {}

  normalizeAccountHolderName(value: string | null | undefined) {
    return (value ?? '').trim().replace(/\s+/g, ' ');
  }

  validate(
    payoutDestination: PractitionerPayoutDestinationInput | null | undefined,
  ) {
    if (payoutDestination === undefined || payoutDestination === null) {
      return;
    }

    const methodType = payoutDestination.methodType;
    const countryCode =
      payoutDestination.countryCode?.trim().toUpperCase() || '';
    const accountHolderName = this.normalizeAccountHolderName(
      payoutDestination.accountHolderName,
    );

    if (!accountHolderName) {
      this.throwError('PAYOUT_ACCOUNT_HOLDER_REQUIRED');
    }
    if (accountHolderName.length < 2 || accountHolderName.length > 191) {
      this.throwError('PAYOUT_ACCOUNT_HOLDER_INVALID');
    }
    if (/^[\d\p{P}\s]+$/u.test(accountHolderName)) {
      this.throwError('PAYOUT_ACCOUNT_HOLDER_INVALID');
    }

    if (methodType !== PractitionerPayoutMethodType.OTHER) {
      if (!countryCode) this.throwError('PAYOUT_COUNTRY_REQUIRED');
    }

    const rejectIrrelevant = (fields: Array<[string, unknown]>) => {
      if (
        fields.some(([, value]) => typeof value === 'string' && value.trim())
      ) {
        this.throwError('PAYOUT_MIXED_METHOD_FIELDS');
      }
    };

    switch (methodType) {
      case PractitionerPayoutMethodType.BANK_ACCOUNT:
        if (
          !payoutDestination.accountHolderName ||
          !payoutDestination.bankName ||
          !payoutDestination.bankAccountNumber
        ) {
          throw new BadRequestException({
            messageKey: 'practitioners.errors.invalidPayoutDestination',
            error: 'PRACTITIONER_INVALID_BANK_PAYOUT_DESTINATION',
          });
        }
        rejectIrrelevant([
          ['iban', payoutDestination.iban],
          ['walletProvider', payoutDestination.walletProvider],
          ['walletIdentifier', payoutDestination.walletIdentifier],
          ['otherDetails', payoutDestination.otherDetails],
        ]);
        return;
      case PractitionerPayoutMethodType.IBAN:
        if (!payoutDestination.iban) {
          throw new BadRequestException({
            messageKey: 'practitioners.errors.invalidPayoutDestination',
            error: 'PRACTITIONER_INVALID_IBAN_PAYOUT_DESTINATION',
          });
        }
        this.ibanValidationService.assertValid(
          payoutDestination.iban,
          countryCode,
        );
        rejectIrrelevant([
          ['bankName', payoutDestination.bankName],
          ['bankAccountNumber', payoutDestination.bankAccountNumber],
          ['walletProvider', payoutDestination.walletProvider],
          ['walletIdentifier', payoutDestination.walletIdentifier],
          ['otherDetails', payoutDestination.otherDetails],
        ]);
        return;
      case PractitionerPayoutMethodType.WALLET: {
        if (
          !payoutDestination.walletProvider ||
          !payoutDestination.walletIdentifier
        ) {
          throw new BadRequestException({
            messageKey: 'practitioners.errors.invalidPayoutDestination',
            error: 'PRACTITIONER_INVALID_WALLET_PAYOUT_DESTINATION',
          });
        }
        const normalizedWallet = this.normalizeWalletIdentifier(
          payoutDestination.walletIdentifier,
          countryCode,
        );
        if (!normalizedWallet) this.throwError('PAYOUT_WALLET_INVALID');
        rejectIrrelevant([
          ['bankName', payoutDestination.bankName],
          ['bankAccountNumber', payoutDestination.bankAccountNumber],
          ['iban', payoutDestination.iban],
          ['otherDetails', payoutDestination.otherDetails],
        ]);
        return;
      }
      case PractitionerPayoutMethodType.OTHER:
        if (!payoutDestination.otherDetails) {
          throw new BadRequestException({
            messageKey: 'practitioners.errors.invalidPayoutDestination',
            error: 'PRACTITIONER_INVALID_OTHER_PAYOUT_DESTINATION',
          });
        }
        rejectIrrelevant([
          ['bankName', payoutDestination.bankName],
          ['bankAccountNumber', payoutDestination.bankAccountNumber],
          ['iban', payoutDestination.iban],
          ['walletProvider', payoutDestination.walletProvider],
          ['walletIdentifier', payoutDestination.walletIdentifier],
        ]);
        return;
      default:
        return;
    }
  }

  normalizeWalletIdentifier(
    value: string | null | undefined,
    countryCode: string,
  ) {
    const digits = (value ?? '').replace(/[\s()-]/g, '');
    if (!/^\+?\d+$/.test(digits)) return null;
    let canonical = digits.startsWith('+') ? digits : `+${digits}`;
    if (!digits.startsWith('+')) {
      if (countryCode === 'EG' && /^0(?:10|11|12|15)\d{8}$/.test(digits)) {
        canonical = `+20${digits.slice(1)}`;
      } else if (countryCode === 'SA' && /^05\d{8}$/.test(digits)) {
        canonical = `+966${digits.slice(1)}`;
      } else if (countryCode === 'AE' && /^05\d{8}$/.test(digits)) {
        canonical = `+971${digits.slice(1)}`;
      }
    }
    return /^\+[1-9]\d{7,14}$/.test(canonical) ? canonical : null;
  }

  private throwError(error: string): never {
    throw new BadRequestException({
      messageKey: `practitioners.errors.${this.messageKeyByCode[error] ?? 'invalidPayoutDestination'}`,
      error,
    });
  }
}

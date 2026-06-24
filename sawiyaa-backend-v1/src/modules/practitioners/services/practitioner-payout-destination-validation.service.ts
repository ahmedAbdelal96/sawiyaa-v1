import { BadRequestException, Injectable } from '@nestjs/common';
import { PractitionerPayoutMethodType } from '@prisma/client';
import { PractitionerPayoutDestinationInput } from '../types/practitioner.types';

@Injectable()
export class PractitionerPayoutDestinationValidationService {
  validate(
    payoutDestination: PractitionerPayoutDestinationInput | null | undefined,
  ) {
    if (payoutDestination === undefined || payoutDestination === null) {
      return;
    }

    switch (payoutDestination.methodType) {
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
        return;
      case PractitionerPayoutMethodType.IBAN:
        if (!payoutDestination.accountHolderName || !payoutDestination.iban) {
          throw new BadRequestException({
            messageKey: 'practitioners.errors.invalidPayoutDestination',
            error: 'PRACTITIONER_INVALID_IBAN_PAYOUT_DESTINATION',
          });
        }
        return;
      case PractitionerPayoutMethodType.WALLET:
        if (
          !payoutDestination.walletProvider ||
          !payoutDestination.walletIdentifier
        ) {
          throw new BadRequestException({
            messageKey: 'practitioners.errors.invalidPayoutDestination',
            error: 'PRACTITIONER_INVALID_WALLET_PAYOUT_DESTINATION',
          });
        }
        return;
      case PractitionerPayoutMethodType.OTHER:
        if (!payoutDestination.otherDetails) {
          throw new BadRequestException({
            messageKey: 'practitioners.errors.invalidPayoutDestination',
            error: 'PRACTITIONER_INVALID_OTHER_PAYOUT_DESTINATION',
          });
        }
        return;
      default:
        return;
    }
  }
}

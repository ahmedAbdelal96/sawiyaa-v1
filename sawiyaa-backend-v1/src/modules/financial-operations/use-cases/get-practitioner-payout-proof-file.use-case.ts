import { NotFoundException, Injectable } from '@nestjs/common';
import { FinancialOperationsPractitionerRepository } from '../repositories/financial-operations-practitioner.repository';
import { SettlementPayoutProofStorageService } from '../services/settlement-payout-proof-storage.service';
import { SettlementPayoutRepository } from '../repositories/settlement-payout.repository';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

@Injectable()
export class GetPractitionerPayoutProofFileUseCase {
  constructor(
    private readonly practitionerRepository: FinancialOperationsPractitionerRepository,
    private readonly settlementPayoutRepository: SettlementPayoutRepository,
    private readonly settlementPayoutProofStorageService: SettlementPayoutProofStorageService,
  ) {}

  async execute(input: { practitionerId: string; payoutId: string }) {
    const practitioner = await this.practitionerRepository.findById(
      input.practitionerId,
    );
    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.practitionerNotFound',
        error: 'FINANCIAL_OPERATIONS_PRACTITIONER_NOT_FOUND',
      });
    }

    const payout =
      await this.settlementPayoutRepository.findSettlementPayoutForPractitioner(
        practitioner.id,
        input.payoutId,
      );

    if (!payout?.proof) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.payoutProofNotFound',
        error: FINANCIAL_OPS_ERROR_CODES.payoutProofNotFound,
      });
    }

    const proof = await this.settlementPayoutProofStorageService.resolveProof(
      payout.proof.storagePath,
    );

    if (!proof) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.payoutProofNotFound',
        error: FINANCIAL_OPS_ERROR_CODES.payoutProofNotFound,
      });
    }

    return {
      item: proof,
      mimeType: payout.proof.mimeType,
      originalFileName: payout.proof.originalFileName,
    };
  }
}

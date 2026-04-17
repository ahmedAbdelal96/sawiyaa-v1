import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as path from 'path';
import { PrismaService } from '@common/prisma/prisma.service';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { FinancialOperationsPractitionerRepository } from '../repositories/financial-operations-practitioner.repository';
import { SettlementPayoutProofRepository } from '../repositories/settlement-payout-proof.repository';
import { SettlementPayoutRepository } from '../repositories/settlement-payout.repository';
import { SettlementPayoutProofStorageService } from '../services/settlement-payout-proof-storage.service';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

type UploadedProofFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname?: string;
};

const MAX_PAYOUT_PROOF_BYTES = 10 * 1024 * 1024;

@Injectable()
export class UploadPractitionerPayoutProofUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly practitionerRepository: FinancialOperationsPractitionerRepository,
    private readonly settlementPayoutRepository: SettlementPayoutRepository,
    private readonly settlementPayoutProofRepository: SettlementPayoutProofRepository,
    private readonly settlementPayoutProofStorageService: SettlementPayoutProofStorageService,
    private readonly financialOperationsMapper: FinancialOperationsMapper,
  ) {}

  async execute(input: {
    practitionerId: string;
    payoutId: string;
    file?: UploadedProofFile;
  }) {
    const practitioner = await this.practitionerRepository.findById(
      input.practitionerId,
    );
    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.practitionerNotFound',
        error: 'FINANCIAL_OPERATIONS_PRACTITIONER_NOT_FOUND',
      });
    }

    if (!input.file) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.payoutProofFileRequired',
        error: FINANCIAL_OPS_ERROR_CODES.payoutProofFileRequired,
      });
    }

    if (
      !this.settlementPayoutProofStorageService.isAllowedMimeType(
        input.file.mimetype,
      )
    ) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.payoutProofInvalidType',
        error: FINANCIAL_OPS_ERROR_CODES.payoutProofInvalidType,
      });
    }

    if (input.file.size > MAX_PAYOUT_PROOF_BYTES) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.payoutProofFileTooLarge',
        error: FINANCIAL_OPS_ERROR_CODES.payoutProofFileTooLarge,
      });
    }

    const payout =
      await this.settlementPayoutRepository.findSettlementPayoutForPractitioner(
        practitioner.id,
        input.payoutId,
      );

    if (!payout) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.settlementPayoutNotFound',
        error: FINANCIAL_OPS_ERROR_CODES.settlementPayoutNotFound,
      });
    }

    const existingProof =
      await this.settlementPayoutProofRepository.findByPayoutId(payout.id);
    const storedProof =
      await this.settlementPayoutProofStorageService.saveProof({
        practitionerId: practitioner.id,
        payoutId: payout.id,
        fileBuffer: input.file.buffer,
        mimeType: input.file.mimetype,
        originalFileName: input.file.originalname ?? null,
      });

    try {
      const proof = await this.prisma.$transaction(async (tx) => {
        const persisted =
          await this.settlementPayoutProofRepository.upsertProof(
            {
              payoutId: payout.id,
              storedFileName: path.basename(storedProof.absolutePath),
              storagePath: storedProof.storagePath,
              mimeType: storedProof.mimeType,
              fileSizeBytes: storedProof.fileSizeBytes,
              originalFileName: storedProof.originalFileName,
              uploadedAt: new Date(),
            },
            tx,
          );

        const refreshed =
          await this.settlementPayoutRepository.findSettlementPayoutById(
            payout.id,
            tx,
          );

        if (!refreshed) {
          throw new NotFoundException({
            messageKey: 'financialOperations.errors.settlementPayoutNotFound',
            error: FINANCIAL_OPS_ERROR_CODES.settlementPayoutNotFound,
          });
        }

        return { persisted, refreshed };
      });

      if (
        existingProof &&
        existingProof.storagePath !== storedProof.storagePath
      ) {
        await this.settlementPayoutProofStorageService.deleteProof(
          existingProof.storagePath,
        );
      }

      return {
        item: this.financialOperationsMapper.toPractitionerPayoutDetail(
          proof.refreshed,
        ),
      };
    } catch (error) {
      await this.settlementPayoutProofStorageService.deleteProof(
        storedProof.storagePath,
      );
      throw error;
    }
  }
}

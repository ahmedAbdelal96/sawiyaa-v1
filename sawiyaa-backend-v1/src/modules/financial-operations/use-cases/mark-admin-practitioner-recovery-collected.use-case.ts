import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { PractitionerRecoveryPresenter } from '../presenters/practitioner-recovery.presenter';
import { PractitionerRecoveryRepository } from '../repositories/practitioner-recovery.repository';
import { PractitionerRecoveryService } from '../services/practitioner-recovery.service';
import {
  AdminPractitionerRecoveryMutationResultDto,
  MarkAdminPractitionerRecoveryCollectedDto,
} from '../dto/admin-practitioner-recoveries.dto';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

@Injectable()
export class MarkAdminPractitionerRecoveryCollectedUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recoveryRepository: PractitionerRecoveryRepository,
    private readonly recoveryService: PractitionerRecoveryService,
    private readonly presenter: PractitionerRecoveryPresenter,
  ) {}

  async execute(input: {
    recoveryId: string;
    body: MarkAdminPractitionerRecoveryCollectedDto;
    operatorUserId: string;
  }): Promise<AdminPractitionerRecoveryMutationResultDto> {
    const recovery = await this.recoveryRepository.findById(input.recoveryId);
    if (!recovery) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.recoveryNotFound',
        error: FINANCIAL_OPS_ERROR_CODES.recoveryNotFound,
      });
    }

    const result = await this.prisma.$transaction(async (tx) =>
      this.recoveryService.collectRecovery({
        recoveryId: recovery.id,
        amountCollected: input.body.amountCollected,
        operatorUserId: input.operatorUserId,
        idempotencyKey: input.body.idempotencyKey,
        note: input.body.note ?? null,
        tx,
      }),
    );

    if (!result.item) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.recoveryNotFound',
        error: FINANCIAL_OPS_ERROR_CODES.recoveryNotFound,
      });
    }

    return {
      item: this.presenter.presentDetailItem(result.item as never),
      wasAlreadyRecorded: result.wasAlreadyRecorded,
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PractitionerRecoveryRepository } from '../repositories/practitioner-recovery.repository';
import { PractitionerRecoveryPresenter } from '../presenters/practitioner-recovery.presenter';
import {
  AdminPractitionerRecoveryDetailDataResponseDto,
} from '../dto/admin-practitioner-recoveries.dto';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

@Injectable()
export class GetAdminPractitionerRecoveryUseCase {
  constructor(
    private readonly recoveryRepository: PractitionerRecoveryRepository,
    private readonly presenter: PractitionerRecoveryPresenter,
  ) {}

  async execute(input: {
    recoveryId: string;
  }): Promise<AdminPractitionerRecoveryDetailDataResponseDto> {
    const recovery = await this.recoveryRepository.findById(input.recoveryId);

    if (!recovery) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.recoveryNotFound',
        error: FINANCIAL_OPS_ERROR_CODES.recoveryNotFound,
      });
    }

    return this.presenter.presentDetail(
      this.presenter.presentDetailItem(recovery as never),
    );
  }
}

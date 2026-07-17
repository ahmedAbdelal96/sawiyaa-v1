import { BadRequestException, Injectable } from '@nestjs/common';
import { PractitionerRecoveryStatus } from '@prisma/client';
import { PractitionerRecoveryRepository } from '../repositories/practitioner-recovery.repository';
import { PractitionerRecoveryPresenter } from '../presenters/practitioner-recovery.presenter';
import {
  AdminPractitionerRecoveryListDataResponseDto,
  ListAdminPractitionerRecoveriesDto,
} from '../dto/admin-practitioner-recoveries.dto';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

@Injectable()
export class ListAdminPractitionerRecoveriesUseCase {
  constructor(
    private readonly recoveryRepository: PractitionerRecoveryRepository,
    private readonly presenter: PractitionerRecoveryPresenter,
  ) {}

  async execute(input: {
    query: ListAdminPractitionerRecoveriesDto;
  }): Promise<AdminPractitionerRecoveryListDataResponseDto> {
    const page = input.query.page ?? 1;
    const limit = input.query.limit ?? 20;
    const createdFrom = input.query.createdFrom
      ? new Date(input.query.createdFrom)
      : undefined;
    const createdTo = input.query.createdTo
      ? new Date(input.query.createdTo)
      : undefined;

    if (createdFrom && createdTo && createdFrom > createdTo) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.invalidFilter',
        error: FINANCIAL_OPS_ERROR_CODES.invalidFilter,
      });
    }

    const [items, totalItems] = await this.recoveryRepository.listRecoveries({
      practitionerId: input.query.practitionerId,
      currencyCode: input.query.currencyCode?.trim().toUpperCase(),
      status: input.query.status as PractitionerRecoveryStatus | undefined,
      reasonCode: input.query.reasonCode,
      createdFrom,
      createdTo,
      skip: (page - 1) * limit,
      take: limit,
    });

    return this.presenter.presentList(
      items.map((item) => this.presenter.presentListItem(item as never)),
      page,
      limit,
      totalItems,
      {
        practitionerId: input.query.practitionerId ?? undefined,
        status: input.query.status ?? undefined,
        reasonCode: input.query.reasonCode ?? undefined,
        currencyCode: input.query.currencyCode?.trim().toUpperCase() || undefined,
        createdFrom: input.query.createdFrom ?? undefined,
        createdTo: input.query.createdTo ?? undefined,
        page,
        limit,
      },
    );
  }
}

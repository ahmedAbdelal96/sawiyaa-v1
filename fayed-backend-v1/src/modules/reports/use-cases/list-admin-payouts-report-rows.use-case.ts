import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { FINANCIAL_OPS_ERROR_CODES } from '@modules/financial-operations/types/financial-operations.types';
import { ListAdminPayoutsReportRowsDto } from '../dto/admin-payouts-report.dto';
import {
  PAYOUTS_REPORT_PROVIDER,
  PayoutsReportProvider,
} from '../providers/payouts-report.provider';
import { isValidRange, resolveRange } from '../utils/report-date.util';
import { toPaginationMeta } from '../utils/report-pagination.util';

@Injectable()
export class ListAdminPayoutsReportRowsUseCase {
  constructor(
    @Inject(PAYOUTS_REPORT_PROVIDER)
    private readonly provider: PayoutsReportProvider,
  ) {}

  async execute(query: ListAdminPayoutsReportRowsDto) {
    const { from, to } = resolveRange(query);
    if (!isValidRange(from, to)) {
      throw new BadRequestException({
        messageKey: 'reports.errors.invalidFilter',
        error: FINANCIAL_OPS_ERROR_CODES.invalidFilter,
      });
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const { items, totalItems } = await this.provider.listRows({
      from,
      to,
      page,
      limit,
      currencyCode: query.currencyCode,
      practitionerId: query.practitionerId,
    });

    return {
      pagination: toPaginationMeta({ page, limit, totalItems }),
      items,
    };
  }
}

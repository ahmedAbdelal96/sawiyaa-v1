import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { FINANCIAL_OPS_ERROR_CODES } from '@modules/financial-operations/types/financial-operations.types';
import { ListAdminPaymentsRevenueReportRowsDto } from '../dto/admin-payments-revenue-report.dto';
import { PAYMENTS_REVENUE_REPORT_PROVIDER, PaymentsRevenueReportProvider } from '../providers/payments-revenue-report.provider';
import { isValidRange, resolveRange } from '../utils/report-date.util';
import { toPaginationMeta } from '../utils/report-pagination.util';

@Injectable()
export class ListAdminPaymentsRevenueReportRowsUseCase {
  constructor(
    @Inject(PAYMENTS_REVENUE_REPORT_PROVIDER)
    private readonly provider: PaymentsRevenueReportProvider,
  ) {}

  async execute(query: ListAdminPaymentsRevenueReportRowsDto) {
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
      currencyCode: query.currencyCode,
      page,
      limit,
      sourceType: query.sourceType,
    });

    return {
      pagination: toPaginationMeta({ page, limit, totalItems }),
      items,
    };
  }
}


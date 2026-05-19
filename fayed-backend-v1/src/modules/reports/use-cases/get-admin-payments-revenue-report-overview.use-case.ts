import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { FINANCIAL_OPS_ERROR_CODES } from '@modules/financial-operations/types/financial-operations.types';
import { GetAdminPaymentsRevenueReportOverviewDto } from '../dto/admin-payments-revenue-report.dto';
import {
  PAYMENTS_REVENUE_REPORT_PROVIDER,
  PaymentsRevenueReportProvider,
} from '../providers/payments-revenue-report.provider';
import { isValidRange, resolveRange } from '../utils/report-date.util';

@Injectable()
export class GetAdminPaymentsRevenueReportOverviewUseCase {
  constructor(
    @Inject(PAYMENTS_REVENUE_REPORT_PROVIDER)
    private readonly provider: PaymentsRevenueReportProvider,
  ) {}

  async execute(query: GetAdminPaymentsRevenueReportOverviewDto) {
    const { from, to } = resolveRange(query);
    if (!isValidRange(from, to)) {
      throw new BadRequestException({
        messageKey: 'reports.errors.invalidFilter',
        error: FINANCIAL_OPS_ERROR_CODES.invalidFilter,
      });
    }

    return this.provider.getOverview({
      from,
      to,
      currencyCode: query.currencyCode,
    });
  }
}

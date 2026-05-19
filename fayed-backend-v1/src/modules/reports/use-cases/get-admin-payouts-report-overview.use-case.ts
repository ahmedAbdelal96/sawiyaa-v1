import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { FINANCIAL_OPS_ERROR_CODES } from '@modules/financial-operations/types/financial-operations.types';
import { GetAdminPayoutsReportOverviewDto } from '../dto/admin-payouts-report.dto';
import {
  PAYOUTS_REPORT_PROVIDER,
  PayoutsReportProvider,
} from '../providers/payouts-report.provider';
import { isValidRange, resolveRange } from '../utils/report-date.util';

@Injectable()
export class GetAdminPayoutsReportOverviewUseCase {
  constructor(
    @Inject(PAYOUTS_REPORT_PROVIDER)
    private readonly provider: PayoutsReportProvider,
  ) {}

  async execute(query: GetAdminPayoutsReportOverviewDto) {
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
      practitionerId: query.practitionerId,
    });
  }
}

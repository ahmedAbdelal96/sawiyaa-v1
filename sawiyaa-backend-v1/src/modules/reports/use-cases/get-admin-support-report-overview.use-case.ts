import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { FINANCIAL_OPS_ERROR_CODES } from '@modules/financial-operations/types/financial-operations.types';
import { GetAdminSupportReportOverviewDto } from '../dto/admin-support-report.dto';
import {
  SUPPORT_REPORT_PROVIDER,
  SupportReportProvider,
} from '../providers/support-report.provider';
import { isValidRange, resolveRange } from '../utils/report-date.util';

@Injectable()
export class GetAdminSupportReportOverviewUseCase {
  constructor(
    @Inject(SUPPORT_REPORT_PROVIDER)
    private readonly provider: SupportReportProvider,
  ) {}

  async execute(query: GetAdminSupportReportOverviewDto) {
    const { from, to } = resolveRange(query);
    if (!isValidRange(from, to)) {
      throw new BadRequestException({
        messageKey: 'reports.errors.invalidFilter',
        error: FINANCIAL_OPS_ERROR_CODES.invalidFilter,
      });
    }

    return this.provider.getOverview({ from, to });
  }
}

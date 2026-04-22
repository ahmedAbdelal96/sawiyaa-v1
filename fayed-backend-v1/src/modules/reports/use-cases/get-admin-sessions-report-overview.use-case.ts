import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { FINANCIAL_OPS_ERROR_CODES } from '@modules/financial-operations/types/financial-operations.types';
import { resolveRange, isValidRange } from '../utils/report-date.util';
import { GetAdminSessionsReportOverviewDto } from '../dto/admin-sessions-report.dto';
import { SessionsReportProvider, SESSIONS_REPORT_PROVIDER } from '../providers/sessions-report.provider';

@Injectable()
export class GetAdminSessionsReportOverviewUseCase {
  constructor(
    @Inject(SESSIONS_REPORT_PROVIDER)
    private readonly provider: SessionsReportProvider,
  ) {}

  async execute(query: GetAdminSessionsReportOverviewDto) {
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


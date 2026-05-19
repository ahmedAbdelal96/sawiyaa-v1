import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { FINANCIAL_OPS_ERROR_CODES } from '@modules/financial-operations/types/financial-operations.types';
import { GetAdminCareRequestsReportOverviewDto } from '../dto/admin-care-requests-report.dto';
import {
  CARE_REQUESTS_REPORT_PROVIDER,
  CareRequestsReportProvider,
} from '../providers/care-requests-report.provider';
import { isValidRange, resolveRange } from '../utils/report-date.util';

@Injectable()
export class GetAdminCareRequestsReportOverviewUseCase {
  constructor(
    @Inject(CARE_REQUESTS_REPORT_PROVIDER)
    private readonly provider: CareRequestsReportProvider,
  ) {}

  async execute(query: GetAdminCareRequestsReportOverviewDto) {
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
      practitionerId: query.practitionerId,
    });
  }
}

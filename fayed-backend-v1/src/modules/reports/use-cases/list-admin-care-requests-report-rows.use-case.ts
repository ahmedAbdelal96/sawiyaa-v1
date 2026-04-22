import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { FINANCIAL_OPS_ERROR_CODES } from '@modules/financial-operations/types/financial-operations.types';
import { ListAdminCareRequestsReportRowsDto } from '../dto/admin-care-requests-report.dto';
import { CARE_REQUESTS_REPORT_PROVIDER, CareRequestsReportProvider } from '../providers/care-requests-report.provider';
import { isValidRange, resolveRange } from '../utils/report-date.util';
import { toPaginationMeta } from '../utils/report-pagination.util';

@Injectable()
export class ListAdminCareRequestsReportRowsUseCase {
  constructor(
    @Inject(CARE_REQUESTS_REPORT_PROVIDER)
    private readonly provider: CareRequestsReportProvider,
  ) {}

  async execute(query: ListAdminCareRequestsReportRowsDto) {
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
      status: query.status,
      practitionerId: query.practitionerId,
    });

    return {
      pagination: toPaginationMeta({ page, limit, totalItems }),
      items,
    };
  }
}


import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { FINANCIAL_OPS_ERROR_CODES } from '@modules/financial-operations/types/financial-operations.types';
import { resolveRange, isValidRange } from '../utils/report-date.util';
import { toPaginationMeta } from '../utils/report-pagination.util';
import { ListAdminSessionsReportRowsDto } from '../dto/admin-sessions-report.dto';
import { SessionsReportProvider, SESSIONS_REPORT_PROVIDER } from '../providers/sessions-report.provider';

@Injectable()
export class ListAdminSessionsReportRowsUseCase {
  constructor(
    @Inject(SESSIONS_REPORT_PROVIDER)
    private readonly provider: SessionsReportProvider,
  ) {}

  async execute(query: ListAdminSessionsReportRowsDto) {
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
    });

    return {
      pagination: toPaginationMeta({ page, limit, totalItems }),
      items,
    };
  }
}


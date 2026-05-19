import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { FINANCIAL_OPS_ERROR_CODES } from '@modules/financial-operations/types/financial-operations.types';
import { ListAdminSupportReportRowsDto } from '../dto/admin-support-report.dto';
import {
  SUPPORT_REPORT_PROVIDER,
  SupportReportProvider,
} from '../providers/support-report.provider';
import { isValidRange, resolveRange } from '../utils/report-date.util';
import { toPaginationMeta } from '../utils/report-pagination.util';

@Injectable()
export class ListAdminSupportReportRowsUseCase {
  constructor(
    @Inject(SUPPORT_REPORT_PROVIDER)
    private readonly provider: SupportReportProvider,
  ) {}

  async execute(query: ListAdminSupportReportRowsDto) {
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

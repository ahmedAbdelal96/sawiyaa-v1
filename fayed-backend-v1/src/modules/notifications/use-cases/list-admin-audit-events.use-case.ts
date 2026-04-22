import { Injectable } from '@nestjs/common';
import { AdminAuditPresenter } from '../presenters/admin-audit.presenter';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';
import { ListAdminAuditEventsDto } from '../dto/list-admin-audit-events.dto';

@Injectable()
export class ListAdminAuditEventsUseCase {
  constructor(
    private readonly repository: OperationalNotificationRepository,
    private readonly presenter: AdminAuditPresenter,
  ) {}

  async execute(input: { query: ListAdminAuditEventsDto }) {
    const page = input.query.page ?? 1;
    const limit = input.query.limit ?? 20;

    const [rows, totalItems] = await this.repository.listAdminAuditEvents({
      page,
      limit,
      dateFrom: input.query.dateFrom ? new Date(input.query.dateFrom) : undefined,
      dateTo: input.query.dateTo ? new Date(input.query.dateTo) : undefined,
      actorRole: input.query.actorRole,
      eventFamily: input.query.eventFamily,
      category: input.query.category,
      severity: input.query.severity,
      source: input.query.source,
      targetEntityType: input.query.targetEntityType,
      search: input.query.search,
    });

    return {
      items: rows.map((item) => this.presenter.toListItem(item)),
      pagination: this.presenter.presentPagination({ page, limit, totalItems }),
    };
  }
}

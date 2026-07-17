import { Injectable } from '@nestjs/common';
import { ListAdminPractitionerRecoveriesDto } from '../dto/admin-practitioner-recoveries.dto';
import { PractitionerRecoveryPresenter } from '../presenters/practitioner-recovery.presenter';
import { PractitionerRecoveryRepository } from '../repositories/practitioner-recovery.repository';
import { toCsvContent } from '../utils/csv.util';

@Injectable()
export class ExportAdminPractitionerRecoveriesCsvUseCase {
  constructor(
    private readonly recoveryRepository: PractitionerRecoveryRepository,
    private readonly presenter: PractitionerRecoveryPresenter,
  ) {}

  async execute(query: ListAdminPractitionerRecoveriesDto) {
    const createdFrom = query.createdFrom ? new Date(query.createdFrom) : undefined;
    const createdTo = query.createdTo ? new Date(query.createdTo) : undefined;

    const recoveries = await this.recoveryRepository.listRecoveriesForExport({
      practitionerId: query.practitionerId,
      currencyCode: query.currencyCode?.trim().toUpperCase(),
      status: query.status,
      reasonCode: query.reasonCode,
      createdFrom,
      createdTo,
    });

    const items = recoveries.map((row) => this.presenter.presentDetailItem(row as never));
    const rows: string[][] = [
      ['Report', 'Practitioner recoveries'],
      ['Generated at', new Date().toISOString()],
      ['Currency', query.currencyCode?.trim().toUpperCase() || 'ALL'],
      ['Status', query.status ?? 'ALL'],
      ['Reason', query.reasonCode ?? 'ALL'],
      ['Practitioner ID', query.practitionerId ?? 'ALL'],
      ['Created from', query.createdFrom ?? 'ALL'],
      ['Created to', query.createdTo ?? 'ALL'],
      [],
      [
        'Recovery ID',
        'Practitioner ID',
        'Practitioner',
        'Status',
        'Reason',
        'Amount',
        'Recovered amount',
        'Remaining amount',
        'Currency',
        'Session code',
        'Payment ID',
        'Refund ID',
        'Review ID',
        'Settlement ID',
        'Payout ID',
        'Created at',
        'Resolved at',
      ],
      ...items.map((item) => [
        item.recoveryId,
        item.practitioner.practitionerId,
        item.practitioner.displayName ?? item.practitioner.publicSlug ?? '',
        item.status,
        item.reasonCode,
        item.amount,
        item.recoveredAmount,
        item.remainingAmount,
        item.currencyCode,
        item.session?.sessionCode ?? '',
        item.payment?.paymentId ?? '',
        item.refund?.refundId ?? '',
        item.sessionEarningReview?.sessionEarningReviewId ?? '',
        item.settlement?.settlementId ?? '',
        item.payoutId ?? '',
        item.createdAt,
        item.resolvedAt ?? '',
      ]),
    ];

    const fromDate = query.createdFrom ? query.createdFrom.slice(0, 10) : 'all';
    const toDate = query.createdTo ? query.createdTo.slice(0, 10) : 'all';
    const fileName = `admin-practitioner-recoveries-${fromDate}-to-${toDate}.csv`;

    return {
      content: toCsvContent(rows),
      fileName,
    };
  }
}

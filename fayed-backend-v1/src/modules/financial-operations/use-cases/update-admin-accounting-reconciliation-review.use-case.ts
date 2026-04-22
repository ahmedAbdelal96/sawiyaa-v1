import { Injectable, NotFoundException } from '@nestjs/common';
import { JournalEntrySourceType } from '@prisma/client';
import { AccountingReconciliationRepository } from '../repositories/accounting-reconciliation.repository';
import { UpdateAdminAccountingReconciliationReviewDto } from '../dto/update-admin-accounting-reconciliation-review.dto';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

@Injectable()
export class UpdateAdminAccountingReconciliationReviewUseCase {
  constructor(
    private readonly repository: AccountingReconciliationRepository,
  ) {}

  async execute(input: {
    sourceType: JournalEntrySourceType;
    sourceId: string;
    reviewerUserId: string;
    body: UpdateAdminAccountingReconciliationReviewDto;
  }) {
    await this.assertSourceExists(input.sourceType, input.sourceId);

    const review = await this.repository.upsertReview({
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      status: input.body.status,
      note: input.body.note,
      reviewerUserId: input.reviewerUserId,
    });

    return {
      item: {
        sourceType: review.sourceType,
        sourceId: review.sourceId,
        status: review.status,
        note: review.note ?? null,
        reviewedAt: review.reviewedAt?.toISOString() ?? null,
        reviewedByUserId: review.reviewedByUserId ?? null,
        reviewedByDisplayName: review.reviewedByUser?.displayName ?? null,
      },
    };
  }

  private async assertSourceExists(
    sourceType: JournalEntrySourceType,
    sourceId: string,
  ) {
    if (sourceType === JournalEntrySourceType.PAYMENT_CAPTURED) {
      const payment = await this.repository.findCapturedPaymentById(sourceId);
      if (!payment) {
        throw new NotFoundException({
          messageKey: 'financialOperations.errors.resourceNotFoundInScope',
          error: FINANCIAL_OPS_ERROR_CODES.resourceNotFoundInScope,
        });
      }
      return;
    }

    if (sourceType === JournalEntrySourceType.REFUND_SUCCEEDED) {
      const refund = await this.repository.findSucceededRefundById(sourceId);
      if (!refund) {
        throw new NotFoundException({
          messageKey: 'financialOperations.errors.resourceNotFoundInScope',
          error: FINANCIAL_OPS_ERROR_CODES.resourceNotFoundInScope,
        });
      }
      return;
    }

    const payout = await this.repository.findPayoutById(sourceId);
    if (!payout) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.resourceNotFoundInScope',
        error: FINANCIAL_OPS_ERROR_CODES.resourceNotFoundInScope,
      });
    }
  }
}

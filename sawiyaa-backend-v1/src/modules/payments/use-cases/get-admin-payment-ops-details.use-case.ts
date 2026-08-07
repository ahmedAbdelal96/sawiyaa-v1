import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { PaymentMapper } from '../mappers/payment.mapper';
import { PaymentRepository } from '../repositories/payment.repository';

@Injectable()
export class GetAdminPaymentOpsDetailsUseCase {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentMapper: PaymentMapper,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: { paymentId: string }) {
    const payment = await this.paymentRepository.findAdminOpsById(
      input.paymentId,
    );

    if (!payment) {
      throw new NotFoundException({
        messageKey: 'payments.errors.paymentNotFound',
        error: 'PAYMENT_NOT_FOUND',
      });
    }

    const review = await this.prisma.sessionEarningReview.findFirst({
      where: {
        OR: [
          { paymentId: payment.id },
          ...(payment.sessionId ? [{ sessionId: payment.sessionId }] : []),
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      select: {
        id: true,
        reviewStatus: true,
        paymentAmount: true,
        paymentCurrencyCode: true,
        suggestedPractitionerAmount: true,
        accountantApprovedSourceAmount: true,
        practitionerId: true,
        settlementId: true,
      },
    });

    const [settlement, practitioner] = review
      ? await Promise.all([
          review.settlementId
            ? this.prisma.practitionerSettlement.findUnique({ where: { id: review.settlementId }, select: { id: true, status: true, originalAmount: true, originalCurrencyCode: true, finalWalletCredit: true, walletCurrencyCode: true, practitioner: { select: { publicSlug: true, user: { select: { displayName: true } } } } } })
            : Promise.resolve(null),
          this.prisma.practitionerProfile.findUnique({ where: { id: review.practitionerId }, select: { publicSlug: true, user: { select: { displayName: true } }, wallets: { where: { status: 'ACTIVE' }, select: { currencyCode: true }, take: 1 } } }),
        ])
      : [null, null] as const;
    const walletCurrency = settlement?.walletCurrencyCode ?? practitioner?.wallets[0]?.currencyCode ?? review?.paymentCurrencyCode ?? payment.currencyCode;
    const financialStage = review?.reviewStatus === 'PENDING_REVIEW'
      ? 'PENDING_REVIEW'
      : review?.reviewStatus === 'DECISION_APPROVED'
        ? 'DECISION_APPROVED'
        : review?.reviewStatus === 'REJECTED' || review?.reviewStatus === 'EXCLUDED_FROM_PAYOUT'
          ? 'REJECTED_OR_EXCLUDED'
          : settlement?.status === 'PAID_OUT' || settlement?.status === 'PAID'
            ? 'EXTERNAL_PAYOUT'
            : 'WALLET_CREDITED';
    const relatedSettlement = review
      ? {
          id: settlement?.id ?? review.id,
          reviewId: review.id,
          reference: settlement?.id ?? null,
          reviewStatus: review.reviewStatus,
          financialStage,
          status: settlement?.status ?? review.reviewStatus,
          practitionerName: settlement?.practitioner.user?.displayName ?? settlement?.practitioner.publicSlug ?? practitioner?.user?.displayName ?? practitioner?.publicSlug ?? '-',
          originalAmount: (settlement?.originalAmount ?? review.paymentAmount).toString(),
          originalCurrency: settlement?.originalCurrencyCode ?? review.paymentCurrencyCode,
          finalAmount: (settlement?.finalWalletCredit ?? review.accountantApprovedSourceAmount ?? review.suggestedPractitionerAmount).toString(),
          walletCurrency,
        }
      : null;

    const viewModel = this.paymentMapper.toAdminOpsViewModel(payment as never);
    viewModel.relatedSettlement = relatedSettlement;

    return {
      item: viewModel,
    };
  }
}

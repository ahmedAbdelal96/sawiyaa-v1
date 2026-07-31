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

    let relatedSettlement: any = null;
    if (payment.sessionId) {
      const settlement = await this.prisma.practitionerSettlement.findFirst({
        where: {
          sourceReview: {
            sessionId: payment.sessionId,
          },
        },
        include: {
          practitioner: {
            include: {
              user: true,
            },
          },
        },
      });

      if (settlement) {
        relatedSettlement = {
          id: settlement.id,
          reference: settlement.sourceReviewId || null,
          status: settlement.status,
          practitionerName: settlement.practitioner?.user?.displayName ?? settlement.practitioner?.publicSlug ?? '-',
          originalAmount: settlement.originalAmount.toString(),
          originalCurrency: settlement.originalCurrencyCode,
          finalAmount: settlement.finalWalletCredit.toString(),
          walletCurrency: settlement.walletCurrencyCode,
        };
      }
    }

    const viewModel = this.paymentMapper.toAdminOpsViewModel(payment as never);
    viewModel.relatedSettlement = relatedSettlement;

    return {
      item: viewModel,
    };
  }
}

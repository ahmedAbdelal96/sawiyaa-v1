import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Payment, PaymentStatus, PaymentPurpose } from '@prisma/client';
import { PaymentRepository } from '@modules/payments/repositories/payment.repository';
import { HandlePackagePurchasePaymentFailureUseCase } from './handle-package-purchase-payment-failure.use-case';
import { HandlePackagePurchasePaymentSuccessUseCase } from './handle-package-purchase-payment-success.use-case';

@Injectable()
export class ReconcilePackagePurchasePaymentUseCase {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly handlePackagePurchasePaymentSuccessUseCase: HandlePackagePurchasePaymentSuccessUseCase,
    private readonly handlePackagePurchasePaymentFailureUseCase: HandlePackagePurchasePaymentFailureUseCase,
  ) {}

  async execute(input: {
    paymentId: string;
    providerEventRef: string;
    payload: Record<string, unknown>;
    payment?: Payment | null;
  }) {
    const payment =
      input.payment ?? (await this.paymentRepository.findById(input.paymentId));

    if (!payment) {
      throw new NotFoundException({
        messageKey: 'packagePurchases.errors.paymentNotFound',
        error: 'PACKAGE_PURCHASE_PAYMENT_NOT_FOUND',
      });
    }

    if (payment.paymentPurpose !== PaymentPurpose.SESSION_PACKAGE_PURCHASE) {
      throw new ConflictException({
        messageKey: 'packagePurchases.errors.notPayable',
        error: 'PACKAGE_PURCHASE_NOT_PAYABLE',
      });
    }

    switch (payment.status) {
      case PaymentStatus.CAPTURED:
      case PaymentStatus.AUTHORIZED:
        return this.handlePackagePurchasePaymentSuccessUseCase.execute({
          paymentId: payment.id,
          providerEventRef: input.providerEventRef,
          payload: input.payload,
          payment,
        });
      case PaymentStatus.FAILED:
        return this.handlePackagePurchasePaymentFailureUseCase.execute({
          paymentId: payment.id,
          providerEventRef: input.providerEventRef,
          payload: input.payload,
          terminalOutcome: 'FAILED',
          payment,
        });
      case PaymentStatus.EXPIRED:
        return this.handlePackagePurchasePaymentFailureUseCase.execute({
          paymentId: payment.id,
          providerEventRef: input.providerEventRef,
          payload: input.payload,
          terminalOutcome: 'EXPIRED',
          payment,
        });
      default:
        throw new ConflictException({
          messageKey: 'packagePurchases.errors.notPayable',
          error: 'PACKAGE_PURCHASE_PAYMENT_NOT_READY_FOR_RECONCILIATION',
        });
    }
  }
}

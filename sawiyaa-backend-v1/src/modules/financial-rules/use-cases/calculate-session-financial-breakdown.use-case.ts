import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { CustomerWalletAccountingService } from '@modules/customer-wallets/services/customer-wallet-accounting.service';
import { FinancialRulesMapper } from '../mappers/financial-rules.mapper';
import { FinancialSessionRepository } from '../repositories/financial-session.repository';
import { CalculateSessionFinancialBreakdownService } from '../services/calculate-session-financial-breakdown.service';

@Injectable()
export class CalculateSessionFinancialBreakdownUseCase {
  constructor(
    private readonly financialSessionRepository: FinancialSessionRepository,
    private readonly calculateSessionFinancialBreakdownService: CalculateSessionFinancialBreakdownService,
    private readonly financialRulesMapper: FinancialRulesMapper,
    private readonly customerWalletAccountingService: CustomerWalletAccountingService,
  ) {}

  async execute(input: {
    userId: string;
    sessionId: string;
    couponCode?: string | null;
    requestCountryIsoCode?: string | null;
  }) {
    const session =
      await this.financialSessionRepository.findPatientOwnedSession(
        input.sessionId,
        input.userId,
      );

    if (!session) {
      throw new NotFoundException({
        messageKey: 'financialRules.errors.sessionNotFound',
        error: 'FINANCIAL_RULE_SESSION_NOT_FOUND',
      });
    }

    const resolution =
      await this.calculateSessionFinancialBreakdownService.calculate({
        session: {
          id: session.id,
          flowType: session.flowType,
          sessionMode: session.sessionMode,
          durationMinutes: session.durationMinutes,
          pricingPolicySnapshotJson: session.pricingPolicySnapshotJson,
          practitioner: session.practitioner,
          patient: session.patient,
          payments: session.payments,
          instantBookingRequest: session.instantBookingRequest,
        },
        requestCountryIsoCode: input.requestCountryIsoCode ?? null,
        couponCode: input.couponCode ?? null,
      });

    const payment = session.payments?.[0];
    const locked = Boolean(
      payment &&
      ![
        PaymentStatus.FAILED,
        PaymentStatus.CANCELLED,
        PaymentStatus.EXPIRED,
      ].includes(payment.status as 'FAILED' | 'CANCELLED' | 'EXPIRED'),
    );
    const available =
      await this.customerWalletAccountingService.getAvailableBalance({
        patientId: session.patient.id,
        currencyCode: resolution.currencyCode,
      });
    const total = new Prisma.Decimal(resolution.amountTotal);
    const walletUsed = locked
      ? payment.amountFromWallet
      : Prisma.Decimal.min(Prisma.Decimal.max(0, available), total);
    const gatewayAmount = locked
      ? payment.amountFromGateway
      : total.sub(walletUsed);
    return {
      item: {
        ...this.financialRulesMapper.toBreakdown(resolution.breakdown),
        fundingPreview: {
          walletUsed: walletUsed.toFixed(2),
          gatewayAmount: gatewayAmount.toFixed(2),
          gatewayAmountWithoutWallet: locked
            ? gatewayAmount.toFixed(2)
            : total.toFixed(2),
          walletAvailable: available.toFixed(2),
          locked,
        },
      },
    };
  }
}

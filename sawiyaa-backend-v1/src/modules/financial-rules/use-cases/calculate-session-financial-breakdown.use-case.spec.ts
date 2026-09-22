import { Prisma, SessionFlowType, SessionMode } from '@prisma/client';
import { CustomerWalletAccountingService } from '@modules/customer-wallets/services/customer-wallet-accounting.service';
import { FinancialRulesMapper } from '../mappers/financial-rules.mapper';
import { FinancialSessionRepository } from '../repositories/financial-session.repository';
import { CalculateSessionFinancialBreakdownService } from '../services/calculate-session-financial-breakdown.service';
import { CalculateSessionFinancialBreakdownUseCase } from './calculate-session-financial-breakdown.use-case';

describe('CalculateSessionFinancialBreakdownUseCase currency context', () => {
  it('forwards trusted Egypt request country so checkout receives an EGP quote', async () => {
    const calculate = jest.fn().mockResolvedValue({
      currencyCode: 'EGP',
      amountTotal: '520.00',
      breakdown: { currency: 'EGP', netPaidAmount: '520.00' },
    });
    const repository = {
      findPatientOwnedSession: jest.fn().mockResolvedValue({
        id: 'session-1',
        flowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 30,
        pricingPolicySnapshotJson: {
          pricingSnapshot: { EGP: { '30': '520.00' }, USD: { '30': '20.00' } },
        },
        practitioner: { country: null, specialties: [] },
        patient: { id: 'patient-1', country: null },
        payments: [],
        instantBookingRequest: null,
      }),
    };
    const mapper = {
      toBreakdown: jest.fn((breakdown) => breakdown),
    };
    const wallet = {
      getAvailableBalance: jest.fn().mockResolvedValue(new Prisma.Decimal(0)),
    };
    const useCase = new CalculateSessionFinancialBreakdownUseCase(
      repository as unknown as FinancialSessionRepository,
      { calculate } as unknown as CalculateSessionFinancialBreakdownService,
      mapper as unknown as FinancialRulesMapper,
      wallet as unknown as CustomerWalletAccountingService,
    );

    await useCase.execute({
      userId: 'patient-user-1',
      sessionId: 'session-1',
      requestCountryIsoCode: 'EG',
    } as never);

    expect(calculate).toHaveBeenCalledWith(
      expect.objectContaining({ requestCountryIsoCode: 'EG' }),
    );
  });
});

import { PaymentPurpose, SessionFlowType, SessionMode } from '@prisma/client';
import { CommissionRuleRepository } from '../repositories/commission-rule.repository';
import { MoneyMathService } from './money-math.service';
import { ResolveCommissionRuleService } from './resolve-commission-rule.service';
import { ValidateCommissionRuleDefinitionService } from './validate-commission-rule-definition.service';

describe('ResolveCommissionRuleService', () => {
  const commissionRuleRepository = {
    listActiveRules: jest.fn(),
  } as unknown as CommissionRuleRepository;

  const validateCommissionRuleDefinitionService = {
    validate: jest.fn(),
  } as unknown as ValidateCommissionRuleDefinitionService;

  const service = new ResolveCommissionRuleService(
    commissionRuleRepository,
    validateCommissionRuleDefinitionService,
    new MoneyMathService(),
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (commissionRuleRepository.listActiveRules as jest.Mock).mockResolvedValue([
      {
        id: 'rule-1',
        slug: 'default',
        priority: 1,
        isDefault: true,
        marketType: 'ANY',
        practitionerCountryId: null,
        patientCountryId: null,
        sessionFlowType: null,
        sessionMode: null,
        specialtyId: null,
        platformRatePercent: '20.00',
        practitionerRatePercent: '80.00',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);
  });

  it('maps instant sessions to the instant booking payment purpose', async () => {
    const result = await service.resolveForSession({
      id: 'session-1',
      flowType: SessionFlowType.INSTANT,
      sessionMode: SessionMode.VIDEO,
      durationMinutes: 30,
      practitioner: {
        countryId: 'country-egy',
        country: {
          isoCode: 'EGY',
          currencyCode: 'EGP',
        },
        specialties: [
          {
            specialtyId: 'spec-1',
            isPrimary: true,
          },
        ],
      },
      patient: {
        countryId: 'country-egy',
        country: {
          isoCode: 'EGY',
          currencyCode: 'EGP',
        },
      },
    } as never);

    expect(result.paymentPurpose).toBe(PaymentPurpose.SESSION_INSTANT_BOOKING);
  });

  it('keeps scheduled sessions on the normal session booking purpose', async () => {
    const result = await service.resolveForSession({
      id: 'session-1',
      flowType: SessionFlowType.SCHEDULED,
      sessionMode: SessionMode.VIDEO,
      durationMinutes: 30,
      practitioner: {
        countryId: 'country-egy',
        country: {
          isoCode: 'EGY',
          currencyCode: 'EGP',
        },
        specialties: [
          {
            specialtyId: 'spec-1',
            isPrimary: true,
          },
        ],
      },
      patient: {
        countryId: 'country-egy',
        country: {
          isoCode: 'EGY',
          currencyCode: 'EGP',
        },
      },
    } as never);

    expect(result.paymentPurpose).toBe(PaymentPurpose.SESSION_BOOKING);
  });
});

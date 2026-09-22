import { PatientSessionFinancialRulesController } from './patient-session-financial-rules.controller';
import { COUNTRY_CONTEXT_KEY } from '@modules/auth/utils/request-country-context.util';

describe('PatientSessionFinancialRulesController currency context', () => {
  it('forwards trusted request country to the patient quote use case', () => {
    const calculateBreakdown = { execute: jest.fn() };
    const controller = new PatientSessionFinancialRulesController(
      {} as never,
      calculateBreakdown as never,
    );

    controller.calculateBreakdown(
      { id: 'patient-user-1' } as never,
      'session-1',
      {} as never,
      {
        [COUNTRY_CONTEXT_KEY]: { countryCode: 'EG', source: 'HEADER_CF' },
      } as never,
    );

    expect(calculateBreakdown.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'patient-user-1',
        sessionId: 'session-1',
        requestCountryIsoCode: 'EG',
      }),
    );
  });
});

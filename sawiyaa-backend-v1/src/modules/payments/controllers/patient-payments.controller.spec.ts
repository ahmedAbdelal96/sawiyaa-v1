import { PatientPaymentsController } from './patient-payments.controller';
import { COUNTRY_CONTEXT_KEY } from '@modules/auth/utils/request-country-context.util';

describe('PatientPaymentsController payment initiation context', () => {
  it('forwards the trusted request country to payment initiation', () => {
    const initiateSessionPaymentUseCase = { execute: jest.fn() };
    const controller = new PatientPaymentsController(
      initiateSessionPaymentUseCase as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const request = {
      headers: {},
      ip: '127.0.0.1',
      [COUNTRY_CONTEXT_KEY]: { countryCode: 'US', source: 'HEADER_CF' },
    } as never;

    controller.initiate(
      { id: 'patient-1' } as never,
      'en',
      'session-1',
      { acceptedRefundPolicyId: 'policy-1' } as never,
      request,
    );

    expect(initiateSessionPaymentUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ requestCountryIsoCode: 'US' }),
    );
  });
});

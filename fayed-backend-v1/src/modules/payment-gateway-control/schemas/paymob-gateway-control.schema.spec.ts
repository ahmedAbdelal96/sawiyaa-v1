import {
  paymobGatewayControlDraftSchema,
  paymobGatewayMethodEntrySchema,
} from './paymob-gateway-control.schema';

describe('paymobGatewayControlDraftSchema', () => {
  it('accepts a bounded Paymob control draft', () => {
    const result = paymobGatewayControlDraftSchema.safeParse({
      enabled: true,
      checkoutFlow: 'legacy',
      defaultMethod: 'CARD',
      maintenanceMode: false,
      allowedCountryIsoCodes: ['EG'],
      methodRegistry: [
        {
          key: 'CARD',
          label: 'Card',
          type: 'CARD',
          enabled: true,
          priority: 100,
          supportedCheckoutFlows: ['legacy', 'intention'],
          countryIsoCodes: ['EG'],
          integrationId: '5611307',
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects unknown fields in method entries', () => {
    const result = paymobGatewayMethodEntrySchema.safeParse({
      key: 'CARD',
      label: 'Card',
      type: 'CARD',
      enabled: true,
      priority: 100,
      supportedCheckoutFlows: ['legacy'],
      countryIsoCodes: ['EG'],
      integrationId: '5611307',
      unexpected: true,
    });

    expect(result.success).toBe(false);
  });
});

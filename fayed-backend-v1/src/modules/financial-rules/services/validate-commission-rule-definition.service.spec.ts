import { ValidateCommissionRuleDefinitionService } from './validate-commission-rule-definition.service';
import { MoneyMathService } from './money-math.service';

describe('ValidateCommissionRuleDefinitionService', () => {
  const service = new ValidateCommissionRuleDefinitionService(
    new MoneyMathService(),
  );

  it('accepts valid 100 percent splits', () => {
    expect(() =>
      service.validate({
        platformRatePercent: '25.00',
        practitionerRatePercent: '75.00',
      }),
    ).not.toThrow();
  });

  it('rejects invalid commission splits', () => {
    expect(() =>
      service.validate({
        platformRatePercent: '20.00',
        practitionerRatePercent: '70.00',
      }),
    ).toThrow();
  });
});

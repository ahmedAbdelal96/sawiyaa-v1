import { ValidateSettlementStatusTransitionService } from './validate-settlement-status-transition.service';

describe('ValidateSettlementStatusTransitionService', () => {
  const service = new ValidateSettlementStatusTransitionService();

  it('allows generated to completed', () => {
    expect(() => service.assertCanTransition('GENERATED', 'COMPLETED')).not.toThrow();
  });

  it('rejects completed to generated', () => {
    expect(() => service.assertCanTransition('COMPLETED', 'GENERATED')).toThrow();
  });
});

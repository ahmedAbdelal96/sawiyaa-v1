import 'reflect-metadata';
import { STEP_UP_POLICY_KEY, RequireStepUp } from './step-up.decorator';

describe('RequireStepUp', () => {
  it('stores the step-up action metadata', () => {
    class SampleController {
      @RequireStepUp('finance.refund.approve')
      mutate(): void {}
    }

    const metadata = Reflect.getMetadata(
      STEP_UP_POLICY_KEY,
      SampleController.prototype.mutate,
    );

    expect(metadata).toBe('finance.refund.approve');
  });
});

import { packagePlansSeedModule } from './package-plans.seed';
import { STANDARD_PACKAGE_PLANS } from '../../../src/modules/package-plans/package-plan.catalog';

describe('packagePlansSeedModule', () => {
  it('seeds exactly the three standardized plans', async () => {
    const upsert = jest.fn();
    const prisma = {
      packagePlan: { upsert },
    } as never;

    await packagePlansSeedModule.run(prisma);

    expect(upsert).toHaveBeenCalledTimes(3);
    expect(upsert.mock.calls.map((call: unknown[]) => call[0].where.code)).toEqual(
      STANDARD_PACKAGE_PLANS.map((item) => item.code),
    );
  });
});

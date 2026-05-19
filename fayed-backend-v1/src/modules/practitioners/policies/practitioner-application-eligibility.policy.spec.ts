import { PractitionerApplicationStatus } from '@prisma/client';
import { PractitionerApplicationEligibilityPolicy } from './practitioner-application-eligibility.policy';

describe('PractitionerApplicationEligibilityPolicy', () => {
  const policy = new PractitionerApplicationEligibilityPolicy();

  it('blocks approved and archived applications from resubmission', () => {
    const readiness = {
      canSubmitApplication: true,
    } as never;

    expect(
      policy.evaluate({
        readiness,
        latestApplicationStatus: PractitionerApplicationStatus.APPROVED,
      }),
    ).toEqual({
      canSubmit: false,
      reason: 'APPLICATION_ALREADY_SUBMITTED',
    });

    expect(
      policy.evaluate({
        readiness,
        latestApplicationStatus: PractitionerApplicationStatus.ARCHIVED,
      }),
    ).toEqual({
      canSubmit: false,
      reason: 'APPLICATION_ALREADY_SUBMITTED',
    });
  });
});

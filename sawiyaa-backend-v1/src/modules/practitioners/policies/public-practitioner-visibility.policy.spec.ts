import { PractitionerStatus, UserStatus } from '@prisma/client';
import { PublicPractitionerVisibilityPolicy } from './public-practitioner-visibility.policy';

const ready = (
  overrides: Partial<
    Parameters<PublicPractitionerVisibilityPolicy['evaluate']>[0]
  > = {},
) => ({
  practitionerStatus: PractitionerStatus.APPROVED,
  userStatus: UserStatus.ACTIVE,
  isPublicProfilePublished: true,
  hasPublicSlug: true,
  hasDisplayName: true,
  hasProfessionalTitle: true,
  hasBio: true,
  hasAtLeastOneActiveSpecialty: true,
  ...overrides,
});

describe('PublicPractitionerVisibilityPolicy', () => {
  const policy = new PublicPractitionerVisibilityPolicy();

  it('publishes only an approved, active, ready profile', () => {
    expect(policy.evaluate(ready())).toMatchObject({
      isVisible: true,
      isVerified: true,
      blockers: [],
    });
  });

  it('returns exact blockers for an incomplete profile', () => {
    expect(
      policy
        .evaluate(
          ready({
            practitionerStatus: PractitionerStatus.PENDING_REVIEW,
            isPublicProfilePublished: false,
            hasBio: false,
            hasAtLeastOneActiveSpecialty: false,
          }),
        )
        .blockers.map((item) => item.code),
    ).toEqual([
      'PRACTITIONER_NOT_APPROVED',
      'BIO_REQUIRED',
      'ACTIVE_SPECIALTY_REQUIRED',
    ]);
  });

  it('keeps approved and ready unpublished profiles private', () => {
    expect(
      policy.evaluate(ready({ isPublicProfilePublished: false })),
    ).toMatchObject({ isVisible: false, blockers: [] });
  });
});

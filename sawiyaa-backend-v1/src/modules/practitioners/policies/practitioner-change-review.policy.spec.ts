import { PractitionerChangeReviewPolicy } from './practitioner-change-review.policy';

describe('PractitionerChangeReviewPolicy', () => {
  it('treats display name as a review-required identity field', () => {
    const policy = new PractitionerChangeReviewPolicy();

    expect(
      policy.getChangedProfileFields({ displayName: 'Dr. New Name' }),
    ).toEqual(['displayName']);
  });

  it('does not classify operational pricing as a profile review field', () => {
    const policy = new PractitionerChangeReviewPolicy();

    expect(policy.getChangedProfileFields({ sessionPrice30Egp: 500 })).toEqual(
      [],
    );
  });

  it('keeps operational profile attributes out of professional review', () => {
    const policy = new PractitionerChangeReviewPolicy();

    expect(
      policy.getChangedProfileFields({
        yearsOfExperience: 12,
        practitionerType: 'PSYCHOLOGIST',
        practitionerGender: 'FEMALE',
        countryCode: 'EG',
      }),
    ).toEqual([]);
  });
});

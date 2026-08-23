import { Injectable } from '@nestjs/common';

export type ReviewableProfileField =
  | 'professionalTitle'
  | 'bio'
  | 'yearsOfExperience'
  | 'practitionerType'
  | 'practitionerGender'
  | 'countryCode'
  | 'professionalContent'
  | 'primaryContentLocale';

/** Central source of truth for profile fields that must remain staged until review. */
@Injectable()
export class PractitionerChangeReviewPolicy {
  readonly reviewableProfileFields: readonly ReviewableProfileField[] = [
    'professionalTitle',
    'bio',
    'yearsOfExperience',
    'practitionerType',
    'practitionerGender',
    'countryCode',
    'professionalContent',
    'primaryContentLocale',
  ];

  getChangedProfileFields(input: Record<string, unknown>) {
    return this.reviewableProfileFields.filter(
      (field) => input[field] !== undefined,
    );
  }
}

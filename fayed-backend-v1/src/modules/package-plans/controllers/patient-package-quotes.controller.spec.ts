import { PATH_METADATA } from '@nestjs/common/constants';
import { PatientPackageQuotesController } from './patient-package-quotes.controller';

describe('PatientPackageQuotesController routes', () => {
  it('uses the patient package purchases route', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PatientPackageQuotesController)).toBe(
      'patients/me/package-purchases',
    );
  });
});

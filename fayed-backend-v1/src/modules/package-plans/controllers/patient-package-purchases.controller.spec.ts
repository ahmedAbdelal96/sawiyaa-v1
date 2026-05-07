import { PATH_METADATA } from '@nestjs/common/constants';
import { PatientPackagePurchasesController } from './patient-package-purchases.controller';

describe('PatientPackagePurchasesController routes', () => {
  it('uses the patient package purchases route', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PatientPackagePurchasesController)).toBe(
      'patients/me/package-purchases',
    );
  });

  it('exposes the payment initiation route under the package purchases namespace', () => {
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        PatientPackagePurchasesController.prototype.initiatePayment,
      ),
    ).toBe(':id/payments/initiate');
  });
});

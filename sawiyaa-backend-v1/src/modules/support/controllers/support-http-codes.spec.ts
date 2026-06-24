import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { AdminSupportController } from './admin-support.controller';
import { PatientSupportController } from './patient-support.controller';
import { PractitionerSupportController } from './practitioner-support.controller';

describe('Support controllers http code contract', () => {
  it('keeps ticket creation endpoints on default 201', () => {
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        PatientSupportController.prototype.create,
      ),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        PractitionerSupportController.prototype.create,
      ),
    ).toBeUndefined();
  });

  it('forces action POST endpoints to return 200', () => {
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        PatientSupportController.prototype.addMessage,
      ),
    ).toBe(200);
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        PractitionerSupportController.prototype.addMessage,
      ),
    ).toBe(200);
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        AdminSupportController.prototype.addMessage,
      ),
    ).toBe(200);
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        AdminSupportController.prototype.addInternalNote,
      ),
    ).toBe(200);
  });
});

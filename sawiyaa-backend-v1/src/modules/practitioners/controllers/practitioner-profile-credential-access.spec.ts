jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  createReadStream: jest.fn().mockReturnValue({}),
}));

import { PractitionerProfileController } from './practitioner-profile.controller';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { ACCOUNT_STATE_REQUIREMENTS_KEY } from '@common/constants/auth-metadata.constants';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';

describe('Practitioner credential view controller', () => {
  it('uses the protected file use case and private no-store headers', async () => {
    const controller = Object.create(PractitionerProfileController.prototype) as PractitionerProfileController;
    (controller as any).getPractitionerCredentialFileUseCase = {
      execute: jest.fn().mockResolvedValue({ absolutePath: 'C:/private/file.pdf', mimeType: 'application/pdf' }),
    };
    const response = { setHeader: jest.fn() };

    const result = await controller.viewCredential(
      { id: 'user-1' } as any,
      'credential-1',
      response as any,
    );

    expect((controller as any).getPractitionerCredentialFileUseCase.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      credentialId: 'credential-1',
    });
    expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
    expect(result).toBeDefined();
  });

  it('keeps authentication and role guards on the controller', () => {
    const guards = Reflect.getMetadata('__guards__', PractitionerProfileController);
    expect(guards).toContain(JwtAccessAuthGuard);
    expect(guards).toContain(RolesGuard);
  });

  it('requires approval for operational profile writes while leaving applicant submission available', () => {
    const prototype = PractitionerProfileController.prototype;
    expect(
      Reflect.getMetadata(ACCOUNT_STATE_REQUIREMENTS_KEY, prototype.update),
    ).toContain(AccountStateRequirement.PRACTITIONER_APPROVED);
    expect(
      Reflect.getMetadata(ACCOUNT_STATE_REQUIREMENTS_KEY, prototype.setSpecialties),
    ).toContain(AccountStateRequirement.PRACTITIONER_APPROVED);
    expect(
      Reflect.getMetadata(ACCOUNT_STATE_REQUIREMENTS_KEY, prototype.submitApplication) ?? [],
    ).not.toContain(AccountStateRequirement.PRACTITIONER_APPROVED);
  });
});

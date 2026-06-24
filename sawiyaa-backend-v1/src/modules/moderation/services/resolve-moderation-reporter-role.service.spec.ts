import { ForbiddenException } from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import { ResolveModerationReporterRoleService } from './resolve-moderation-reporter-role.service';

describe('ResolveModerationReporterRoleService', () => {
  const service = new ResolveModerationReporterRoleService();

  it('resolves privileged roles deterministically', () => {
    expect(
      service.resolve({
        id: 'u1',
        roles: [AppRole.PATIENT, AppRole.ADMIN],
      }),
    ).toBe('ADMIN');
  });

  it('rejects users with unsupported roles', () => {
    expect(() =>
      service.resolve({
        id: 'u2',
        roles: [],
      }),
    ).toThrow(ForbiddenException);
  });
});

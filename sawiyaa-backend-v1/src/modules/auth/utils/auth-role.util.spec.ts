import { UserRoleType } from '@prisma/client';
import { AppRole } from '@common/enums/app-role.enum';
import { mapUserRoleTypeToAppRole } from './auth-role.util';

describe('auth role mapping', () => {
  it('maps TRAINEE without falling back to PATIENT', () => {
    expect(mapUserRoleTypeToAppRole(UserRoleType.TRAINEE)).toBe(AppRole.TRAINEE);
  });

  it('rejects an unknown persisted role', () => {
    expect(() => mapUserRoleTypeToAppRole('UNKNOWN' as UserRoleType)).toThrow(
      'Unsupported persisted user role',
    );
  });
});

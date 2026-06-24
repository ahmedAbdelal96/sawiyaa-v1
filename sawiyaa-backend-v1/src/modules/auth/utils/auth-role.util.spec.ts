import { AppRole } from '@common/enums/app-role.enum';
import { UserRoleType } from '@prisma/client';
import { mapUserRoleTypeToAppRole, normalizeAppRoles } from './auth-role.util';

describe('auth-role util', () => {
  it('maps SUPER_ADMIN to first-class SUPER_ADMIN app role', () => {
    expect(mapUserRoleTypeToAppRole(UserRoleType.SUPER_ADMIN)).toBe(
      AppRole.SUPER_ADMIN,
    );
  });

  it('keeps SUPER_ADMIN distinct while preserving ADMIN compatibility', () => {
    expect(normalizeAppRoles([AppRole.SUPER_ADMIN])).toEqual([
      AppRole.SUPER_ADMIN,
      AppRole.ADMIN,
    ]);
  });
});

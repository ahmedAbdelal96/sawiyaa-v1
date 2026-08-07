import {
  PERMISSIONS_KEY,
  ROLES_KEY,
} from '@common/constants/auth-metadata.constants';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { AdminAcademyProgramsController } from './admin-academy-programs.controller';

describe('AdminAcademyProgramsController access contract', () => {
  it('keeps SUPER_ADMIN in the administrative role boundary', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, AdminAcademyProgramsController),
    ).toEqual([AppRole.ADMIN, AppRole.SUPER_ADMIN]);
  });

  it('requires the dedicated permission for manual enrollments', () => {
    const method = (
      AdminAcademyProgramsController.prototype as unknown as Record<
        string,
        unknown
      >
    ).createManualProgramEnrollment as (...args: never[]) => unknown;
    expect(Reflect.getMetadata(PERMISSIONS_KEY, method)).toEqual([
      PermissionKey.ACADEMY_ENROLLMENTS_CREATE_MANUAL,
    ]);
  });
});

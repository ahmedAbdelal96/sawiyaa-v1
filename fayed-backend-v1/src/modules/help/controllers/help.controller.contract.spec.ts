import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '@common/constants/auth-metadata.constants';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AdminHelpController } from './admin-help.controller';
import { PublicHelpController } from './public-help.controller';

describe('Help controllers contract', () => {
  it('keeps admin help controller scoped to admin access', () => {
    const classRoles = Reflect.getMetadata(
      ROLES_KEY,
      AdminHelpController,
    ) as unknown as AppRole[] | undefined;
    expect(classRoles).toEqual([AppRole.ADMIN]);
  });

  it('enforces auth and role guards for admin help controller', () => {
    const classGuards =
      (Reflect.getMetadata(GUARDS_METADATA, AdminHelpController) as unknown as
        | unknown[]
        | undefined) ?? [];

    expect(classGuards).toContain(JwtAccessAuthGuard);
    expect(classGuards).toContain(RolesGuard);
  });

  it('exposes admin category and question handlers', () => {
    const proto = AdminHelpController.prototype as unknown as {
      listCategories: unknown;
      createCategory: unknown;
      updateCategory: unknown;
      deleteCategory: unknown;
      reorderCategories: unknown;
      listQuestions: unknown;
      createQuestion: unknown;
      updateQuestion: unknown;
      deleteQuestion: unknown;
      reorderQuestions: unknown;
    };

    expect(typeof proto.listCategories).toBe('function');
    expect(typeof proto.createCategory).toBe('function');
    expect(typeof proto.updateCategory).toBe('function');
    expect(typeof proto.deleteCategory).toBe('function');
    expect(typeof proto.reorderCategories).toBe('function');
    expect(typeof proto.listQuestions).toBe('function');
    expect(typeof proto.createQuestion).toBe('function');
    expect(typeof proto.updateQuestion).toBe('function');
    expect(typeof proto.deleteQuestion).toBe('function');
    expect(typeof proto.reorderQuestions).toBe('function');
  });

  it('exposes public help handlers', () => {
    const proto = PublicHelpController.prototype as unknown as {
      getPublicHelp: unknown;
      getCategories: unknown;
      getQuestions: unknown;
      search: unknown;
    };

    expect(typeof proto.getPublicHelp).toBe('function');
    expect(typeof proto.getCategories).toBe('function');
    expect(typeof proto.getQuestions).toBe('function');
    expect(typeof proto.search).toBe('function');
  });
});

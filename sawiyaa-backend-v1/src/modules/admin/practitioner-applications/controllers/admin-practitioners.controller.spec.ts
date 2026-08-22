import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, ParseUUIDPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminPractitionersController } from './admin-practitioners.controller';
import { GetAdminPractitionerDetailsUseCase } from '../use-cases/get-admin-practitioner-details.use-case';
import { ListAdminPractitionersDirectoryUseCase } from '../use-cases/list-admin-practitioners-directory.use-case';
import { UpdateAdminPractitionerAvatarUseCase } from '../use-cases/update-admin-practitioner-avatar.use-case';
import { RemoveAdminPractitionerAvatarUseCase } from '../use-cases/remove-admin-practitioner-avatar.use-case';
import { ClearPractitionerAuthLockoutUseCase } from '../use-cases/clear-practitioner-auth-lockout.use-case';
import { GetAdminPractitionerAvatarFileUseCase } from '../use-cases/get-admin-practitioner-avatar-file.use-case';
import { ManagePractitionerPublicationUseCase } from '../use-cases/manage-practitioner-publication.use-case';
import { AdminGuard } from '@common/guards/authorization/admin.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionResolverService } from '@common/guards/authorization/permission-resolver.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { AppRole } from '@common/enums/app-role.enum';

describe('AdminPractitionersController (Authorization and Routing)', () => {
  let controller: AdminPractitionersController;
  let getDetailsUseCase: GetAdminPractitionerDetailsUseCase;

  const mockGetAdminPractitionerDetailsUseCase = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminPractitionersController],
      providers: [
        {
          provide: GetAdminPractitionerDetailsUseCase,
          useValue: mockGetAdminPractitionerDetailsUseCase,
        },
        {
          provide: ListAdminPractitionersDirectoryUseCase,
          useValue: {},
        },
        {
          provide: UpdateAdminPractitionerAvatarUseCase,
          useValue: {},
        },
        {
          provide: RemoveAdminPractitionerAvatarUseCase,
          useValue: {},
        },
        {
          provide: ClearPractitionerAuthLockoutUseCase,
          useValue: {},
        },
        {
          provide: GetAdminPractitionerAvatarFileUseCase,
          useValue: {},
        },
        {
          provide: ManagePractitionerPublicationUseCase,
          useValue: {},
        },
        {
          provide: PermissionResolverService,
          useValue: {
            hasPermissions: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: SecurityAuditService,
          useValue: {
            logAsync: jest.fn(),
          },
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<AdminPractitionersController>(AdminPractitionersController);
    getDetailsUseCase = module.get<GetAdminPractitionerDetailsUseCase>(GetAdminPractitionerDetailsUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Route Guards and Decorators', () => {
    it('should have JwtAccessAuthGuard, AdminGuard, and PermissionsGuard applied to the class', () => {
      const guards = Reflect.getMetadata('__guards__', AdminPractitionersController);
      expect(guards).toContain(JwtAccessAuthGuard);
      expect(guards).toContain(AdminGuard);
      expect(guards).toContain(PermissionsGuard);
    });

  it('details method should require PRACTITIONER_APPLICATIONS_READ permission', () => {
      const permissions = Reflect.getMetadata('auth:permissions', controller.details);
      expect(permissions).toContain(PermissionKey.PRACTITIONER_APPLICATIONS_READ);
    });
  });

    it('publication read/write methods require centralized permissions', () => {
      expect(Reflect.getMetadata('auth:permissions', controller.getPublication)).toContain(
        PermissionKey.PRACTITIONER_PUBLICATION_READ,
      );
      expect(Reflect.getMetadata('auth:permissions', controller.updatePublication)).toContain(
        PermissionKey.PRACTITIONER_PUBLICATION_WRITE,
      );
    });

  describe('details endpoint', () => {
    const pId = '77777777-7777-7777-7777-777777777777';

    it('should call use case and return details successfully', async () => {
      const mockResult = {
        message: 'Loaded',
        details: { id: pId, displayName: 'Dr. John' },
      };
      mockGetAdminPractitionerDetailsUseCase.execute.mockResolvedValue(mockResult);

      const result = await controller.details(pId, 'en');

      expect(getDetailsUseCase.execute).toHaveBeenCalledWith({ id: pId, locale: 'en' });
      expect(result).toEqual(mockResult);
    });

    it('should forward NotFoundException from use case when ID is unknown', async () => {
      mockGetAdminPractitionerDetailsUseCase.execute.mockRejectedValue(
        new NotFoundException('Practitioner not found'),
      );

      await expect(controller.details(pId, 'en')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Guard Logics', () => {
    const adminGuard = new AdminGuard();

    it('should allow ADMIN and SUPER_ADMIN roles in AdminGuard', () => {
      const mockContext = (userRoles: string[]) => ({
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              roles: userRoles,
            },
          }),
        }),
      } as any);

      expect(adminGuard.canActivate(mockContext([AppRole.ADMIN]))).toBe(true);
      expect(adminGuard.canActivate(mockContext([AppRole.SUPER_ADMIN]))).toBe(true);
    });

    it('should reject PATIENT and PRACTITIONER roles in AdminGuard', () => {
      const mockContext = (userRoles: string[]) => ({
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              roles: userRoles,
            },
          }),
        }),
      } as any);

      expect(() => adminGuard.canActivate(mockContext(['PATIENT']))).toThrow(ForbiddenException);
      expect(() => adminGuard.canActivate(mockContext(['PRACTITIONER']))).toThrow(ForbiddenException);
    });
  });
});

import { MODULE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { PermissionResolverService } from '@common/guards/authorization/permission-resolver.service';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { ChatModule } from './chat.module';

describe('ChatModule', () => {
  it('declares the authorization providers required by admin chat routes', () => {
    const providers =
      Reflect.getMetadata(MODULE_METADATA.PROVIDERS, ChatModule) ?? [];
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, ChatModule) ?? [];

    expect(providers).toEqual(
      expect.arrayContaining([
        PermissionResolverService,
        PermissionsGuard,
      ]),
    );
    expect(imports.length).toBeGreaterThan(0);
  });

  it('resolves the permissions guard with its resolver dependency in a minimal module', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        Reflector,
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
      ],
    }).compile();

    expect(moduleRef.get(PermissionsGuard)).toBeInstanceOf(PermissionsGuard);
  });
});

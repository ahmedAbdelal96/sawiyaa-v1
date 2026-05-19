import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { PermissionResolverService } from '@common/guards/authorization/permission-resolver.service';

/**
 * Resolves and returns the effective permission keys for the current user.
 *
 * The resolved list is safe to expose to authenticated frontend clients.
 * It reflects role grants + user-level overrides, but does NOT expose raw override rows
 * or internal policy details.
 *
 * Frontend should use this as a read-only hint for navigation gating and UX.
 * Backend guards remain the authoritative enforcement layer for all mutations.
 */
@Injectable()
export class GetCurrentUserPermissionsUseCase {
  constructor(
    private readonly permissionResolverService: PermissionResolverService,
  ) {}

  async execute(authenticatedUser: AuthenticatedUser) {
    const permissions = await this.permissionResolverService.resolvePermissions(
      {
        userId: authenticatedUser.id,
        roles: authenticatedUser.roles,
      },
    );

    return {
      userId: authenticatedUser.id,
      permissions,
    };
  }
}

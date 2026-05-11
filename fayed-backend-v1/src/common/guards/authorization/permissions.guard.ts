import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '@common/constants/auth-metadata.constants';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { forbid, getAuthenticatedUser } from '@common/utils/auth-request.util';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditOutcome } from '@prisma/client';
import { PermissionResolverService } from './permission-resolver.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly permissionResolverService: PermissionResolverService,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<PermissionKey[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = getAuthenticatedUser(request);
    const isAllowed = await this.permissionResolverService.hasPermissions({
      userId: user.id,
      roles: user.roles,
      requiredPermissions,
    });

    if (!isAllowed) {
      this.logger.warn(
        `Permission denied for user ${user.id}: required=${requiredPermissions.join(',')}`,
      );
      this.securityAuditService.logAsync({
        action: 'security.permission.denied',
        outcome: SecurityAuditOutcome.DENIED,
        actorUserId: user.id,
        actorRoles: user.roles,
        ipAddress: this.extractIp(request),
        userAgent: request.headers?.['user-agent'] as string | undefined,
        reason: `Required permissions: ${requiredPermissions.join(', ')}`,
        metadata: {
          handler: context.getHandler().name,
          class: context.getClass().name,
        },
      });
      forbid(
        'You do not have the required permission for this route',
        'PERMISSION_REQUIRED',
      );
    }

    return true;
  }

  private extractIp(request: AuthenticatedRequest): string | undefined {
    const forwarded = request.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0]?.trim();
    }
    return (request.socket as { remoteAddress?: string } | undefined)
      ?.remoteAddress;
  }
}

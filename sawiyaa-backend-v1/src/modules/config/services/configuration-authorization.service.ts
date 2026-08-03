import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigCategory } from '@prisma/client';
import { ConfigDefinition } from '../registry/config-definition.types';
import {
  ConfigurationActor,
  ConfigurationActorType,
  ConfigurationWritePermission,
} from '../types/configuration-write.types';

export type ConfigurationWriteDomain =
  | 'operational'
  | 'financial'
  | 'security'
  | 'infrastructure';

@Injectable()
export class ConfigurationAuthorizationService {
  getWriteDomain(definition: ConfigDefinition): ConfigurationWriteDomain {
    if (definition.owner.startsWith('ENV_')) {
      return 'infrastructure';
    }

    if (definition.category === ConfigCategory.PAYMENT) {
      return 'financial';
    }

    if (definition.category === ConfigCategory.SECURITY) {
      return 'security';
    }

    return 'operational';
  }

  assertCanWrite(
    actor: ConfigurationActor,
    actorType: ConfigurationActorType,
    definition: ConfigDefinition,
  ): void {
    const domain = this.getWriteDomain(definition);

    if (domain === 'infrastructure') {
      throw new ForbiddenException({
        error: 'CONFIG_ENV_OWNED',
        message: 'Environment-owned configuration cannot be database-managed.',
      });
    }

    if (
      definition.sensitive &&
      !this.hasPermission(actor, 'configuration.edit.sensitive')
    ) {
      throw new ForbiddenException({
        error: 'CONFIG_SENSITIVE_AUTHORITY_REQUIRED',
        message: 'Sensitive configuration requires explicit authority.',
      });
    }

    if (actorType === 'SYSTEM' || actorType === 'DEPLOYMENT') {
      if (!this.hasPermission(actor, 'configuration.system.write')) {
        throw new ForbiddenException({
          error: 'CONFIG_SYSTEM_AUTHORITY_REQUIRED',
          message: 'System configuration writes require explicit authority.',
        });
      }
      return;
    }

    const permission = this.permissionForDomain(domain);
    if (!this.hasPermission(actor, permission)) {
      throw new ForbiddenException({
        error: 'CONFIG_WRITE_FORBIDDEN',
        message: `Configuration write requires ${permission}.`,
      });
    }
  }

  private permissionForDomain(
    domain: ConfigurationWriteDomain,
  ): ConfigurationWritePermission {
    switch (domain) {
      case 'financial':
        return 'configuration.edit.financial';
      case 'security':
        return 'configuration.edit.security';
      case 'operational':
        return 'configuration.edit.operational';
      case 'infrastructure':
        return 'configuration.edit.security';
    }
  }

  private hasPermission(
    actor: ConfigurationActor,
    permission: ConfigurationWritePermission,
  ): boolean {
    return actor.permissions?.includes(permission) === true;
  }
}

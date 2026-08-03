import { ConfigScopeType, Prisma } from '@prisma/client';
import { ConfigKey } from '../registry/config-key.constants';
import {
  BooleanConfigKey,
  JsonConfigKey,
  NumberConfigKey,
  StringConfigKey,
} from '../registry/config.registry';

export type ConfigurationActorType = 'USER' | 'SYSTEM' | 'DEPLOYMENT';

export type ConfigurationWritePermission =
  | 'configuration.edit.operational'
  | 'configuration.edit.financial'
  | 'configuration.edit.security'
  | 'configuration.edit.sensitive'
  | 'configuration.system.write';

export type ConfigurationActor = {
  readonly type: ConfigurationActorType;
  readonly id?: string | null;
  readonly permissions?: readonly ConfigurationWritePermission[];
};

type ConfigurationWriteValue =
  | string
  | number
  | boolean
  | readonly string[]
  | Prisma.JsonObject
  | Prisma.JsonArray;

type ConfigurationJsonValue =
  | readonly string[]
  | Prisma.JsonObject
  | Prisma.JsonArray;

type UpdateConfigurationCommandFor<T> = {
  readonly key: ConfigKey;
  readonly value: T;
  readonly scopeType: ConfigScopeType;
  readonly scopeRefId: string | null;
  readonly actor: ConfigurationActor;
  readonly actorType: ConfigurationActorType;
  readonly reason: string;
  readonly effectiveFrom?: Date | null;
  readonly effectiveTo?: Date | null;
  readonly expectedUpdatedAt?: Date | null;
};

export type UpdateConfigurationCommand =
  | (UpdateConfigurationCommandFor<boolean> & {
      readonly key: BooleanConfigKey;
    })
  | (UpdateConfigurationCommandFor<number> & { readonly key: NumberConfigKey })
  | (UpdateConfigurationCommandFor<string> & { readonly key: StringConfigKey })
  | (UpdateConfigurationCommandFor<ConfigurationJsonValue> & {
      readonly key: JsonConfigKey;
    });

export type ConfigurationWriteValueView = ConfigurationWriteValue | null;

export type ConfigurationWriteResult = {
  readonly key: ConfigKey;
  readonly scopeType: ConfigScopeType;
  readonly scopeRefId: string | null;
  readonly value: ConfigurationWriteValueView;
  readonly valueId: string;
  readonly previousValueId: string | null;
  readonly updatedAt: Date;
  readonly changeLogId: string;
};

export type ConfigurationCurrentVersion = {
  readonly valueId: string;
  readonly updatedAt: Date;
};

export type ResetConfigurationCommand = {
  readonly key: ConfigKey;
  readonly scopeType: ConfigScopeType;
  readonly scopeRefId: string | null;
  readonly actor: ConfigurationActor;
  readonly actorType: ConfigurationActorType;
  readonly reason: string;
  readonly expectedUpdatedAt?: Date | null;
};

export type ConfigurationResetResult = {
  readonly key: ConfigKey;
  readonly valueId: string | null;
  readonly updatedAt: Date | null;
  readonly changeLogId: string | null;
};

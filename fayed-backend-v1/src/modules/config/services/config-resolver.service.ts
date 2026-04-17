import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigDataType, Prisma } from '@prisma/client';
import {
  ResolveConfigOptions,
  ResolvedConfigValue,
} from '../types/config-scope.types';
import { ResolveConfigValueUseCase } from '../use-cases/resolve-config-value.use-case';
import {
  assertConfigValueType,
  assertJsonCompatibleConfigType,
  assertResolvedJsonValueMatchesDataType,
} from '../utils/config-value.util';

@Injectable()
export class ConfigResolverService {
  constructor(
    private readonly resolveConfigValueUseCase: ResolveConfigValueUseCase,
  ) {}

  resolveValue(
    key: string,
    options?: ResolveConfigOptions,
  ): Promise<ResolvedConfigValue> {
    return this.resolveConfigValueUseCase.execute(key, options);
  }

  resolveByScope(
    key: string,
    options?: ResolveConfigOptions,
  ): Promise<ResolvedConfigValue> {
    return this.resolveValue(key, options);
  }

  async getRequiredString(
    key: string,
    options?: ResolveConfigOptions,
  ): Promise<string> {
    const resolved = await this.resolveValue(key, options);
    assertConfigValueType(key, ConfigDataType.STRING, resolved.dataType);

    if (typeof resolved.value !== 'string' || resolved.value.length === 0) {
      throw new NotFoundException(
        `Required string config "${key}" does not have a value`,
      );
    }

    return resolved.value;
  }

  async getBoolean(
    key: string,
    options?: ResolveConfigOptions,
  ): Promise<boolean | null> {
    const resolved = await this.resolveValue(key, options);
    assertConfigValueType(key, ConfigDataType.BOOLEAN, resolved.dataType);

    if (resolved.value === null) {
      return null;
    }

    if (typeof resolved.value !== 'boolean') {
      throw new InternalServerErrorException(
        `Config "${key}" resolved to a non-boolean value`,
      );
    }

    return resolved.value;
  }

  async getNumber(
    key: string,
    options?: ResolveConfigOptions,
  ): Promise<number | null> {
    const resolved = await this.resolveValue(key, options);
    assertConfigValueType(key, ConfigDataType.NUMBER, resolved.dataType);

    if (resolved.value === null) {
      return null;
    }

    if (typeof resolved.value !== 'number') {
      throw new InternalServerErrorException(
        `Config "${key}" resolved to a non-number value`,
      );
    }

    return resolved.value;
  }

  async getJson<T = Prisma.JsonValue>(
    key: string,
    options?: ResolveConfigOptions,
  ): Promise<T | null> {
    const resolved = await this.resolveValue(key, options);
    assertJsonCompatibleConfigType(key, resolved.dataType);
    assertResolvedJsonValueMatchesDataType(key, resolved.dataType, resolved.value);

    return (resolved.value as T | null) ?? null;
  }
}

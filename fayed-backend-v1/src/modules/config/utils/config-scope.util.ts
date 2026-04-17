import { BadRequestException } from '@nestjs/common';
import { ConfigScopeType } from '@prisma/client';
import { ConfigScopeInput, ConfigScopeMatch } from '../types/config-scope.types';

function getScopeKey(scope: ConfigScopeMatch): string {
  return `${scope.scopeType}:${scope.scopeRefId ?? 'global'}`;
}

export function normalizeScopeChain(
  scopes: ConfigScopeInput[] = [],
): ConfigScopeMatch[] {
  const normalized: ConfigScopeMatch[] = [];
  const seen = new Set<string>();

  for (const scope of scopes) {
    if (!scope?.scopeType) {
      continue;
    }

    if (scope.scopeType === ConfigScopeType.GLOBAL) {
      const globalScope = {
        scopeType: ConfigScopeType.GLOBAL,
        scopeRefId: null,
      };
      const globalKey = getScopeKey(globalScope);
      if (!seen.has(globalKey)) {
        normalized.push(globalScope);
        seen.add(globalKey);
      }
      continue;
    }

    if (!scope.scopeRefId) {
      throw new BadRequestException(
        `scopeRefId is required for scope type ${scope.scopeType}`,
      );
    }

    const normalizedScope = {
      scopeType: scope.scopeType,
      scopeRefId: scope.scopeRefId,
    };
    const key = getScopeKey(normalizedScope);

    if (!seen.has(key)) {
      normalized.push(normalizedScope);
      seen.add(key);
    }
  }

  const globalScope = {
    scopeType: ConfigScopeType.GLOBAL,
    scopeRefId: null,
  };
  const globalKey = getScopeKey(globalScope);

  if (!seen.has(globalKey)) {
    normalized.push(globalScope);
  }

  return normalized;
}

export function isSameScope(
  left: ConfigScopeMatch,
  right: Pick<ConfigScopeMatch, 'scopeType' | 'scopeRefId'>,
): boolean {
  return (
    left.scopeType === right.scopeType &&
    (left.scopeRefId ?? null) === (right.scopeRefId ?? null)
  );
}

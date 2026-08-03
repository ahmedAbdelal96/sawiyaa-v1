export type GovernanceBoundary =
  | 'DIRECT_CONFIG_TABLE'
  | 'RAW_CONFIG_KEY'
  | 'DIRECT_PROCESS_ENV'
  | 'CONFIG_SERVICE_POLICY_READ';

export type GovernanceViolation = {
  readonly boundary: GovernanceBoundary;
  readonly file: string;
};

export type AllowlistCheck = {
  readonly missing: readonly string[];
  readonly stale: readonly string[];
  readonly duplicates: readonly string[];
};

export const CONFIG_BOUNDARY_ALLOWLIST = Object.freeze({
  DIRECT_CONFIG_TABLE: Object.freeze([
    'prisma/seed/modules/config.seed.ts',
    'src/modules/config/services/configuration-management.service.ts',
  ]),
  RAW_CONFIG_KEY: Object.freeze([
    'src/modules/config/registry/config.definitions.ts',
  ]),
  DIRECT_PROCESS_ENV: Object.freeze(['src/config/validation/env.schema.ts']),
  CONFIG_SERVICE_POLICY_READ: Object.freeze([
    'src/config/validation/env.schema.ts',
  ]),
});

export function findGovernanceViolations(
  file: string,
  source: string,
  canonicalKeys: readonly string[],
): readonly GovernanceViolation[] {
  const violations: GovernanceViolation[] = [];
  if (/\b(?:configKeyCatalog|configValue|configChangeLog)\b/.test(source)) {
    violations.push({ boundary: 'DIRECT_CONFIG_TABLE', file });
  }
  if (
    canonicalKeys.some((key) =>
      new RegExp(
        `(?:'|"|\`)${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:'|"|\`)`,
      ).test(source),
    )
  ) {
    violations.push({ boundary: 'RAW_CONFIG_KEY', file });
  }
  if (/\bprocess\.env\b/.test(source)) {
    violations.push({ boundary: 'DIRECT_PROCESS_ENV', file });
  }
  if (/\bConfigService\b/.test(source) && /\.get(?:OrThrow)?\(/.test(source)) {
    violations.push({ boundary: 'CONFIG_SERVICE_POLICY_READ', file });
  }
  return violations;
}

export function findDirectConfigWriteViolations(
  file: string,
  source: string,
): readonly GovernanceViolation[] {
  if (
    /\b(?:configKeyCatalog|configValue|configChangeLog)\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/.test(
      source,
    )
  ) {
    return [{ boundary: 'DIRECT_CONFIG_TABLE', file }];
  }

  return [];
}

export function checkGovernanceAllowlist(
  allowlist: Readonly<Record<GovernanceBoundary, readonly string[]>>,
  files: ReadonlySet<string>,
): AllowlistCheck {
  const missing: string[] = [];
  const stale: string[] = [];
  const duplicates: string[] = [];
  for (const paths of Object.values(allowlist)) {
    const seen = new Set<string>();
    for (const path of paths) {
      const normalized = path.replace(/\\/g, '/');
      if (seen.has(normalized)) duplicates.push(normalized);
      seen.add(normalized);
      if (normalized !== path) stale.push(path);
      if (!files.has(normalized)) missing.push(normalized);
    }
  }
  return { missing, stale, duplicates };
}

export function isAllowlistedGovernanceViolation(
  violation: GovernanceViolation,
): boolean {
  return CONFIG_BOUNDARY_ALLOWLIST[violation.boundary].includes(violation.file);
}

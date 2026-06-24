import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { RefundPolicyType } from '@prisma/client';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }

  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalize(value[key]);
        return acc;
      }, {});
  }

  return value;
}

@Injectable()
export class RefundPolicyHashService {
  compute(input: {
    policyType: RefundPolicyType;
    versionNumber: number;
    titleByLocaleJson: unknown;
    summaryByLocaleJson: unknown;
    localizedContentJson: unknown;
    clausesJson: unknown;
    rulesJson: unknown;
  }): string {
    const canonical = canonicalize({
      policyType: input.policyType,
      versionNumber: input.versionNumber,
      titleByLocaleJson: input.titleByLocaleJson,
      summaryByLocaleJson: input.summaryByLocaleJson,
      localizedContentJson: input.localizedContentJson,
      clausesJson: input.clausesJson,
      rulesJson: input.rulesJson,
    });

    const raw = JSON.stringify(canonical);
    return createHash('sha256').update(raw).digest('hex');
  }
}

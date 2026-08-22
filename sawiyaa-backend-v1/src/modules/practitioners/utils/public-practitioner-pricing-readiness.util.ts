import { Prisma } from '@prisma/client';

/**
 * Canonical publication pricing gate. Public exposure requires the standard
 * 30/60-minute prices in both supported currencies; it does not infer or
 * convert a missing currency.
 */
export function publicPractitionerPricingWhere(): Prisma.PractitionerProfileWhereInput {
  const positive = { not: null, gt: 0 };
  return {
    sessionPrice30Egp: positive,
    sessionPrice30Usd: positive,
    sessionPrice60Egp: positive,
    sessionPrice60Usd: positive,
  };
}

export function hasRequiredPractitionerPricing(input: {
  sessionPrice30Egp: unknown;
  sessionPrice30Usd: unknown;
  sessionPrice60Egp: unknown;
  sessionPrice60Usd: unknown;
}): boolean {
  return [input.sessionPrice30Egp, input.sessionPrice30Usd, input.sessionPrice60Egp, input.sessionPrice60Usd]
    .every((value) => value !== null && value !== undefined && Number(value) > 0);
}

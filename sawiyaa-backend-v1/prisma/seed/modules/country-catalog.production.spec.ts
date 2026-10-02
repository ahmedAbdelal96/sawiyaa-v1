import { ensureProductionCountryCatalog } from '../production-baseline.seed';
import {
  PRODUCTION_COUNTRY_CATALOG,
  REQUIRED_ARAB_COUNTRY_CODES,
  REQUIRED_MIDDLE_EAST_COUNTRY_CODES,
} from './country-catalog';

describe('production country catalog', () => {
  it('contains a complete ISO catalog and required Arab/Middle East coverage', () => {
    const codes = PRODUCTION_COUNTRY_CATALOG.map((country) => country.isoCode);
    expect(codes.length).toBeGreaterThanOrEqual(200);
    expect(new Set(codes).size).toBe(codes.length);
    expect(REQUIRED_ARAB_COUNTRY_CODES.every((code) => codes.includes(code))).toBe(true);
    expect(REQUIRED_MIDDLE_EAST_COUNTRY_CODES.every((code) => codes.includes(code))).toBe(true);
  });

  it('creates only missing rows, is idempotent, and preserves existing rows', async () => {
    const existing = new Set(['EG']);
    const create = jest.fn(async ({ data }: { data: { isoCode: string } }) => {
      existing.add(data.isoCode);
      return { id: data.isoCode };
    });
    const prisma = {
      country: {
        findUnique: jest.fn(async ({ where }: { where: { isoCode: string } }) =>
          existing.has(where.isoCode) ? { id: where.isoCode } : null),
        create,
      },
    } as never;

    const first = await ensureProductionCountryCatalog(prisma);
    const second = await ensureProductionCountryCatalog(prisma);

    expect(first.created).toBe(PRODUCTION_COUNTRY_CATALOG.length - 1);
    expect(first.preserved).toBe(1);
    expect(second).toEqual({ created: 0, preserved: PRODUCTION_COUNTRY_CATALOG.length });
    expect(create).toHaveBeenCalledTimes(PRODUCTION_COUNTRY_CATALOG.length - 1);
  });
});

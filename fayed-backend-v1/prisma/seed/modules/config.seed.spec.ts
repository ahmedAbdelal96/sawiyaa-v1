import { configSeedModule } from './config.seed';

describe('configSeedModule package keys', () => {
  it('seeds the standardized package feature keys', async () => {
    const upsert = jest.fn();
    const deleteMany = jest.fn().mockResolvedValue(undefined);
    const create = jest.fn().mockResolvedValue(undefined);

    const prisma = {
      configKeyCatalog: { upsert, findMany: jest.fn().mockResolvedValue([]) },
      configValue: { deleteMany, create },
    } as never;

    await configSeedModule.run(prisma);

    const keys = upsert.mock.calls.map((call: unknown[]) => {
      const entry = call[0] as { where: { key: string } };
      return entry.where.key;
    });

    expect(keys).toEqual(
      expect.arrayContaining(['packages.enabled', 'packages.purchaseEnabled']),
    );
  });
});

import { assertProductionDatabaseTarget } from '../../scripts/production-baseline.policy';

describe('production baseline operator policy', () => {
  const valid = {
    appEnv: 'production',
    databaseUrl: 'postgresql://app:secret@postgres:5432/sawiyaa',
    allowSeed: 'true',
  };

  it('requires explicit opt-in and a production-like environment', () => {
    expect(() => assertProductionDatabaseTarget({ ...valid, allowSeed: undefined })).toThrow('explicit operator run');
    expect(() => assertProductionDatabaseTarget({ ...valid, appEnv: 'development' })).toThrow('outside production or staging');
  });

  it('refuses local databases', () => {
    expect(() =>
      assertProductionDatabaseTarget({
        ...valid,
        databaseUrl: 'postgresql://app:secret@127.0.0.1:5432/sawiyaa',
      }),
    ).toThrow('local database');
  });
});

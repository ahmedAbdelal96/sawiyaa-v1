import {
  assertConfigBootstrapAllowed,
  isLocalDatabaseUrl,
} from '../../../prisma/scripts/config-bootstrap.policy';

describe('Config bootstrap policy', () => {
  it('allows an explicitly approved local development run only on localhost', () => {
    expect(
      assertConfigBootstrapAllowed({
        appEnv: 'development',
        databaseUrl: 'postgresql://postgres:password@localhost:5432/sawiyaa',
        allowBootstrap: 'true',
        allowDevelopment: 'true',
      }),
    ).toBe('development');
  });

  it('requires an explicit development override', () => {
    expect(() =>
      assertConfigBootstrapAllowed({
        appEnv: 'development',
        databaseUrl: 'postgresql://postgres:password@localhost:5432/sawiyaa',
        allowBootstrap: 'true',
        allowDevelopment: undefined,
      }),
    ).toThrow(/CONFIG_BOOTSTRAP_ALLOW_DEVELOPMENT/);
  });

  it('rejects production bootstrap against localhost', () => {
    expect(() =>
      assertConfigBootstrapAllowed({
        appEnv: 'production',
        databaseUrl: 'postgresql://postgres:password@localhost:5432/sawiyaa',
        allowBootstrap: 'true',
        allowDevelopment: undefined,
      }),
    ).toThrow(/local database/);
  });

  it('requires the explicit operator flag', () => {
    expect(() =>
      assertConfigBootstrapAllowed({
        appEnv: 'production',
        databaseUrl: 'postgresql://db.internal:5432/sawiyaa',
        allowBootstrap: undefined,
        allowDevelopment: undefined,
      }),
    ).toThrow(/ALLOW_CONFIG_BOOTSTRAP/);
  });

  it('recognizes only local database hosts as local', () => {
    expect(isLocalDatabaseUrl('postgresql://127.0.0.1:5432/sawiyaa')).toBe(
      true,
    );
    expect(isLocalDatabaseUrl('postgresql://db.internal:5432/sawiyaa')).toBe(
      false,
    );
  });
});

function isLocalDatabase(databaseUrl: string): boolean {
  try {
    const hostname = new URL(databaseUrl).hostname.toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.startsWith('127.');
  } catch {
    return false;
  }
}

export function assertProductionDatabaseTarget(input: {
  appEnv: string | undefined;
  databaseUrl: string | undefined;
  allowSeed: string | undefined;
  allowDisposableBootstrap?: string | undefined;
}): void {
  const appEnv = (input.appEnv ?? '').toLowerCase();
  if (appEnv !== 'production' && appEnv !== 'staging') {
    throw new Error('Refusing production baseline seed outside production or staging.');
  }
  if (input.allowSeed !== 'true') {
    throw new Error('Refusing production baseline seed. Set ALLOW_PRODUCTION_BASELINE_SEED=true for an explicit operator run.');
  }
  if (!input.databaseUrl) {
    throw new Error('Refusing production baseline seed: DATABASE_URL is required.');
  }
  const allowDisposableLocalRun =
    input.allowDisposableBootstrap === 'true' && appEnv === 'staging';
  if (isLocalDatabase(input.databaseUrl) && !allowDisposableLocalRun) {
    throw new Error('Refusing production baseline seed against a local database.');
  }
}

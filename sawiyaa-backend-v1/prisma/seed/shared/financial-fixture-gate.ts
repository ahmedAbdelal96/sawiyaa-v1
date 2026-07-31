/** Financial fixture seeds are opt-in and are never allowed in production. */
export function assertFinancialFixtureSeedAllowed(seedName: string): void {
  const environment = (process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development').trim().toLowerCase();
  if (environment === 'production') {
    throw new Error(`[seed:${seedName}] Financial fixture seeds are blocked in production.`);
  }
  if (process.env.ALLOW_FINANCIAL_FIXTURE_SEED !== 'true') {
    throw new Error(`[seed:${seedName}] Financial fixture seed is opt-in. Set ALLOW_FINANCIAL_FIXTURE_SEED=true in a non-production environment.`);
  }
}

export function assertQaFinanceSeedAllowed(seedName: string, argv = process.argv): void {
  const environment = (process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development').trim().toLowerCase();
  const databaseUrl = (process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '').trim().toLowerCase();
  const productionMarkers = ['prod', 'production', 'live'];

  if (environment === 'production' || productionMarkers.some((marker) => databaseUrl.includes(marker))) {
    throw new Error(`[seed:${seedName}] QA finance seed is blocked for production-like environments or database URLs.`);
  }
  if (process.env.QA_FINANCE_SEED_ENABLED !== 'true') {
    throw new Error(`[seed:${seedName}] Set QA_FINANCE_SEED_ENABLED=true in a non-production environment.`);
  }
  const confirmed = argv.includes('--confirm') || process.env.QA_FINANCE_SEED_CONFIRM === 'I_UNDERSTAND_QA_FINANCE_DATA';
  if (!confirmed) {
    throw new Error(`[seed:${seedName}] Explicit confirmation is required. Use --confirm or QA_FINANCE_SEED_CONFIRM=I_UNDERSTAND_QA_FINANCE_DATA.`);
  }
}

/**
 * Old seeds write practitioner financial projections directly. They are kept
 * for historical reference only and must not be executable anymore.
 */
export function assertLegacyFinancialFixtureSeedDisabled(seedName: string): void {
  throw new Error(
    `[seed:${seedName}] Legacy financial fixture seed is disabled. Use the canonical application-flow QA fixture instead.`,
  );
}

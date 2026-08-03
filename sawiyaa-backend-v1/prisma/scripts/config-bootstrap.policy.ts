export type ConfigBootstrapEnvironment =
  | 'development'
  | 'test'
  | 'staging'
  | 'production';

type ConfigBootstrapPolicyInput = {
  readonly appEnv: string | undefined;
  readonly databaseUrl: string | undefined;
  readonly allowBootstrap: string | undefined;
  readonly allowDevelopment: string | undefined;
};

export function isLocalDatabaseUrl(value: string | undefined): boolean {
  if (!value) return true;
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]' ||
      hostname.startsWith('127.')
    );
  } catch {
    return true;
  }
}

export function assertConfigBootstrapAllowed(
  input: ConfigBootstrapPolicyInput,
): ConfigBootstrapEnvironment {
  const appEnv = (input.appEnv ?? 'development') as ConfigBootstrapEnvironment;
  if (!['development', 'test', 'staging', 'production'].includes(appEnv)) {
    throw new Error(`Unsupported APP_ENV for Config bootstrap: ${appEnv}`);
  }
  if (input.allowBootstrap !== 'true') {
    throw new Error(
      'Refusing Config bootstrap. Set ALLOW_CONFIG_BOOTSTRAP=true for an explicit operator run.',
    );
  }
  if (!input.databaseUrl) {
    throw new Error('Refusing Config bootstrap: DATABASE_URL is required.');
  }

  if (appEnv === 'development' || appEnv === 'test') {
    if (input.allowDevelopment !== 'true') {
      throw new Error(
        'Refusing non-production Config bootstrap. Set CONFIG_BOOTSTRAP_ALLOW_DEVELOPMENT=true for a local/test run.',
      );
    }
    if (!isLocalDatabaseUrl(input.databaseUrl)) {
      throw new Error(
        'Refusing development/test Config bootstrap against a non-local database.',
      );
    }
    return appEnv;
  }

  if (isLocalDatabaseUrl(input.databaseUrl)) {
    throw new Error(
      `Refusing ${appEnv} Config bootstrap against a local database.`,
    );
  }
  return appEnv;
}

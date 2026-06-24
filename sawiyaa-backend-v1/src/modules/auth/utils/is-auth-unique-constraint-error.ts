const AUTH_UNIQUE_CONSTRAINT_NAMES = [
  'UserEmail_email_lower_unique_idx',
  'AuthIdentity_user_password_unique_idx',
] as const;

export function isAuthUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const knownError = error as {
    code?: string;
    message?: string;
    meta?: { target?: unknown };
  };

  if (knownError.code === 'P2002' || knownError.code === '23505') {
    return true;
  }

  const message = knownError.message ?? '';
  if (
    AUTH_UNIQUE_CONSTRAINT_NAMES.some((constraintName) =>
      message.includes(constraintName),
    )
  ) {
    return true;
  }

  const target = knownError.meta?.target;
  if (typeof target === 'string') {
    return AUTH_UNIQUE_CONSTRAINT_NAMES.includes(
      target as (typeof AUTH_UNIQUE_CONSTRAINT_NAMES)[number],
    );
  }

  if (Array.isArray(target)) {
    return target.some(
      (item) =>
        typeof item === 'string' &&
        AUTH_UNIQUE_CONSTRAINT_NAMES.includes(
          item as (typeof AUTH_UNIQUE_CONSTRAINT_NAMES)[number],
        ),
    );
  }

  return false;
}

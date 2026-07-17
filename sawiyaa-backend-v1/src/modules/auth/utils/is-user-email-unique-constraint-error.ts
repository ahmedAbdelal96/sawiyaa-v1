/**
 * Identifies only unique violations caused by the UserEmail email identity.
 * Other auth uniqueness errors must not be presented as duplicate email.
 */
export function isUserEmailUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const knownError = error as {
    code?: string;
    message?: string;
    meta?: { target?: unknown };
  };

  if (knownError.code !== 'P2002' && knownError.code !== '23505') {
    return false;
  }

  const message = knownError.message ?? '';
  if (
    message.includes('UserEmail_email_lower_unique_idx') ||
    message.includes('UserEmail_email_key')
  ) {
    return true;
  }

  const target = knownError.meta?.target;
  if (target === 'email') {
    return true;
  }

  return Array.isArray(target) && target.length === 1 && target[0] === 'email';
}

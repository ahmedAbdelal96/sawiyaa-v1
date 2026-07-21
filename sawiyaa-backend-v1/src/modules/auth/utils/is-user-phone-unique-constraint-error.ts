import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export function isUserPhoneUniqueConstraintError(error: unknown): boolean {
  if (!(error instanceof PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }

  const target = error.meta?.target;
  return Array.isArray(target)
    ? target.includes('phone')
    : typeof target === 'string' && target.includes('UserPhone');
}

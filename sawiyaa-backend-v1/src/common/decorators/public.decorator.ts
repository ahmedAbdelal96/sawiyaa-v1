import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../constants/auth-metadata.constants';

/**
 * Marks routes that must bypass authentication guards.
 * Use sparingly for login, health, public catalog endpoints, and webhooks that use another verification flow.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

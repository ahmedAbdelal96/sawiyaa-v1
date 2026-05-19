import { Request } from 'express';
import { AuthenticatedUser } from './authenticated-user.interface';
import { SupportedLocale } from '../i18n/types/locale.types';

/**
 * Shared request contract for guards and current-user helpers.
 * Extra ownership/resource fields are optional because some routes resolve them earlier in the pipeline.
 */
export interface AuthenticatedRequest extends Request {
  requestId?: string;
  rawBody?: Buffer;
  user?: AuthenticatedUser;
  authToken?: string;
  authTokenType?: 'access' | 'refresh';
  authTransport?: 'bearer' | 'cookie' | 'body';
  locale?: SupportedLocale;
  resourceOwnerId?: string;
  practitionerApplicationOwnerId?: string;
}

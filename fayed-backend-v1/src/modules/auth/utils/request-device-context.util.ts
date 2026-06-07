import { Request } from 'express';
import { AuthSessionDeviceContext } from '../types/auth-session.types';
import { resolveCountryFromRequest } from './request-country-context.util';

/**
 * Controllers stay thin by delegating audit/session context extraction to this helper.
 */
export function getRequestDeviceContext(
  request: Request,
  deviceId?: string,
): AuthSessionDeviceContext {
  const { countryCode, source } = resolveCountryFromRequest(request);
  return {
    deviceId: deviceId ?? null,
    ipAddress: request.ip ?? null,
    userAgent: request.headers['user-agent'] ?? null,
    countryCode,
    countryCodeSource: source,
  };
}

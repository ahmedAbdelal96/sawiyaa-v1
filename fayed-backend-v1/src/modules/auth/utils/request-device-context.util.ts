import { Request } from 'express';
import { AuthSessionDeviceContext } from '../types/auth-session.types';

/**
 * Controllers stay thin by delegating audit/session context extraction to this helper.
 */
export function getRequestDeviceContext(
  request: Request,
  deviceId?: string,
): AuthSessionDeviceContext {
  return {
    deviceId: deviceId ?? null,
    ipAddress: request.ip ?? null,
    userAgent: request.headers['user-agent'] ?? null,
  };
}

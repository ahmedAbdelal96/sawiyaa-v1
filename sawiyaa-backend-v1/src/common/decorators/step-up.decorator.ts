import { SetMetadata } from '@nestjs/common';

export const STEP_UP_POLICY_KEY = 'auth:step-up-policy';

/**
 * Marks a route as requiring elevated verification before the action should be
 * allowed in production. The verification flow itself is intentionally
 * separate so we can adopt step-up policy metadata without risking a broad
 * business-logic rewrite.
 */
export const RequireStepUp = (action: string) =>
  SetMetadata(STEP_UP_POLICY_KEY, action);

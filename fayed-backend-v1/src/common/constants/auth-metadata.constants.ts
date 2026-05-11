/**
 * Central metadata keys used by guards and decorators.
 * Keeping them in one file avoids string duplication across the access-control layer.
 */
export const IS_PUBLIC_KEY = 'auth:isPublic';
export const ROLES_KEY = 'auth:roles';
export const PERMISSIONS_KEY = 'auth:permissions';
export const ACCOUNT_STATE_REQUIREMENTS_KEY = 'auth:account-state-requirements';
export const FEATURE_FLAGS_KEY = 'auth:feature-flags';
export const THROTTLE_POLICY_KEY = 'auth:throttle-policy';
export const RESOURCE_OWNER_OPTIONS_KEY = 'auth:resource-owner-options';
export const PRACTITIONER_APPLICATION_OWNER_OPTIONS_KEY =
  'auth:practitioner-application-owner-options';

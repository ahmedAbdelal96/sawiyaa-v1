/**
 * Resource ownership checks stay generic on purpose.
 * The same guard can compare the current user with a route param or with a value attached to the request.
 */
export interface ResourceOwnerOptions {
  paramKey?: string;
  requestOwnerField?: 'resourceOwnerId';
  allowAdminOverride?: boolean;
}

/**
 * Practitioner application ownership is separate because it usually maps to practitioner workflow routes.
 */
export interface PractitionerApplicationOwnerOptions {
  paramKey?: string;
  requestOwnerField?: 'practitionerApplicationOwnerId';
  allowAdminOverride?: boolean;
}

import { SetMetadata } from '@nestjs/common';
import {
  PRACTITIONER_APPLICATION_OWNER_OPTIONS_KEY,
  RESOURCE_OWNER_OPTIONS_KEY,
} from '../constants/auth-metadata.constants';
import {
  PractitionerApplicationOwnerOptions,
  ResourceOwnerOptions,
} from '../interfaces/resource-owner-options.interface';

/**
 * Use when a route should only be accessible by the owner of a resource.
 * The guard later compares request.user with either a route param or a request-attached owner id.
 */
export const ResourceOwner = (options: ResourceOwnerOptions = {}) =>
  SetMetadata(RESOURCE_OWNER_OPTIONS_KEY, options);

/**
 * Practitioner application ownership is split out because application routes often use a different owner field.
 */
export const PractitionerApplicationOwner = (
  options: PractitionerApplicationOwnerOptions = {},
) => SetMetadata(PRACTITIONER_APPLICATION_OWNER_OPTIONS_KEY, options);

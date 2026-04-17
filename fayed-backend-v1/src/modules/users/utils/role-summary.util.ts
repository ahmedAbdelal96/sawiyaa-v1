import { AppRole } from '@common/enums/app-role.enum';
import { CurrentUserRoleSummaryReadModel } from '../types/current-user-read.types';

/**
 * Frontend screens usually need quick booleans in addition to the raw role array.
 * Keeping that transformation in one helper keeps response shaping consistent across endpoints.
 */
export function buildRoleSummary(
  roles: AppRole[],
): CurrentUserRoleSummaryReadModel {
  return {
    roles,
    hasPatientRole: roles.includes(AppRole.PATIENT),
    hasPractitionerRole: roles.includes(AppRole.PRACTITIONER),
    hasAdminRole: roles.includes(AppRole.ADMIN),
    hasSupportAgentRole: roles.includes(AppRole.SUPPORT_AGENT),
    hasContentReviewerRole: roles.includes(AppRole.CONTENT_REVIEWER),
  };
}

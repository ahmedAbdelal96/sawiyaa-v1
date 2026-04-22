export const enModerationCatalog = {
  errors: {
    reporterRoleNotAllowed:
      'Reporter role is not allowed to submit moderation reports',
    unsupportedTargetType: 'Moderation target type is not supported',
    targetNotFoundOrNotAccessible:
      'Moderation target was not found or is not accessible',
    duplicateRecentReport:
      'A similar moderation report was already submitted recently',
    caseNotFound: 'Moderation case was not found',
    actionNotAllowedForRole:
      'Current actor role is not allowed to execute this moderation action',
    invalidActionTargetCombination:
      'Moderation action is not valid for the selected target type',
    actionReasonRequired: 'This moderation action requires an explicit reason',
    invalidCaseTransition:
      'Moderation action is not valid for current case status',
    caseTransitionRaceCondition:
      'Moderation case changed before action was applied. Retry with latest state.',
    enforcementTargetReferenceNotFound:
      'Moderation enforcement target reference was not found',
  },
};

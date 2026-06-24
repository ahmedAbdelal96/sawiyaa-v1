export const enRefundPoliciesCatalog = {
  errors: {
    policyFamilyNotFound: 'Refund policy family was not found',
    activePolicyNotFound: 'Active refund policy was not found',
    versionNotFound: 'Refund policy version was not found',
    cannotArchiveActiveVersion:
      'An active refund policy version cannot be archived directly',
    acceptanceRequired:
      'You must accept the active refund policy before payment',
    acceptanceWrongPolicyType:
      'The accepted refund policy type does not match the payment type',
    acceptanceStale: 'The accepted refund policy version is no longer current',
    draftOnly: 'Only draft refund policy versions can be edited',
    titleRequired: 'Refund policy title is required',
    summaryRequired: 'Refund policy summary is required',
    localizedContentRequired: 'Localized refund policy content is required',
    clausesRequired: 'Refund policy clauses are required',
    rulesRequired: 'Refund policy rules are required',
    invalidLocalizedValue:
      'Localized refund policy values must be non-empty strings',
    invalidJsonObject: 'Refund policy content must be a JSON object',
    invalidClause: 'Refund policy clause is invalid',
    invalidRule: 'Refund policy rule is invalid',
    invalidRefundPercent:
      'Refund policy refund percent must be between 0 and 100',
  },
};

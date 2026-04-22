export const enFinancialOperationsCatalog = {
  errors: {
    paymentNotFound: 'Payment was not found.',
    paymentNotCaptured: 'Only captured payments can be posted to ledger.',
    paymentSnapshotsIncomplete:
      'Payment financial snapshots are incomplete for ledger posting.',
    practitionerNotFound: 'Practitioner profile was not found.',
    settlementItemNotFound: 'Practitioner settlement was not found.',
    settlementPayoutNotFound: 'Practitioner payout was not found.',
    payoutProofNotFound: 'Payout proof was not found.',
    settlementBatchExists:
      'A settlement batch already exists for the requested period and currency.',
    settlementBatchNotFound: 'Settlement batch was not found.',
    invalidSettlementState:
      'The settlement batch is in an invalid state for this action.',
    settlementPayoutAlreadyRecorded:
      'A payout record already exists for this settlement.',
    invalidSettlementPayoutState:
      'The settlement is in an invalid state for payout recording.',
    invalidPayoutAmount: 'Paid amount is invalid.',
    payoutAmountExceedsDue: 'Paid amount exceeds the remaining due.',
    partialPayoutNotSupported:
      'Partial payout is not supported in this payout flow.',
    payoutProofFileRequired: 'A payout proof file is required.',
    payoutProofInvalidType:
      'Only JPG, PNG, WEBP, or PDF proof files are allowed.',
    payoutProofFileTooLarge: 'Payout proof file is too large.',
    invalidFilter: 'One or more finance operation filters are invalid.',
    forbiddenScope:
      'You are not allowed to access this finance operation scope.',
    resourceNotFoundInScope:
      'Finance operation resource was not found in your allowed scope.',
  },
} as const;

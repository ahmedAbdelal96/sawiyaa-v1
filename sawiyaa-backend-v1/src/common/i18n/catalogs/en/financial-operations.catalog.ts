export const enFinancialOperationsCatalog = {
  errors: {
    paymentNotFound: 'Payment was not found.',
    paymentNotCaptured: 'Only captured payments can be posted to ledger.',
    paymentSnapshotsIncomplete:
      'This wallet refund cannot be executed because the payment data saved for this Session is incomplete. Review the payment details before confirming the decision.',
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
    payoutOverrideReasonRequired:
      'A reason is required when the actual transfer differs materially from the calculated amount.',
    exchangeRateRequired: 'An exchange rate is required for a cross-currency payout.',
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
    // Wallet
    practitionerWalletNotFound: 'Practitioner wallet was not found.',
    practitionerWalletRequired:
      'A practitioner wallet is required to complete this operation.',
    practitionerWalletCurrencyUnresolved:
      'Could not resolve the practitioner wallet currency.',
    walletCurrencyChangeRequiresSettlement:
      'Wallet currency cannot be changed while there are pending settlement balances.',
    // Settlement
    invalidSettlementAmount: 'Settlement amount is invalid.',
    settlementAlreadyClosed: 'The settlement batch is already closed.',
    approvedSettlementImmutable: 'An approved settlement item cannot be modified.',
    legacySettlementAssignmentDisabled:
      'Legacy settlement assignment is disabled.',
    // Ledger
    practitionerEarningRequiresSettlement:
      'Practitioner earning requires an associated settlement.',
    practitionerEarningRequiresAudit:
      'Practitioner earning requires an associated audit record.',
    unbalancedJournalEntry:
      'Journal entry is unbalanced — debit total must equal credit total.',
    currencyRequired: 'A currency is required to complete this operation.',
    // Payout flows
    legacyPayoutPathBlocked:
      'The legacy payout path is blocked. Please use the new settlement payout flow.',
    payoutAmountInvalid: 'Payout amount is invalid.',
    payoutSettlementRequired:
      'A settlement item must be specified to complete the payout.',
    payoutSettlementInvalid: 'The specified settlement item is invalid.',
    payoutAmountExceedsSettlement:
      'The requested payout amount exceeds the settlement item value.',
    manualPayoutAlreadyRecorded:
      'A manual payout has already been recorded for this settlement.',
    // Package settlement
    packageSettlementCurrencyMissing: 'Currency is missing on the package settlement.',
    packageSettlementNotFound: 'Package settlement was not found.',
    packageSettlementNotReady: 'Package settlement is not yet ready for this action.',
    packageSettlementEmpty: 'Package settlement contains no items.',
    packageSettlementInvalidAmount: 'Package settlement amount is invalid.',
    packageSettlementSnapshotMissing:
      'Required package settlement snapshot is missing.',
    // Session earning reviews
    sessionEarningReviewFinalAmountsRequired:
      'Final amounts are required for the session earning review.',
    sessionEarningReviewReasonRequired:
      'A reason is required for the session earning review.',
    // Recovery
    recoveryAlreadyResolved: 'The recovery request has already been resolved.',
    recoveryAmountInvalid: 'Recovery amount is invalid.',
    recoveryAmountExceedsRemaining:
      'Recovery amount exceeds the remaining balance.',
    recoveryReasonRequired: 'A reason is required for the recovery.',
  },
} as const;

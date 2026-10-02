# Admin Resolution Control and Impact Preview (Phase C)

The authority model is deliberately split:

```text
System    -> trusted attendance facts and recommendation
Admin     -> finding, patient remedy, practitioner eligibility, replacement
Backend   -> deterministic preview and one locked transactional execution
Accountant-> final practitioner amount, adjustments, FX and approval
```

`POST /admin/sessions/:id/resolution/preview` is side-effect free and uses the same
`AdminSessionResolutionPolicyService` decision normalization used by execution.
The command route revalidates the plan under the session advisory/row lock before
writing lifecycle, wallet/ledger, entitlement, earning-review and replacement data.

Package wallet credits use the immutable package purchase snapshots and
`CalculatePackageSessionAllocationService` (the actual discounted patient-payable
allocation for the session). List price and `purchase total / session count` are
never used as a fallback. Missing allocation data fails closed.

The persisted `SessionResolution.findingCode` keeps human findings independent from
the canonical Session lifecycle status; `customReasonNote` is required for `OTHER`.

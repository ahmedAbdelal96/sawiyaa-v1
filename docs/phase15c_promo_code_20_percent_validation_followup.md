# Phase 15C Follow-up - Promo Code 20% Validation Smoke

## Executive Verdict
Pass. The practitioner promo-code frontend now has a clean, testable >20% validation path, and the invalid 25% case is explicitly blocked in the UI.

## Code Changes
Yes. Frontend-only changes were made to improve deterministic QA coverage:
- Added `data-testid` to the practitioner promo-code create button.
- Added `data-testid` to the promo code input.
- Added `data-testid` to the discount input.
- Added `data-testid` to the submit button.
- Added `data-testid` to the validation message.
- Kept visual design unchanged.

## Manual / Browser QA
Environment:
- Local frontend: `http://localhost:3000/ar`
- Practitioner QA account: `dr.mohamed@hesba.local`

Invalid 25% case:
- Opened `/ar/practitioner/promo-codes`.
- Opened create modal.
- Entered code: `QA25`
- Entered discount: `25`
- Validation message appeared immediately in Arabic:
  - `أكواد خصم المعالج لا يمكن أن تتجاوز 20%.`
- Submit button remained disabled for the invalid case.
- `QA25` was not created.
- Post-check list count for `QA25`: `0`

Valid 15% case:
- Opened create modal.
- Entered code: `QA15`
- Entered discount: `15`
- Creation succeeded.
- `QA15` was created successfully in the list.

## Screenshot / Artifact
- Invalid 25% path screenshot: [qa25-invalid.png](D:/Web/full-projects/fayed/artifacts/phase15c/20pct-followup/qa25-invalid.png)

## Verification Results
Passed:
- `npm audit --audit-level=moderate`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

Lint result:
- Passed with existing repository warnings only.

## Final Answers
- Is the >20% validation caveat closed? `yes`
- Can Phase 15C now be considered complete? `yes`

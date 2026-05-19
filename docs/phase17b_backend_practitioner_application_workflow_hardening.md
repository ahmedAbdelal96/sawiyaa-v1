# Phase 17B — Backend Practitioner Application Workflow Hardening

## Executive Verdict
Backend practitioner application workflow hardening is implemented and ready to support the next UX phase.

## What Was Implemented
- Added a backend `PractitionerApplicationCompletionService` that returns a step-based completion checklist with blockers, warnings, and per-step progress.
- Exposed completion data through practitioner readiness and application status responses.
- Exposed completion data in the admin application detail response so the admin review UX can show decision support instead of a flat data dump.
- Hardened submit eligibility so approved and archived applications cannot be resubmitted.
- Added practitioner-side audit events for draft/profile updates, specialty updates, credential uploads, and application submission.
- Kept admin approve/reject/request-changes guardrails in place and preserved existing decision permissions and step-up behavior.

## Completion Checklist Contract
The backend now returns a structured checklist with:
- `overallPercent`
- `canSubmit`
- `blockers`
- `warnings`
- `steps`

Step keys:
- `basicProfile`
- `professionalDetails`
- `pricing`
- `qualifications`
- `documents`
- `payoutDetails`
- `reviewSubmit`

Issue shape:
- `code`
- `field`
- `stepKey`
- `severity`
- `requirementScope`
- `messageKey`
- `metadata`

Severity values:
- `BLOCKER`
- `WARNING`
- `INFO`

Requirement scopes:
- `SUBMISSION`
- `APPROVAL`
- `OPTIONAL`

## Required / Optional Rules Enforced or Exposed
Implemented in the checklist:
- Basic profile blockers for missing display name and country.
- Professional details blockers for title, bio, years of experience, languages, specialties, and primary specialty category.
- Pricing surfaced as warnings when session prices are missing.
- Qualifications require at least one credential before submission.
- Documents require approved credentials before approval.
- Payout details require method and account-holder data, with conditional method-specific fields.
- Review-submit step checks account active state and application lock state.

Behavior note:
- Practitioner OTP verification remains part of the practitioner readiness gate.
- For admin application detail rendering, OTP is treated as unknown rather than being invented from non-persisted data.

## Draft / Save / Submit Behavior
- Practitioners can continue using existing draft-style profile/application updates.
- `GET /practitioners/me/application` and `GET /practitioners/me/readiness` now include the checklist.
- Submit is blocked when the latest application is already `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, or `ARCHIVED`.
- `CHANGES_REQUESTED` and `REJECTED` applications remain resubmittable when readiness passes.

## Admin Review Guardrails
- Existing admin approve/reject/request-changes guardrails remain intact.
- Approval still depends on review policy and transition state.
- Reject and request-changes still require explicit reasons.
- Terminal states cannot be transitioned incorrectly.
- Step-up behavior remains unchanged for sensitive admin actions.

## Requested Changes Behavior
- The workflow still supports the existing `CHANGES_REQUESTED` status and practitioner resubmission path.
- Structured request-change codes were not added because that would require a schema change or a broader storage decision.
- Review notes and decision reasons remain the persisted source of truth for now.

## Audit Events Added or Confirmed
Added practitioner-side security audit events for:
- draft/profile updates
- specialty updates
- credential uploads
- application submission

Already present on the admin side and preserved:
- approve
- reject
- request changes

Audit metadata is safe and limited to IDs, changed field names, and other non-sensitive summary data.

## Files Changed
- `src/modules/practitioners/services/practitioner-application-completion.service.ts`
- `src/modules/practitioners/services/practitioner-application-completion.service.spec.ts`
- `src/modules/practitioners/use-cases/get-practitioner-profile-readiness.use-case.ts`
- `src/modules/practitioners/use-cases/submit-practitioner-application.use-case.ts`
- `src/modules/practitioners/use-cases/submit-practitioner-application.use-case.spec.ts`
- `src/modules/practitioners/policies/practitioner-application-eligibility.policy.ts`
- `src/modules/practitioners/policies/practitioner-application-eligibility.policy.spec.ts`
- `src/modules/practitioners/controllers/practitioner-profile.controller.ts`
- `src/modules/admin/practitioner-applications/use-cases/get-practitioner-application-details.use-case.ts`
- supporting response/type/mapping files under `src/modules/practitioners/**` and `src/modules/admin/practitioner-applications/**`

## Tests Added / Updated
Added tests for:
- completion checklist behavior
- conditional payout requirements
- submit eligibility for approved and archived applications
- resubmission when changes were requested
- submit blocking when already approved

Test result:
- `3` suites passed
- `7` tests passed

## Verification Results
Passed:
- `npm audit --audit-level=moderate`
- `npm run build`
- `npx prisma validate`
- `npx prisma migrate status`
- targeted Jest suites for the new workflow hardening
- targeted ESLint for the changed implementation files

Notes:
- Full-repo `npx tsc --noEmit` still fails because of unrelated legacy type errors in other modules outside this phase.
- No migrations were required.

## Remaining Gaps
- Structured requested-change codes are still not persisted; the workflow continues to rely on review notes / decision reasons.
- The broader repository still has unrelated type-check and lint debt outside this phase.

## Product Decisions Still Needed
- Whether structured requested-change codes should be added later via a schema change.
- Whether OTP should remain part of the practitioner-facing readiness checklist copy or be de-emphasized in the UI.

## Final Answers
- Is backend ready to support practitioner wizard UI? yes
- Is backend ready to support admin decision-oriented review UI? yes
- Were migrations needed? no
- Did we change business approval rules? no
- Can practitioner save draft and resume? yes
- Can backend expose step completion/checklist? yes
- Are admin approve/reject/request-changes guardrails enforced? yes

# Phase 17C - Practitioner Application Wizard UI

## Executive Verdict
Pass. The practitioner application page now uses a guided wizard/stepper instead of the old giant all-at-once form, and it is driven by the backend completion checklist from Phase 17B.

## What Was Implemented
- Replaced the practitioner application workspace with a wizard-style experience.
- Added a clear stepper for:
  - Basic Profile
  - Professional Details
  - Pricing
  - Qualifications
  - Documents
  - Payout Details
  - Review & Submit
- Integrated backend completion data for:
  - overall completion percent
  - canSubmit state
  - blockers
  - warnings
  - per-step issues
- Preserved draft save, step navigation, and backend-gated submit behavior.
- Added readable issue copy for the backend completion message keys.
- Added Arabic and English wizard copy for step titles, guidance, lock states, and completion statuses.
- Kept the existing credential and specialties editors embedded inside the wizard instead of exposing a long form dump.

## Route Changed
- [src/app/[locale]/(practitioner)/practitioner/application/page.tsx](D:/Web/full-projects/fayed/fayed-frontend-v1/src/app/[locale]/(practitioner)/practitioner/application/page.tsx)

## Wizard Structure
- Header:
  - Arabic: `إكمال طلب الانضمام`
  - English: `Complete your application`
- Subtitle:
  - Arabic: `أكمل بياناتك خطوة بخطوة، ويمكنك الحفظ والعودة لاحقًا قبل الإرسال.`
  - English: `Complete your information step by step. You can save and return later before submitting.`
- Progress area:
  - completion percent
  - application status badge
  - canSubmit badge
  - last saved timestamp
- Step content:
  - only the current step is shown
  - blockers and warnings are shown per step
  - review step groups issues by step
- Locked states:
  - `SUBMITTED` and `UNDER_REVIEW` render read-only guidance
  - `APPROVED` shows a success state and dashboard/profile links
  - `CHANGES_REQUESTED` shows the admin note and keeps the flow editable
  - `REJECTED` shows the rejection note and allows resubmission if backend readiness allows it

## Completion Checklist Integration
- Source of truth:
  - `GET /practitioners/me/application`
  - `GET /practitioners/me/readiness`
- Checklist fields used:
  - `overallPercent`
  - `canSubmit`
  - `blockers`
  - `warnings`
  - `steps`
- Step keys mapped:
  - `basicProfile`
  - `professionalDetails`
  - `pricing`
  - `qualifications`
  - `documents`
  - `payoutDetails`
  - `reviewSubmit`
- The wizard now renders the backend issue/message keys into human-friendly copy instead of raw technical strings only.

## Draft / Save Behavior
- Draft updates still work through the existing profile update path.
- The wizard saves step-level edits and preserves them when the user moves between steps.
- The wizard does not auto-submit when the user reaches the final step.
- Submit remains backend-gated through the checklist `canSubmit` state.

## Locked State Behavior
- `SUBMITTED` and `UNDER_REVIEW` are read-only.
- `APPROVED` shows a success message and routes back to the practitioner dashboard/profile.
- `CHANGES_REQUESTED` keeps the application editable and shows the review note.
- `REJECTED` shows the rejection note and retains the resubmission path when allowed by backend readiness.

## Changes Requested / Rejected / Approved Behavior
- `CHANGES_REQUESTED`:
  - admin note is shown prominently
  - practitioner can revise the application
- `REJECTED`:
  - rejection note is shown
  - resubmit remains backend-controlled
- `APPROVED`:
  - the application is locked for editing
  - the practitioner is directed to the dashboard/profile flow

## Files Changed
- [src/features/practitioners/components/PractitionerApplicationWizard.tsx](D:/Web/full-projects/fayed/fayed-frontend-v1/src/features/practitioners/components/PractitionerApplicationWizard.tsx)
- [src/features/practitioners/components/PractitionerOnboardingWorkspace.tsx](D:/Web/full-projects/fayed/fayed-frontend-v1/src/features/practitioners/components/PractitionerOnboardingWorkspace.tsx)
- [src/features/practitioners/components/practitioner-application-issue-copy.ts](D:/Web/full-projects/fayed/fayed-frontend-v1/src/features/practitioners/components/practitioner-application-issue-copy.ts)
- [src/features/practitioners/types/practitioners.types.ts](D:/Web/full-projects/fayed/fayed-frontend-v1/src/features/practitioners/types/practitioners.types.ts)
- [src/components/form/input/TextArea.tsx](D:/Web/full-projects/fayed/fayed-frontend-v1/src/components/form/input/TextArea.tsx)
- [messages/en/practitioner-area.json](D:/Web/full-projects/fayed/fayed-frontend-v1/messages/en/practitioner-area.json)
- [messages/ar/practitioner-area.json](D:/Web/full-projects/fayed/fayed-frontend-v1/messages/ar/practitioner-area.json)

## Translations Added / Updated
- Wizard header, subtitle, step labels, and helper copy.
- Completion status labels and severity labels.
- Locked state copy for submitted, under review, approved, rejected, and changes requested.
- Backend issue-copy mappings for practitioner completion messages.
- Save/submit feedback strings.
- Review step labels and checklist copy.

## Tests Added / Updated
- No dedicated automated frontend tests were added in this phase.
- Existing frontend typecheck, build, lint, and i18n validation were used to verify the wizard.

## Manual QA Results
- Browser smoke was not run in this session because no browser automation tool was available here.
- The page is verified by compile/build checks only in this phase.

## Verification Command Results
- `npm audit --audit-level=moderate` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed.
- `npm run lint` passed with pre-existing repo warnings only.

## Remaining Gaps
- No browser smoke / visual QA was performed in this session.
- The wizard still embeds the existing credentials and specialties tools, so future Phase 17D review may further refine the admin side and any remaining field placement decisions.

## Final Answers
- Is the practitioner application now a wizard/stepper? yes
- Does it use backend completion checklist? yes
- Does it avoid showing the giant form all at once? yes
- Can practitioner save draft and resume? yes
- Does submit remain backend-gated? yes
- Did we change backend/business rules? no
- Is admin review page changed in this phase? no


# Phase 17A — Practitioner Application UX Simplification Discovery & Redesign

## Executive Summary
The current practitioner onboarding flow works, but it is too dense for first-time completion and too passive for admin review. The backend already has enough structure to support a simpler UX without changing business rules or adding migrations for the redesign itself. The best path is to split the practitioner experience into a guided stepper with a clear checklist and to redesign the admin review screen into a decision-oriented review surface with completeness, risk, and next-step guidance.

The current schema already supports:
- application draft state
- submission snapshot truth
- submit / review / request-changes lifecycle
- review decision notes
- readiness evaluation
- credential review
- payout destination validation

So the UX can be simplified materially without losing required review data.

## Current Practitioner Flow Overview
The practitioner-facing flow currently centers on a single long workspace and a readiness/status card.

Current routes and surfaces:
- `src/app/[locale]/(practitioner)/practitioner/application/page.tsx`
- `src/features/practitioners/components/PractitionerProfileWorkspace.tsx`
- `src/features/practitioners/components/PractitionerApplicationStatus.tsx`
- mobile equivalent: `fayed-mobile/app/(practitioner)/onboarding.tsx`

Current behavior:
- practitioner fills profile data on one large page
- application can remain in draft state
- submission is readiness-gated
- after submission the status becomes locked for editing in the main workspace
- if admin requests changes, practitioner can come back and update/resubmit
- approved and archived states become mostly informational

Current practitioner UX pain points:
- too many fields are shown at once
- profile, specialties, credentials, pricing, payout, and application status are mixed together
- labels are not consistently Arabic-first
- the page feels like a form dump rather than a guided process
- required fields are not surfaced as a clear checklist
- the user does not get a step-by-step sense of progress
- payout data is visually mixed with identity and professional data

## Current Admin Review Flow Overview
The admin review flow exists, but it is long and passive.

Current routes and surfaces:
- `src/app/[locale]/(admin)/admin/practitioner-applications/page.tsx`
- `src/app/[locale]/(admin)/admin/practitioner-applications/[id]/page.tsx`
- `src/features/admin/practitioner-applications/components/AdminApplicationsList.tsx`
- `src/features/admin/practitioner-applications/components/AdminApplicationDetails.tsx`

Current behavior:
- admin sees a list of submitted applications
- admin opens a detail screen that shows live profile, requested profile, credentials, payout details, readiness snapshot, and review actions
- admin can approve, reject, request changes, and edit draft fields
- compare view shows many field differences at once

Current admin UX pain points:
- the detail screen is too long for fast triage
- admin must read too much before understanding whether the application is reviewable
- there is no compact “decision header” that summarizes completeness and risk
- the compare screen is useful, but it is not framed as decision support
- review actions are present, but the page does not clearly say what is missing, why it matters, and what should happen next

## Current Field Inventory and Classification

### A. Account Basics
Fields:
- displayName
- phone
- email
- countryCode
- locale
- timezone
- practitionerGender
- avatarUrl

Classification:
- Required before submission: displayName, countryCode, locale, timezone
- Required before approval: displayName, countryCode, locale, timezone, practitionerGender if product policy requires it
- Optional / can be deferred: avatarUrl, phone, email
- Derived from account data: email, phone, locale, timezone may already exist on user seed/account
- Needs product decision: practitionerGender

UX recommendation:
- keep displayName, country, locale, timezone in the first step
- keep avatar optional and visually secondary
- do not force phone/email unless backend truly requires manual correction

### B. Professional Identity
Fields:
- practitionerType
- professionalTitle
- bio
- yearsOfExperience
- languages
- specialties
- primarySpecialtyCategoryId

Classification:
- Required before submission: practitionerType, professionalTitle, bio, yearsOfExperience, languages, specialties, primarySpecialtyCategoryId
- Required before approval: same set
- Optional / can be deferred: richer bio polish, extra language detail beyond primary selection, non-primary specialties
- Admin-only / internal: none
- Needs product decision: whether the practitioner must choose a primary specialty category first or can choose specialties first

UX recommendation:
- put these fields into a dedicated professional step
- use a small checklist for language/specialty completion rather than a long inline form

### C. Session Pricing
Fields:
- sessionPrice30Egp
- sessionPrice30Usd
- sessionPrice60Egp
- sessionPrice60Usd
- acceptsPackage

Classification:
- Required before submission: current readiness logic includes pricing values in the profile, but the application readiness policy does not currently mark pricing as a missing requirement in the final submit gate
- Required before approval: likely yes for pricing rows if the business wants marketplace readiness
- Optional / can be deferred: acceptsPackage if packages are not part of the initial practitioner application decision
- Needs product decision: whether USD pricing is required for all practitioners or only for cross-border / market-specific cases

UX recommendation:
- separate pricing into its own step
- show EGP and USD in clearly separated blocks
- avoid package-related wording unless package enablement is a separate decision

### D. Qualifications / Credentials
Fields:
- credentialType
- fileUrl
- reviewStatus
- expiresAt
- reviewNotes
- uploadedAt

Classification:
- Required before submission: at least one credential is required by readiness logic
- Required before approval: yes
- Optional / can be deferred: some credential detail metadata
- Admin-only / internal: reviewStatus, reviewNotes, uploadedAt
- Needs product decision: whether different credential types have different approval requirements

UX recommendation:
- represent credentials as repeatable cards
- show one required credential card first
- allow extra credentials later
- do not bury credentials inside the long profile form

### E. Documents
Fields:
- identity document
- license document
- certificates
- CV
- proof of practice

Classification:
- Required before submission: at least one proof document if the business requires it
- Required before approval: likely yes for regulated roles
- Optional / can be deferred: CV, extra certificates
- Needs product decision: exact required document set by practitioner type/country

UX recommendation:
- convert documents into a checklist-based upload step
- mark each document as required or optional

### F. Payout Destination
Fields:
- payoutMethodType
- accountHolderName
- bankName
- bankAccountNumber
- iban
- walletProvider
- walletIdentifier
- otherDetails

Classification:
- Required before submission: current readiness requires payout destination and account holder name
- Required before approval: yes
- Optional / can be deferred: otherDetails
- Needs product decision: whether payout details must be completed at draft time or can be deferred until just before approval

UX recommendation:
- make this a dedicated step
- reveal only the fields relevant to the selected payout method
- keep the method selection first, then show conditional fields

### G. Admin Review Data
Fields:
- status
- submittedAt
- reviewedAt
- reviewDecisionReason
- reviewNotes
- review history
- readiness snapshot

Classification:
- Required before approval: review notes and decision reason are required at least for reject/request-changes paths
- Admin-only / internal: all of these
- Needs product decision: whether reviewer identity should be persisted on `PractitionerApplication`

UX recommendation:
- show this as a separate admin-only review section
- do not mix review metadata into the practitioner edit form

## Current Lifecycle Assessment
Actual statuses in code:
- `DRAFT`
- `SUBMITTED`
- `UNDER_REVIEW`
- `APPROVED`
- `REJECTED`
- `CHANGES_REQUESTED`
- `ARCHIVED`

Current behavior:
- draft is editable
- submitted and under review states are locked in the practitioner workspace
- changes requested should allow editing/resubmission
- approved and archived are informational
- admin can approve, reject, and request changes

Recommended lifecycle:
- Draft
- Submitted / Pending Review
- Changes Requested
- Approved
- Rejected
- Archived

Gaps and risks:
- the application record does not persist a dedicated reviewer id
- readiness and approval logic are centralized, but the UX does not present them as a clear checklist
- pricing changes and payout changes likely need a stronger “review-required” explanation

## Backend / API Readiness Assessment
The backend is already reasonably aligned with a stepper-style UX.

What the backend can already support:
- draft profile editing
- readiness evaluation
- application status retrieval
- submission snapshot persistence
- admin list/detail review
- admin approve / reject / request-changes flows
- credential CRUD in admin scope
- payout destination conditional validation

What is missing for a polished UX:
- a dedicated completion checklist endpoint or payload
- a more explicit “what is missing” mapping beyond raw readiness keys
- a reviewer identity field on the application record if that becomes a product requirement

Conclusion:
- backend changes are not strictly required for the UX redesign itself
- backend enhancements may be useful later for richer checklist semantics and reviewer traceability

## Data Model / Migration Assessment
Current schema already supports the redesign well:
- `PractitionerApplication` has status, submission snapshot, review reason, review notes, timestamps
- `PractitionerCredential` has review status and notes
- `PractitionerPayoutDestination` supports method-specific payout data
- readiness can be computed from existing profile/account state

Assessment:
- no migration is required for the UX simplification itself
- a migration may be useful later if the product wants:
  - reviewer identity on `PractitionerApplication`
  - structured review checklist history
  - structured requested-change fields
  - resubmission audit trail

## Recommended Practitioner Wizard Structure

### Step 1: Basic Profile
Arabic title:
- الملف الأساسي

Include:
- display name
- country
- locale/timezone
- gender if needed
- avatar optional

### Step 2: Professional Details
Arabic title:
- البيانات المهنية

Include:
- practitioner type
- professional title
- bio
- years of experience
- languages
- specialties and primary specialty

### Step 3: Pricing
Arabic title:
- أسعار الجلسات

Include:
- 30 min EGP
- 60 min EGP
- 30 min USD
- 60 min USD
- package toggle only if it is truly relevant to onboarding

### Step 4: Qualifications
Arabic title:
- المؤهلات

Include:
- required credential card
- optional additional credentials
- document checklist

### Step 5: Documents
Arabic title:
- المستندات

Include:
- identity document
- license document
- certificates
- CV if needed
- proof of practice if needed

### Step 6: Payout Details
Arabic title:
- بيانات استلام المستحقات

Include:
- payout method
- conditional fields by method
- account holder name

### Step 7: Review & Submit
Arabic title:
- مراجعة وإرسال

Include:
- progress percentage
- checklist of missing items
- readiness status
- summary of what admin will review
- submit action

Wizard behavior recommendation:
- autosave drafts or explicit save draft
- show “last saved”
- allow returning later without losing progress
- disable submit until minimum readiness is met
- show a compact missing-items list, not a wall of errors

## Recommended Admin Review Structure

### Top Decision Header
Include:
- applicant name
- current status
- submitted date
- completeness score
- open risk flags
- main actions

### Review Checklist
Show:
- profile complete
- documents complete
- qualifications complete
- pricing configured
- payout details complete
- missing required fields

### Sections / Tabs
Recommended tabs:
- Overview
- Profile
- Pricing
- Documents
- Qualifications
- Payout
- Review history
- Changes comparison

### Request Changes Workflow
Admin should be able to choose structured reasons:
- missing document
- fix payout details
- update bio
- clarify qualification
- adjust pricing
- other note

### Approve / Reject Guardrails
Approval should:
- block if critical fields are missing
- show confirmation
- optionally require step-up if sensitive admin policy already exists

Rejection should:
- require a reason
- show the effect on practitioner status clearly

## Simplification Recommendations

Keep on the first practitioner form:
- display name
- country / locale / timezone
- professional title
- bio
- years of experience
- practitioner type
- primary specialty selection
- at least one credential
- payout destination

Move to later steps:
- avatar
- extra credentials
- extra language detail
- optional certificates
- extra bio detail

Make optional:
- avatar
- CV
- non-critical document extras
- extra payout notes

Block submission on:
- missing display name
- missing professional title
- missing bio
- missing country
- missing years of experience
- no language
- no specialty
- no primary specialty
- no credential
- no payout destination
- missing payout account holder
- inactive account
- OTP not verified

Block approval on:
- missing critical identity/profile data
- missing required credentials
- missing payout data
- incomplete pricing if the product decides it is approval-critical

## Product Decisions Needed
1. Is pricing required before submit or only before approval?
2. Is USD pricing mandatory for all practitioners or only some?
3. Is `acceptsPackage` part of onboarding or a later setting?
4. Which document types are mandatory by practitioner type?
5. Should reviewer identity be stored on the application record?
6. Should rejected applications be resubmittable without admin intervention?
7. Should critical field changes after approval force re-review?

## Proposed Implementation Phases

### Phase 17B — Backend Practitioner Application Workflow Hardening
- draft/save/submit contracts
- completion checklist
- structured requested changes
- admin guardrails
- audit
- tests

### Phase 17C — Practitioner Application Wizard UI
- stepper
- autosave/draft
- simplified fields
- checklist
- review submit page
- Arabic/English copy

### Phase 17D — Admin Practitioner Application Review UX
- decision header
- checklist
- tabs/sections
- structured request changes
- approve/reject guardrails

### Phase 17E — QA / End-to-End Practitioner Onboarding
- new practitioner sign-up
- draft resume
- submit
- admin request changes
- practitioner resubmit
- admin approve/reject
- marketplace activation

## Final Answers
- Is the current practitioner application UX too complex? yes
- Can it be simplified without losing required review data? yes
- Do we need backend changes? no for the UX redesign itself, yes only for later traceability/checklist enhancements
- Do we need migrations? no for the UX redesign itself
- What should we build next? Phase 17B backend workflow hardening, then Phase 17C wizard UI

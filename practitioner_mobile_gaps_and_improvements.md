# Practitioner Mobile Gaps and Improvements

Scope: current mobile app at `fayed-mobile`, compared against the web practitioner experience in `fayed-frontend-v1` and backend capabilities in `fayed-backend-v1`.

## Executive Summary

The practitioner mobile app already covers:

- dashboard
- availability
- sessions
- finance
- support
- care chat
- account/profile basics
- presence heartbeat

However, it is still missing several high-value practitioner workflows that exist in web/backend, especially application onboarding, credential management, specialties management, a dedicated profile workspace, and richer review visibility. The current mobile experience is usable, but it is not yet a full practitioner operating surface.

## Missing Features

### 1. Practitioner application workflow

The web app has a dedicated practitioner application page and detailed review flow. The mobile app does not have a first-class application submission/edit/review experience.

Impact:

- practitioners cannot complete or manage their application journey comfortably on mobile
- review status is only partially visible through account summaries

### 2. Credential management

The web app has explicit credential management screens. The mobile app does not expose a dedicated credential upload/review workflow.

Impact:

- practitioners cannot manage documents and credential status as a standalone flow
- the account page becomes overloaded with too many responsibilities

### 3. Specialty management

The web app provides specialty management as a separate workspace. The mobile app only surfaces specialties as read-only account data.

Impact:

- practitioners cannot properly curate their specialty profile on mobile
- no dedicated specialty selection/edit UX

### 4. Dedicated profile workspace

The web app separates:

- profile editing
- application status
- readiness
- credentials
- specialties

The mobile app compresses most of this into the account screen.

Impact:

- screen complexity increases
- harder to understand next steps
- maintainability risk as the form grows

### 5. Practitioner reviews

The backend and web app support practitioner reviews and trust-related surfaces. The mobile app does not expose a dedicated reviews page for practitioners.

Impact:

- practitioners cannot easily inspect reputation feedback on the go

### 6. Articles / educational content

Not strictly required for operations, but the web content layer exists. Mobile does not expose a practitioner-facing articles hub.

Impact:

- missed engagement and education opportunity

## UX Improvements

### Dashboard

- Make the approval/application state the primary narrative.
- Surface:
  - profile completion
  - readiness blockers
  - application status
  - next action
- Reduce duplicate quick-access tiles by grouping them by task category.

### Account / profile

- Split the current "account" screen into clearer sections:
  - profile
  - application
  - credentials
  - specialties
  - payout
  - localization
- Keep the summary card, but avoid turning the screen into a long admin-style form.

### Availability

- The availability editor should feel more calendar-like and less form-like.
- Improve empty states and exception management.
- Make instant booking and online presence clearer as distinct concepts.

### Sessions

- Surface operational actions more clearly:
  - join
  - review
  - mark completed
  - mark no-show
- Add stronger status explanations for each session state.

### Finance

- Make wallet, ledger, and settlements easier to scan.
- Add stronger grouping for:
  - earned
  - pending
  - paid out
- Consider a better detail drill-down for settlement rows.

### Support and care chat

- Clarify the difference between ticket inbox and care-chat requests.
- Improve unread indicators and conversation grouping.
- Make request review states more visible.

## API / Integration Gaps

### Missing or underused backend capabilities

The backend already exposes practitioner-related capabilities that the mobile app does not fully consume:

- practitioner application status and review details
- practitioner credentials
- practitioner specialties editing
- practitioner review surfaces
- richer profile readiness checks

### Current mobile usage

The mobile app already consumes:

- practitioner profile
- practitioner readiness
- practitioner presence and heartbeat
- practitioner availability
- practitioner sessions
- practitioner finance
- practitioner support
- practitioner care chat

That means the core operational loop is present, but the profile/onboarding loop is not complete.

## Architecture / State Issues

### 1. Account screen is doing too much

`app/(practitioner)/account.tsx` currently acts as:

- profile editor
- readiness viewer
- application status viewer
- payout summary
- account status viewer

This is functional, but it will become fragile as more practitioner workflows are added.

Recommendation:

- split into a practitioner workspace with smaller subpages

### 2. Presence heartbeat is tied to layout lifecycle

Presence is handled from the practitioner tab layout via an interval + AppState listener.

That is a good start, but the lifecycle should be reviewed carefully as the app grows:

- foreground/background transitions
- app resume behavior
- duplicate heartbeat protection
- user logout cleanup

Recommendation:

- keep the heartbeat service centralized and test it independently

### 3. No query cache persistence

Like the patient side, the practitioner app persists auth and push registration, but not the React Query cache.

Result:

- restarts cause a noticeable refetch storm
- screen state is not durable

### 4. Feature fragmentation risk

The practitioner area already spans:

- profile
- presence
- availability
- sessions
- finance
- support
- care chat

Without a stronger workspace pattern, future onboarding/profile/credential features will drift into duplicated screen logic.

## Reusable Components Needed

- practitioner application status card
- readiness checklist component
- credential upload list / status row
- specialty selector component
- payout destination summary card
- presence status chip
- approval blockers card
- finance summary cards
- ledger row component
- settlement detail card
- session action bar
- shared inbox/request card pattern

## Priority Levels

### P0

- practitioner application workflow
- credential management
- specialty management

### P1

- dedicated profile workspace
- practitioner reviews
- improved availability UX
- stronger session action handling

### P2

- finance detail polish
- support/care-chat consolidation
- articles or educational surface if needed for practitioner engagement
- query cache persistence for non-sensitive state

## Recommended Execution Order

1. Split the practitioner workspace:
   - application
   - credentials
   - specialties
   - profile
2. Complete the onboarding/review loop:
   - readiness
   - blockers
   - application status
3. Polish operational screens:
   - availability
   - sessions
   - finance
4. Improve communication surfaces:
   - support
   - care chat
5. Add shared infrastructure:
   - reusable summary cards
   - list/detail scaffolds
   - optional query persistence for safe data

## Notes

- The practitioner app is already strong for daily operations.
- The biggest gap is the onboarding/profile management layer.
- The biggest architectural risk is letting the account screen absorb too many unrelated responsibilities.

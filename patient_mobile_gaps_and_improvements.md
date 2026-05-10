# Patient Mobile Gaps and Improvements

Scope: current mobile app at `fayed-mobile`, compared against the web patient experience in `fayed-frontend-v1` and backend capabilities in `fayed-backend-v1`.

## Executive Summary

The patient mobile app already covers the core booking and care loop:

- discovery
- practitioner profile viewing
- guided matching
- assessments
- sessions and cancellation preview
- payments and wallet
- care chat
- support
- profile basics
- notifications

The main gap is not the core transaction flow. The bigger gap is content, navigation depth, and feature parity with the web experience. The mobile app is missing several high-value consumer surfaces that already exist in web/backend, especially articles, academy/training, package purchases, richer journey surfaces, and a more polished discovery/filter UX.

## Missing Features

### 1. Articles hub

The web app has a full public/patient articles experience:

- article listing
- article detail
- SEO/trust metadata
- category navigation
- admin article management

The mobile app has no real article routes or article API layer yet. The only article references are localized strings, which means the content surface is effectively absent.

Impact:

- patients cannot browse trusted educational content on mobile
- no content discovery loop for engagement or retention
- no parity with the web content strategy

### 2. Academy / training

The backend and web support academy/training content. The mobile app does not expose a patient academy/training surface.

Impact:

- users cannot consume structured educational content on mobile
- no mobile enrollment or course browsing flow

### 3. Package purchases

The web patient experience includes package/purchase-related flows. The mobile app has payments and wallet, but not the full package purchase journey.

Impact:

- patients cannot manage or buy packages from mobile
- incomplete financial lifecycle parity

### 4. Reviews

The backend supports reviews, and the web app has review-related pages. The mobile app does not expose a patient review history or review submission flow as a first-class feature.

Impact:

- patients may complete sessions without a clear post-session feedback path
- missing trust and quality loop

### 5. Rich patient journey dashboard

The backend exposes a strong `patient-journey` API with:

- next steps
- upcoming session/payment/support state
- recent history
- recommended action

The mobile home screen uses parts of this ecosystem, but not the full journey intelligence that exists on web.

Impact:

- weaker personalization
- less guidance toward the next best action

### 6. Better content browsing and filtering parity

The discovery screen exists, but compared to web it is still more limited and more "listing-first" than "experience-first".

Impact:

- users may struggle to discover therapists efficiently
- content hierarchy is less rich than web

## UX Improvements

### Discovery

- Add richer sectioning similar to web: featured, recommended, online now, specialty-based lists.
- Add saved filters or a recent filters shortcut.
- Improve empty states so they explain what to try next.
- Consider a stronger specialty-first browsing mode instead of only filter-first browsing.

### Practitioner profile browsing

- Add a more editorial profile header.
- Surface trust signals more clearly: verification, review highlights, specialties, availability.
- Improve the slot preview area so users understand availability before moving to payment.

### Sessions

- Make the session detail screen more action-oriented.
- Highlight next step, payment state, cancellation constraints, and join availability.
- Keep cancellation preview, but surface it more clearly in the main session detail.

### Payments

- Clarify payment states and what the user should do next.
- Make wallet and transaction history easier to scan on small screens.

### Support and care chat

- Improve inbox grouping and unread affordances.
- Make ticket and conversation states more visually distinct.
- Consider a unified communication shell to reduce context switching.

### Articles / education

- Article cards should support strong preview hierarchy:
  - cover image
  - title
  - short summary
  - category chip
  - read time
- Article detail should support large readable typography and trust badges.

## API / Integration Gaps

### Missing or unused endpoints

The backend already provides capabilities that the mobile app does not currently consume:

- public articles listing and detail
- article categories
- academy courses and enrollment
- patient package purchase APIs
- review APIs

### Partial usage

The mobile app already uses:

- patient sessions
- payments
- matching
- care chat
- support
- notifications
- patient profile
- journey summary

But some flows are still shallow compared to backend capability:

- patient journey intelligence is not fully surfaced
- the content layer is missing
- package-related financial flows are not fully represented

## Architecture / State Issues

### 1. No query persistence layer

The mobile app uses `@tanstack/react-query`, but there is no query persistence setup. Session auth is persisted with `AsyncStorage`, but network cache is not.

Result:

- every app restart re-fetches many screens
- no offline-friendly cached content
- state restoration is limited to auth, not feature data

### 2. Route-param driven filtering

The discovery screen uses route params as the source of truth for filters. This works, but it makes the screen state more fragile and harder to compose if the filter set grows.

Recommendation:

- keep route params for shareable search state
- move filter normalization into a reusable service or hook

### 3. Domain duplication risk

Patient discovery, sessions, support, and care chat each have their own API/hook/type stacks. That is fine at the current size, but article and academy features should not be built as one-off duplicated patterns.

Recommendation:

- extract shared list/detail/query scaffolds before adding more content-heavy domains

### 4. Session-only auth restore

Auth restoration is good, but it is not tied to a full persisted app shell state.

Result:

- app may feel "cold" on restart
- lists and filters are rebuilt from scratch

## Reusable Components Needed

- article list card
- article detail shell
- category chip / specialty chip system
- trust badge strip
- content hero section
- empty/loading/error states for content lists
- search + filter toolbar for content browsing
- reusable financial summary cards
- reusable journey-next-step card
- improved session timeline card
- reusable review summary card

## Priority Levels

### P0

- articles hub
- academy/training access
- package purchase flows

### P1

- patient journey dashboard parity
- review history / review submission
- richer discovery browsing and filtering
- more informative session detail states

### P2

- wallet and payment UX polish
- support and care-chat unification
- offline/cache persistence for non-sensitive content
- stronger reusable UI system for content pages

## Recommended Execution Order

1. Build the missing content layer first:
   - articles
   - academy/training
2. Add financial lifecycle parity:
   - package purchases
   - review-related post-session flows
3. Upgrade the journey/dashboard surfaces:
   - next step cards
   - recent history
   - better session and payment guidance
4. Polish discovery and content browsing:
   - stronger filtering
   - specialty/category browsing
   - better card hierarchy
5. Add state infrastructure improvements:
   - optional query persistence for non-sensitive data
   - shared list/detail patterns

## Notes

- The patient app is already strong for transactional care flows.
- The most visible gap is educational/content depth.
- The most important technical gap is the lack of persisted query cache for non-sensitive data.

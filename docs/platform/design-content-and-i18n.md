# Design, Content, and i18n

Sawiyaa uses a design language called **Clinical Warmth**.

The root `DESIGN.md` remains the canonical source for the visual token palette and brand values. This document summarizes the product-facing design rules, copy rules, and localization rules that should stay consistent across the platform.

## Core visual rules

- Use the Sawiyaa teal palette for primary actions and important highlights.
- Use a light gray page background with white cards on top.
- Keep corners soft and surfaces calm.
- Prefer spacing and hierarchy over decoration.
- Avoid loud gradients, neon colors, or visual noise.
- Keep shadows subtle and state-based.

## Layout rules

- Hero sections should be compact and clear.
- Cards should communicate one idea each.
- Avoid repeating the same explanation in multiple cards.
- Use whitespace to reduce cognitive load.
- Make the primary action obvious, but not aggressive.

## Typography rules

- Use a modern, readable font family consistently.
- Page titles should be clear and direct.
- Supporting text should be short and helpful.
- Financial screens should keep numbers readable and aligned.
- Do not make text feel like a legal wall unless a policy page requires it.

## Modals

- Keep modals centered and easy to scan.
- Use concise headers and helpful body copy.
- Do not make confirmation modals too tall on desktop.
- Make destructive actions visually clear.
- If an action is blocked, explain why instead of simply disabling it silently.

## Lists and detail pages

- Lists should show the minimum useful metadata.
- Detail pages should prioritize the main task first.
- Avoid overcrowding the left side with low-value cards.
- Use badges and labels to make state obvious.

## Supportive copy

- Write like a calm assistant, not like a system log.
- Explain what the user can do next.
- Never expose raw technical states to patients if a human explanation is possible.

## Content rules

- Keep copy short, direct, and task-oriented.
- Avoid sentence duplication across cards and sections.
- Keep status labels human-friendly.
- Keep financial copy short and direct.
- Use consistent terminology across pages.

## i18n rules

Sawiyaa is bilingual. English and Arabic must both be treated as first-class product languages.

- Do not surface raw translation keys to users.
- Keep namespaces organized by feature.
- Keep patient-facing copy supportive and short.
- Avoid technical language in user-facing error states whenever possible.
- Make sure RTL and LTR both read naturally.

## Translation structure

Feature-level namespaces are the preferred pattern.
Examples:

- `payments`
- `sessions`
- `instant-booking`
- `help`
- `refund-policies`
- `specialties`
- `notifications`

## Quality checks

- No mojibake in source files.
- No mixed-language UI fragments unless the feature deliberately displays proper nouns or brand names.
- No route leakage in error or unavailable states.
- No fallback that changes the meaning of a payment or session state.
- No English leakage in Arabic UI.
- No raw enum values in user-facing copy.

## What to keep in mind

- The product language should feel calm, trustworthy, and human.
- RTL and LTR must both read naturally.
- Clinical Warmth is a product rule, not just a visual palette.

## Session state localization rules

Session display state comes from backend `presentationStatus` values. These values must always be translated through the i18n system before appearing in the UI. Raw enum values must never be visible to users.

### What must not appear raw in UI

- `NO_SHOW` - user-facing label should be translated, never shown as the raw enum value
- `UNDER_REVIEW` - user-facing label should be translated, never shown as the raw enum value
- `SESSION_NOT_JOINABLE_STATUS` - this is an internal gate value, not a user-facing state
- Internal i18n key paths such as `sessions.practitioner.detail.presentation.NO_SHOW.title` should not appear as visible text

### Specialty localization rules

Specialty and specialty category names have raw fields and display helpers.

- Admin forms must bind raw inputs to `nameAr` and `nameEn`.
- Display helpers are for public and list rendering only.
- The helper must not backfill admin form values.
- Arabic UI should prefer `nameAr`.
- English UI should prefer `nameEn`.
- Fallbacks should never produce blank names when a legacy value or slug exists.

### Translation structure for specialty names

Specialty name display should remain separate from admin field labels.
Examples:

- `specialties.list.name`
- `specialties.detail.name`
- `admin.specialties.form.nameAr`
- `admin.specialties.form.nameEn`

### QA check for session and specialty text

Verify by checking the rendered page text in the target locale:

- The status badge shows a human-readable label, not a raw enum
- The session detail shows translated state copy, not a key path or enum string
- The specialty list shows a localized display name, not a blank card
- No `undefined`, `null`, `[object Object]`, or raw enum appears in the visible content area
- The Join CTA is hidden when `joinAvailability.canJoin` is false


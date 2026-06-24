# Sawiyaa Mobile Design System

## Purpose
This document defines the mobile-first design system and UX rules for the Sawiyaa React Native patient app. It is the foundation for the redesign, not a screen-by-screen spec.

Sawiyaa is a warm, trusted healthcare marketplace and care journey app. It helps patients discover providers, book care, pay safely, join sessions, read articles, manage packages, handle messages and notifications, and get support.

This is not a generic hospital app. It is not a fitness app. It is not a cold admin dashboard. Do not invent features, visuals, or flows that do not exist in the product.

## Brand Lock

The current brand name is **Sawiyaa** in English and **Ø³ÙˆÙŠÙ‘Ø©** in Arabic.

- **English name:** `Sawiyaa`
- **Arabic name:** `Ø³ÙˆÙŠÙ‘Ø©`
- **Domain:** `sawiyaa.com`
- **Core tagline EN:** `Care for mind, body, and balance`
- **Core tagline AR:** `Ø±Ø¹Ø§ÙŠØ© Ù„Ù„Ø¹Ù‚Ù„ ÙˆØ§Ù„Ø¬Ø³Ù… ÙˆØ§Ù„ØªÙˆØ§Ø²Ù†`

Do not use the old `Sawiyaa` name in new user-facing UI, brand copy, visual prompts, onboarding screens, app metadata, or marketing surfaces unless the task is explicitly about legacy migration.

The product meaning behind Sawiyaa is balance, wellbeing, guided care, and a healthier emotional and physical journey. The visual identity should support mental health, nutrition, and psychological coaching without looking like a generic hospital, fitness tracker, or luxury spa.

## Reference Basis
The Stitch reference folder in `sawiyaa-mobile/stich` shows the intended emotional direction and mobile presentation language.

What the reference contributes:
- `welcome_splash` defines the brand tone: warm, calm, premium, and trust-led.
- `patient_home` shows that the app should feel like a patient dashboard, not a dense operations panel.
- `sessions_center` and `booking_slots` show the mobile-native structure for timeline, status, and slot selection.
- `wallet_payments`, `messages_inbox`, and `notifications` show that information should be scannable, not paragraph-heavy.
- `more_profile_hub`, `preferences_language`, `notification_preferences`, and `personal_information` show the grouping logic for settings and profile surfaces.
- `practitioner_profile` and `care_packages` show how conversion surfaces should still feel human and concise.
- `articles_care` shows content should read like a list and preview system, not a card wall.

The reference is a direction source only. It must not be copied literally, and it must not introduce fake product features.

## Product Identity
Sawiyaa should always feel like:
- A healthcare marketplace with care journeys, not a generic clinic directory.
- Warm, reliable, and human.
- Clear enough for patients under stress.
- Premium, but never luxurious in a way that reduces trust.

Sawiyaa should never feel like:
- A fitness tracker or biometrics app.
- A medical device dashboard.
- An internal ops console.
- A copy-heavy education site.

The product should communicate trust through structure, clarity, pacing, and strong defaults, not through excessive explanation.

## Core UX Principle
Do not over-explain obvious UI.

Avoid long instructional paragraphs inside normal app screens. Prefer short labels, clear hierarchy, helpful microcopy, and progressive disclosure. Use longer copy only for policy, payment risk, blocked states, support, or sensitive healthcare and finance explanations.

A patient should understand the screen from structure, labels, state, and CTA, not from repeated paragraphs.

## Visual Identity

The mobile visual language remains **Clinical Warmth**, now expressed through the **Sawiyaa** identity.

Sawiyaa should feel:
- Calm and premium.
- Human and trustworthy.
- Healthcare-safe without feeling cold.
- Arabic-first, with polished English support.
- Suitable for mental health, nutrition, and psychological coaching.
- Clear enough for patients under stress.

Visual direction:
- Warm ivory app backgrounds instead of cold gray.
- White or near-white cards layered over the background.
- Sawiyaa Deep Teal used for primary actions, active states, headers, and key brand moments.
- Soft Sage used for supportive surfaces, icons, quiet highlights, and gentle wellbeing cues.
- Warm Gold used as a restrained premium accent only.
- Muted Sand used for dividers, subtle surfaces, and soft section separation.
- No loud gradients, neon colors, heavy glassmorphism, or decorative medical clichÃ©s.
- No random ECG, heartbeat, cross, hospital, or fitness-device visual language.
- Every screen should feel related to the same calm brand system, without becoming repetitive.

### Official Sawiyaa Color Palette

Use semantic tokens rather than hardcoded screen colors. These are the approved launch palette values.

| Token | HEX | Purpose |
| --- | --- | --- |
| `brand.primary` | `#24564F` | Sawiyaa Deep Teal. Primary buttons, active states, brand text, selected icons, strong headings. |
| `brand.secondary` | `#A7BFAE` | Soft Sage. Secondary highlights, supportive icons, soft cards, calm section accents. |
| `brand.background` | `#F7F4EE` | Warm Ivory. Main app background and default page background. |
| `surface.card` | `#FFFFFF` | Primary card and sheet background. |
| `surface.cardWarm` | `#FCFAF6` | Optional warm card surface for quieter sections. |
| `brand.sand` | `#E6D6B8` | Muted Sand. Dividers, subtle containers, secondary decorative lines. |
| `brand.gold` | `#C8A979` | Warm Gold. Premium accent dots, thin lines, selected highlights only. |
| `brand.tint` | `#EEF4EF` | Very light green surface for chips, badges, and soft hover/pressed states. |
| `brand.tintStrong` | `#D9E4DB` | Stronger green tint for selected soft surfaces. |
| `text.primary` | `#1C2F2B` | Main readable text on light backgrounds. |
| `text.secondary` | `#61716C` | Secondary text and helper copy. |
| `border.soft` | `#E6D6B8` | Soft borders and dividers. |

### Background and Surface Rules

Approved light-mode layering:

- **Main app background:** `#F7F4EE`
- **Primary card background:** `#FFFFFF`
- **Warm secondary card background:** `#FCFAF6`
- **Soft green tint surface:** `#EEF4EF`
- **Soft divider / outline:** `#E6D6B8`

Use `#F7F4EE` for the screen background and place cards on top with `#FFFFFF`. This creates a warm healthcare feel while keeping scanability and contrast.

Do not use cold gray backgrounds as the default app surface unless a specific technical state requires it.

### Shadow and Elevation Tokens

Elevation should be light, tonal, and based on the Sawiyaa Deep Teal shadow family.

| Token | Value | Use |
| --- | --- | --- |
| `shadow.soft` | `0 4px 12px rgba(36, 86, 79, 0.06)` | Inputs, small cards, quiet list rows. |
| `shadow.card` | `0 8px 24px rgba(36, 86, 79, 0.08)` | Main cards and grouped surfaces. |
| `shadow.logo` | `0 10px 30px rgba(36, 86, 79, 0.10)` | Logo mark, app icon, hero brand moments. |

Equivalent alpha HEX references:

- `rgba(36, 86, 79, 0.06)` â‰ˆ `#24564F0F`
- `rgba(36, 86, 79, 0.08)` â‰ˆ `#24564F14`
- `rgba(36, 86, 79, 0.10)` â‰ˆ `#24564F1A`

Do not use dark black shadows, stacked shadows, or sharp drop shadows. Depth should support hierarchy, not decoration.

### Color Strategy

Use semantic tokens rather than hardcoded screen colors.

Default direction:
- Backgrounds should feel warm and calm.
- Surfaces should be white or near-white on light mode.
- Deep Teal should remain the main brand signal, but it should not dominate every surface.
- Soft Sage and green tints should support the care feeling without reducing contrast.
- Warm Gold is an accent, not a button color.
- Status colors must remain readable in both light and dark mode.

Recommended color behavior:
- Primary action buttons, active states, selected tabs, and key affordances use `#24564F`.
- Secondary buttons use white or transparent backgrounds with Deep Teal text/border.
- Informational tinting should stay soft and desaturated.
- Success, warning, and error colors must remain functional first and decorative second.
- Avoid dark, saturated, or neon treatments.

### Implementation Tokens

Use these as the canonical naming direction when creating theme files.

```ts
export const sawiyaaColors = {
  brand: {
    primary: '#24564F',
    secondary: '#A7BFAE',
    background: '#F7F4EE',
    sand: '#E6D6B8',
    gold: '#C8A979',
    tint: '#EEF4EF',
    tintStrong: '#D9E4DB',
  },
  surface: {
    page: '#F7F4EE',
    card: '#FFFFFF',
    cardWarm: '#FCFAF6',
  },
  text: {
    primary: '#1C2F2B',
    secondary: '#61716C',
    inverse: '#FFFFFF',
  },
  border: {
    soft: '#E6D6B8',
    brand: '#24564F',
  },
  shadow: {
    soft: '0 4px 12px rgba(36, 86, 79, 0.06)',
    card: '0 8px 24px rgba(36, 86, 79, 0.08)',
    logo: '0 10px 30px rgba(36, 86, 79, 0.10)',
  },
};
```

For React Native, shadows must be translated to platform-safe tokens. Keep the color family the same:

```ts
export const sawiyaaElevation = {
  soft: {
    shadowColor: '#24564F',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  card: {
    shadowColor: '#24564F',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  logo: {
    shadowColor: '#24564F',
    shadowOpacity: 0.10,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
};
```

### Component Color Defaults

- `AppScreen`: background `#F7F4EE`.
- `AppHeader`: background transparent or `#F7F4EE`, text `#1C2F2B`, important actions `#24564F`.
- `BottomTabBar`: surface `#FFFFFF`, active `#24564F`, inactive `#61716C`, soft border `#E6D6B8`.
- `PrimaryButton`: background `#24564F`, text `#FFFFFF`, pressed state slightly darker than primary.
- `SecondaryButton`: background `#FFFFFF`, border `#24564F`, text `#24564F`.
- `Cards`: background `#FFFFFF`, shadow `shadow.card`, radius generous.
- `Warm Cards`: background `#FCFAF6` or `#EEF4EF` when the section needs a softer care tone.
- `Badges / Chips`: background `#EEF4EF`, text `#24564F`, border optional `#D9E4DB`.
- `Dividers`: `#E6D6B8` with low visual weight.
- `Logo / App Icon Surface`: `#FFFFFF` or `#F7F4EE`, shadow `shadow.logo`.

### Typography
Use typography to create hierarchy, not decoration.

Rules:
- Prefer a strong, calm hierarchy over many similar text sizes.
- Headings should feel editorial and trustworthy.
- Body text should remain compact and readable.
- Line length on mobile should stay short enough to scan easily.
- Arabic typography needs enough leading to stay breathable.

Do not use typography to compensate for weak layout. The layout should already communicate structure.

### Shapes and Elevation
The shape language should be soft, modern, and mobile-native.

- Cards and large containers use generous radii.
- Buttons and controls use a slightly firmer radius than containers.
- Pills and segmented controls should be fully rounded.
- Elevation should be light and tonal, not heavy.
- Avoid dark drop shadows, stacked shadows, or decorative depth.

Use depth sparingly. The goal is calm hierarchy, not visual noise.

### Motion
Motion should support orientation and confidence.

- Use subtle transitions, not dramatic animation.
- Prefer opacity and transform changes over layout animation.
- Motion should help users understand what changed.
- Keep loading and state transitions calm and brief.
- Avoid bounce, overshoot, and playful motion that weakens trust.

## Copy and Content Density Rules
The app copy must be concise, human, and useful.

Rules:
- Do not repeat the same explanation in multiple places.
- Do not write robotic Arabic.
- Do not mix English into Arabic UI except for proper names, emails, IDs, brand names, or technical identifiers that must stay in English.
- Do not expose raw translation keys.
- Do not expose raw enum values.
- Do not expose raw route names.
- Empty, error, and blocked states should explain the next safe action in one short message.
- Payment, session, join, and cancellation states may carry extra clarity, but they still need to stay concise.

Microcopy principles:
- Prefer action verbs.
- Prefer labels that describe the user outcome.
- Avoid filler text that only restates the title.
- Use short helper text only when it removes real friction.
- If the UI already makes the meaning obvious, do not add a paragraph.

## RTL and LTR Rules
Arabic RTL and English LTR are both first-class.

Layout rules:
- Mirror layout structure correctly.
- Header actions must mirror correctly.
- Back arrows, row chevrons, CTA arrows, and directional icons must flip correctly.
- Text alignment must follow locale direction.
- Inputs, icons, badges, chips, segmented controls, and list rows must support both directions.
- Bottom tabs must preserve logical navigation order per locale.
- Do not make Arabic look like a mirrored English screen. The Arabic experience must feel native.

Behavior rules:
- Ensure spacing, alignment, and icon placement remain natural in both directions.
- Do not rely on left and right as design language. Use leading and trailing semantics.
- Make sure status and action positions remain predictable across locales.

## Light and Dark Mode Rules
Light mode is the primary launch target unless the app already supports mode switching, but dark mode must be planned from the start.

Light mode principles:
- Main background uses Warm Ivory `#F7F4EE`.
- Primary surfaces use White `#FFFFFF`.
- Optional warm surfaces use `#FCFAF6`.
- Brand actions use Sawiyaa Deep Teal `#24564F`.
- High contrast text uses `#1C2F2B`.
- Calm, healthcare-safe surfaces remain the default.

Dark mode principles:
- Use semantic tokens so dark mode can be implemented safely.
- Avoid pure black surfaces unless a specific component truly needs them.
- Keep contrast strong without turning the interface neon or harsh.
- Preserve the warmth of the brand in a darker range.
- Status colors must remain readable and non-hyperactive.

Implementation rule:
- Do not hardcode colors inside screens.
- Always use theme tokens or semantic aliases so the same screen can work in both modes.

## App Shell Rules
The app shell should feel compact, premium, and predictable.

### AppHeader
There must be one consistent `AppHeader` system.

Rules:
- Use a compact header that respects safe areas.
- Inner screens use a clear back / title / action pattern.
- Home and shell screens may use a richer header with app-level actions.
- Messages icon must appear beside notifications on patient shell screens where app-level actions are available.
- Notifications icon must appear beside messages.
- Profile or avatar shortcut must remain accessible.
- Unread badges must be supported.
- Directional icons must flip with locale.

### BottomTabBar
The bottom tab bar should be clean, readable, and consistent.

Rules:
- Keep tab labels short.
- Use stable iconography.
- Preserve logical order per locale.
- Do not overload the tab bar with secondary actions.
- Active state should be clear without extra decoration.

### App Screen Structure
Use a shared `AppScreen` pattern for padding, safe areas, background, and scroll behavior.

Rules:
- Respect top and bottom safe-area insets.
- Keep screen padding consistent.
- Avoid wrapping every screen in unnecessary containers.
- Allow sections to breathe through spacing, not by adding more surfaces.

## Component System Rules
The following primitives define the mobile design system. Their behavior should remain consistent across the app.

### `AppScreen`
- Handles background, safe areas, scroll behavior, and spacing.
- Supports full-screen and inset layouts.
- Never forces a card wrapper by default.

### `AppHeader`
- Supports home, tab, and stack variants.
- Supports back navigation, title, actions, identity row, and unread badges.
- Mirrors correctly for RTL.

### `BottomTabBar`
- Provides the main shell navigation.
- Supports active state, badges, and locale-aware ordering.

### `PageHero`
- Used sparingly for strong top-of-screen orientation.
- Should be short, visual, and not verbose.
- Best for home, booking, or high-trust conversion surfaces.

### `SectionHeader`
- Provides a label, title, optional action, and optional hint.
- Avoid duplicate explanatory copy underneath.

### `PrimaryButton`
- Used for the main action only.
- Sawiyaa Deep Teal `#24564F` background, white label, accessible target size.

### `SecondaryButton`
- Used for the next-most-important action.
- Must not compete with the primary action.

### `BottomActionBar`
- Used when the screen needs a persistent CTA.
- Must respect safe areas.
- Keep it compact and calm.

### `StatusPill`
- Communicates status, not decoration.
- Short labels only.
- Use backend-derived state and translated labels.

### `InfoRow`
- For compact label-value pairs.
- Should support leading icons, trailing values, and RTL mirroring.

### `IconRow`
- For navigation or settings rows with a concise action pattern.
- Chevron direction must follow locale.

### `Avatar`
- Supports user, practitioner, and placeholder states.
- Must work with image, initials, and fallback icon.

### `EmptyState`
- Short explanation, one helpful action, no long paragraph.

### `LoadingState`
- Calm skeleton or spinner treatment.
- Keep it simple and non-distracting.

### `ErrorState`
- Explain the next safe action in one short message.
- If recovery is possible, offer it clearly.

### `SegmentedControl`
- Use for short mode switching only.
- Must remain readable in RTL and LTR.

### `Chips`
- Use for filters, tags, and quick choices.
- Avoid clutter and avoid too many chips on one screen.

### `SessionCard`
- Focus on status, schedule, provider, and next action.
- Must not infer session state locally.
- Session status comes from backend `presentationStatus`.
- Join CTA appears only when backend `joinAvailability.canJoin` is true.

### `PractitionerCard`
- Focus on trust signals, specialty, rating or proof points if available, and the primary booking action.

### `NotificationRow`
- Represents one notification item with time, type, and current state.
- Keep it scannable.

### `ConversationRow`
- Represents a message thread with preview, unread status, and urgency.

### `ContentListItem`
- Used for articles and content feeds.
- Prefer list rhythm over card repetition.

### `PreferenceToggleRow`
- Used for grouped settings.
- The label should be short and the helper should be optional.

### `TransactionRow`
- Used for wallet and finance history.
- Keep amount, status, and date clear.
- Money and currency must come from backend data.

## Screen Pattern Rules
Each major area should use a distinct but related pattern.

### Welcome / Login
- Focus on brand trust and auth hierarchy.
- Keep the screen simple.
- Use one clear primary action and one clear secondary path.
- Do not overload the screen with product explanation.

### Home
- This is a patient dashboard, not a stack of cards.
- Show the next important action first.
- Include useful summary sections, but avoid repetition.
- Prefer one strong hero area and a few high-value sections.

### Sessions
- The sessions area is the session center.
- Show status, timeline or history behavior, and the next action clearly.
- Use backend status translation only.
- Join action must follow backend availability only.

### Notifications
- This is an activity inbox.
- Keep the feed readable, categorized, and easy to scan.
- Do not turn it into a settings page.

### Notification Preferences
- Group settings by category.
- Do not expose a huge raw event list.
- Use concise labels with clear toggles.

### More / Profile
- This is a profile hub with grouped rows.
- Keep personal, account, help, and app settings separate.
- Avoid clutter and avoid duplicate entry points.

### Personal Info / Edit Profile
- Use a calm form surface.
- Show editable and disabled states clearly.
- Keep field helpers minimal.
- Only explain sensitive fields when needed.

### Wallet / Payments
- This is a financial trust surface.
- Present balances, history, and status clearly.
- Keep money presentation concise and accurate.
- Do not invent payment actions that do not exist in the product.

### Preferences / Language / Timezone
- Keep it simple.
- Use compact grouping and short labels.
- Make selection state obvious.

### Articles
- Use a content-list pattern.
- Avoid repeated cards as the default pattern.
- Make previews lightweight and scannable.

### Messages
- Treat messages as a real inbox.
- Show thread type, unread state, and status clearly.
- Do not hide the conversational context behind generic list noise.

### Training / Packages
- Present care products with value, progress, and status.
- Focus on what the user has, what remains, and what the next step is.

### Practitioner Profile
- This is a conversion screen.
- Trust indicators should be visible.
- CTA should be sticky or highly accessible when needed.
- Keep the page concise and service-led.

### Select Time / Booking
- Use a mobile-native booking flow.
- Date selection should feel like a carousel or compact picker.
- Slots should read as a list or grid of tappable options, not a desktop table.
- The flow should be quick and legible.

## Business Correctness Guardrails
These rules protect the app from incorrect UI behavior.

- Do not change backend contracts in this design phase.
- Do not infer session state in UI.
- Session status must come from backend `presentationStatus` and be translated.
- Join CTA appears only when backend `joinAvailability.canJoin` is true.
- Money and currency must come from backend data.
- Do not hardcode EGP, USD, SAR, or any other currency.
- Do not add payment actions unless they already exist in the current product.
- Do not add fake features from the design reference.
- Do not expose raw routes, raw enums, or raw internal identifiers to users.

## Do Not Do This
- Do not create long explanatory screens.
- Do not make every screen a stack of identical cards.
- Do not use random ECG or heart-pulse visuals.
- Do not invent healthcare features.
- Do not use admin or debug-like lists for patient UI.
- Do not hide important actions in visual noise.
- Do not make secondary actions compete with primary actions.
- Do not use raw keys, enums, or route strings in the UI.
- Do not hardcode currencies.
- Do not build desktop-like tables on mobile.
- Do not ignore RTL, LTR, or dark and light mode readiness.

## Implementation Phases
Do not redesign all screens in one pass. Each phase must be small, reviewable, and validated before moving to the next.

### Phase 0
Update `DESIGN.md` only.

### Phase 1
Theme tokens and primitive components.

### Phase 2
App shell: `AppScreen`, `AppHeader`, bottom tabs, safe areas, RTL and LTR support.

### Phase 3
Welcome, Login, Home.

### Phase 4
Sessions, `SessionCard`, Notifications.

### Phase 5
More / Profile, Personal Info / Edit Profile, Preferences.

### Phase 6
Wallet, Messages, Articles, Packages / Training.

### Phase 7
Practitioner Profile and Select Time / Booking.

### Phase 8
QA pass for Arabic and English, light and dark readiness, navigation correctness, and session and payment correctness.

## QA Checklist
Every UI phase must pass this checklist before it is considered complete:

- Arabic RTL inspected.
- English LTR inspected.
- Light mode inspected.
- Dark mode readiness checked.
- Header and bottom tabs consistent.
- Messages and notifications accessible where required.
- No raw keys, enums, or routes.
- No hardcoded currency.
- No overlong explanatory copy.
- Loading, empty, error, and disabled states handled.
- Touch targets accessible.
- TypeScript passes.
- Navigation still works.
- No backend contract changed.

## Rebrand Maintenance Rule

The platform was previously documented as `Sawiyaa`. New design work should use `Sawiyaa` / `Ø³ÙˆÙŠÙ‘Ø©` in brand-facing contexts.

Do not rename code folders, backend modules, app package identifiers, environment variables, or technical paths unless a separate engineering migration task explicitly requests it. This document controls visual identity and agent guidance, not repository renaming.

## Maintenance Rule
If a screen cannot be understood without a paragraph of explanation, the layout is probably wrong. Fix the structure first, then the copy.


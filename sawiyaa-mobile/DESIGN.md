# Sawiyaa Mobile Design System & Product Direction

> **Repository:** `D:\Web\full-projects\sawiyaa\sawiyaa-mobile`
>
> This document defines the permanent mobile design system, visual language, customer copy standards, and mobile interaction rules for the Sawiyaa Mobile App. It governs two first-class product experiences:
>
> ```text
> Sawiyaa Mobile App
> ├── Patient Experience
> └── Practitioner Experience
> ```

---

## 1. Product Experience North Star

Sawiyaa should feel like a calm, trusted human service.

The customer should feel:
- **I can talk comfortably.**
- **I understand what to do next.**
- **I can find someone suitable for me.**
- **My privacy is respected.**
- **Booking is easy.**
- **I am dealing with real trusted professionals.**
- **I am not navigating a complicated healthcare system.**

The experience should **NOT** feel like:
- hospital software
- ERP software
- an administrative healthcare portal
- a technical workflow engine
- a collection of disconnected features

**Ease and speed are core product principles.** The shortest safe path should normally win.

---

## 2. Primary Benchmark — Shezlong

**Shezlong** (https://www.shezlong.com/ar?target=%2Far%2Fhome) is the primary benchmark for:
- customer-facing language and emotional warmth
- screen hierarchy and human-centered presentation
- simple CTAs and early practitioner visibility
- trust-building and helping uncertain users choose
- low cognitive load and supportive Arabic wording

Sawiyaa should strongly learn from Shezlong's product communication model. This does **not** mean copying proprietary logos, illustrations, photography, or exact assets. We adopt the UX/copy school and product psychology while building a distinct, modern, premium Sawiyaa identity.

**Secondary Reference:** **Esaal** (https://esaal.me/home) serves as a secondary reference for conversion clarity and rapid decision pathways.

---

## 3. Customer Language

Never design customer-facing content around the internal word:
❌ `"مريض"`

Speak directly to the person (second-person language):
- Prefer: `"اختار المختص المناسب لك"` instead of `"اختيار المختص المناسب للمريض"`
- Prefer: `"جلساتك"` instead of `"جلسات المريض"`
- Prefer: `"رسائلك"` instead of `"رسائل المريض"`
- Prefer: `"حسابك"` instead of `"حساب المريض"`
- Prefer: `"مواعيدك"` instead of `"مواعيد المريض"`
- Prefer: `"محتاج مساعدة تختار؟"` instead of `"مسار توجيه المريض إلى المختص المناسب"`

---

## 4. Arabic Voice

Arabic should feel:
- **human**
- **calm**
- **warm**
- **simple**
- **respectful**
- **reassuring**
- **conversational without becoming slang-heavy**

Use clear Arabic close to everyday Egyptian/Arabic speech.
- Avoid overly formal institutional Arabic.
- Avoid technical product language.
- Avoid robotic wording.
- Avoid unnecessarily long explanations.

### Examples of Target Voice:
- `"مش عارف تبدأ منين؟ نساعدك."`
- `"اختار المختص المناسب لك."`
- `"اتكلم براحتك."`
- `"احجز في الوقت المناسب لك."`
- `"خصوصيتك محفوظة."`
- `"شوف الخبرة والتخصص والمواعيد قبل ما تحجز."`
- `"محتاج تتكلم دلوقتي؟ شوف المختصين المتاحين."`

---

## 5. Words & Patterns to Avoid

Avoid repeating product/technical concepts such as:
- ❌ `"مسار واضح"` / `"رحلة واضحة"` / `"سياق واضح"` / `"قواعد واضحة"`
- ❌ `"حالة الدفع واضحة"` / `"المعاينات الشكلية"` / `"إدارة رحلة الرعاية"` / `"مسار الرعاية"`
- ❌ Do not tell customers that the platform is "clear". **Make the experience clear.**
- ❌ Never expose payment state machines, runtime rules, chat eligibility constraints, system states, or backend failure terms in customer copy.

---

## 6. Do Not Diagnose the Customer

Customer copy must not assume diagnoses.
- Prefer: `"إيه اللي محتاج مساعدة فيه؟"` over language that assumes the customer knows a clinical diagnosis.
- A customer understands: **قلق، نوم، ضغط، علاقات، مشاكل أسرية، مشاكل أطفال، توتر، مزاج** before knowing clinical specialties.

---

## 7. Visual Direction & Quality Bar

The Sawiyaa visual system should be:
- **modern, calm, premium but approachable, highly readable, spacious, human-centered, emotionally safe.**
- Use strong hierarchy and intentional whitespace.
- Avoid excessive small cards and card walls.
- Avoid clutter and excessive competing CTAs.
- Practitioner faces and human imagery should have meaningful visual importance.
- Use the **Taste Skill** (`.agents/skills/taste-skill/SKILL.md`) as the implementation quality bar.

---

## 8. CTA Hierarchy

Each screen should have a clear primary action.
- Avoid multiple competing primary buttons.
- For discovery/patient experiences:
  - **Primary:** `"اختار مختص"`
  - **Secondary:** `"ساعدني أختار"`
- Practitioner login/switcher belongs in secondary navigation or dedicated screens, not as a competing hero CTA for customers.

---

## 9. Public & Discovery Experience Philosophy

Discovery flows should answer the customer's questions in roughly this order:
1. **هل المكان ده ممكن يساعدني؟** (Can this place help me?)
2. **أبدأ منين؟** (Where do I start?)
3. **مين الناس اللي ممكن أتكلم معاهم؟** (Who are the specialists I can talk to?)
4. **هل هم مناسبين وموثوقين؟** (Are they qualified and trustworthy?)
5. **الموضوع بيشتغل إزاي؟** (How does it work?)
6. **هل خصوصيتي محفوظة؟** (Is my privacy safe?)
7. **بكام وإمتى أقدر أحجز؟** (How much does it cost and when can I book?)
8. **ماذا أفعل إذا لم أعرف من أختار؟** (What if I don't know who to choose?)

---

## 10. Customer Application Philosophy

After authentication, the experience may become more functional but must stay human:
- Avoid turning the customer area into an admin dashboard.
- Prefer `"جلستك القادمة"` over `"Session status: READY_TO_JOIN"`.
- Prefer `"ادخل الجلسة"` over exposing technical state names.
- Customer screens should translate system state into human meaning.

---

## 11. Business Preservation Rule

> **"Before redesigning an existing Sawiyaa screen, preserve the screen's BUSINESS CONTRACT, not its current VISUAL IMPLEMENTATION."**

Every redesign begins with a business-function audit. Identify before changing:
- current APIs and hooks
- existing and hidden user actions
- route state and parameters
- permissions & auth guards
- backend states & transitions
- loading, error, and empty states
- booking, pricing, payment, session, and messaging rules

Do not remove functionality just because the current UI is visually poor. Business behavior is authoritative; frontend presentation may change radically around it.

---

## 12. Transformation Level

For customer/patient redesign tasks:
- **DO NOT default to minimum-change frontend edits.**
- The expected transformation is substantial.
- Old UI structures may be replaced when necessary.
- The agent should preserve business capabilities, NOT old visual architecture.
- *"Smallest coherent change"* refers to avoiding unrelated code churn. It does NOT mean keeping a weak UX.

The agent may:
- change screen composition & hierarchy
- change component structure & visual language
- move information & simplify presentation
- replace old cards/sections
- rewrite customer-facing copy
- reduce unnecessary UI noise
- create new mobile components

as long as the business capability remains intact.

---

## 13. No Fake UI

Never create controls that look functional but are not connected to real behavior. Do NOT add:
- fake filters, fake reviews, fake ratings, fake availability, fake practitioner counts, fake statistics, fake trust logos, fake testimonials, fake online status.

---

## 14. Localization & RTL/LTR

- Never solve Arabic redesign problems by hardcoding Arabic strings inside components.
- Use localization infrastructure (`i18next` / `react-i18next`).
- Respect both **Arabic (RTL)** and **English (LTR)**. Both languages must remain functional.
- Arabic is the primary design review language for this redesign.
- Use I18nManager / RTL-aware layouts. Directional indicators (chevrons, back arrows) must mirror correctly.

---

## 15. Native Mobile Interaction & Responsive Rules

- Mobile application must follow **native mobile interaction patterns** (touch targets >= 44x44, bottom sheets, safe area insets, keyboard-avoiding views, scroll dismiss).
- Do not force web page layouts into the mobile app.

---

## 16. Cross-Platform Consistency

Web and Mobile share:
- voice and Arabic copywriting tone
- terminology (no "مريض" in customer UI)
- emotional tone (calm, trusted, warm)
- CTA philosophy and mental model
- core color palette and brand identity

Implementation and layout remain native to each platform.

---

## 17. Important Sawiyaa Domain Rules

1. **Backend is Authoritative:** Business logic, access control, state transitions, and calculations originate from the backend.
2. **Internal Terminology:** Domain entities (e.g. `Patient`, `Practitioner`) remain intact in types, hooks, routes, and APIs.
3. **No Unapproved Business Changes:**
   - Practitioner publication and verification rules must NOT be changed.
   - Booking validation and slot calculation rules must NOT be changed.
   - Pricing rules and currency conversion must NOT be changed.
   - Session eligibility and room join rules must NOT be changed.
   - Messaging eligibility rules must NOT be changed.
   - Payment state machines must NOT be changed.
   - Authentication and authorization guards must NOT be weakened.

---

## 18. Mobile Platform Architecture & Tech Stack

- **Framework:** React Native 0.74.5, Expo SDK 51, React 18.2.0, TypeScript.
- **Routing:** Expo Router v3 (`app/(patient)/`, `app/(practitioner)/`, `app/(auth)/`, `app/(public)/`).
- **State Management:** Zustand (`zustand@4.5.2`), TanStack React Query (`@tanstack/react-query@5.28.9`).
- **Internationalization:** `i18next` & `react-i18next` (`src/i18n/`).
- **Typography:** Cairo (`Cairo-Regular`, `Cairo-Medium`, `Cairo-SemiBold`, `Cairo-Bold`), Outfit / Inter for Latin.
- **Theme & Design Tokens:** `src/constants/theme.ts` (colors, spacing, shadows, typography).
- **Core Components:** `src/components/ui/`, `src/components/mobile-shell/`, `src/features/`.
- **Safe Area & Display:** `react-native-safe-area-context`, `react-native-screens`, `expo-status-bar`.
- **Device & Storage:** `@react-native-async-storage/async-storage`, `expo-secure-store`.
- **Currency Support:** EGP and USD only (centralized money formatting in `src/components/money/`).
- **Brand Lock:** Strictly **Sawiyaa** / **سويّة** (English: `Sawiyaa`, Arabic: `سويّة`).

---

## 19. Visual Identity & Elevation

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
- No loud gradients, neon colors, heavy glassmorphism, or decorative medical clichés.
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

- `rgba(36, 86, 79, 0.06)` ≈ `#24564F0F`
- `rgba(36, 86, 79, 0.08)` ≈ `#24564F14`
- `rgba(36, 86, 79, 0.10)` ≈ `#24564F1A`

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

### User-facing error boundary

User-facing errors follow this boundary:

`backend error/code → normalized diagnostic classification → localized product message → optional user action`

The foundational presentation contains only a localized message key, retryability, an optional action, and a diagnostic code. Raw backend messages, provider names, payload details, and implementation terminology remain diagnostic only. A raw backend `message` or `error` must never be the generic user-facing fallback.

### Canonical product vocabulary

Use `Schedule / My schedule` (`الجدول / جدولي`) for practitioner availability, `Discover` (`اكتشف`) for the patient discovery destination, `Specialist` (`مختص`) for the generic practitioner role, `History` (`السجل`) for past sessions, `Transactions` (`المعاملات`) for financial activity, `Earnings` (`الأرباح`) for practitioner earnings, `Transfers` (`التحويلات`) for external payouts, and `Wallet` (`المحفظة`) for wallet balance/activity. Do not expose `Ledger` as a product concept or technical timezone identifiers in normal UI.

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

### Directional icon guardrail

- User-facing navigation icons must express semantic direction: `back`, `forward`, `previous`, `next`, or `disclosure`.
- Locale-sensitive navigation must use the central directional icon resolver. Direct `ArrowLeft`, `ArrowRight`, `ChevronLeft`, or `ChevronRight` usage is forbidden outside that resolver.
- Non-directional semantic icons must not be mirrored merely because the locale is RTL. This includes status, trend, calendar, clock, upload/download, payment, lock, check, close, and refresh icons unless their product meaning is explicitly directional.
- Do not double-mirror an icon through both semantic component selection and a transform/layout mirror.
- Any new directional navigation component must include focused RTL and LTR coverage for its semantic states.

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
- Lifecycle state and action eligibility come from the current backend `operational` contract.
- Use `operational.state`, `operational.timelineBucket`, `operational.reasonCode`, and the supplied `operational.join`, `operational.actions`, `operational.room`, and `operational.resolution` capabilities.
- Join, runtime preparation, payment, cancellation, review, and no-show CTAs must use the relevant backend-provided capability; never derive eligibility from local time or display fields.

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

### Practitioner Schedule foundation

The approved Schedule workflow is:

`My Schedule → current week → selected day → All / 30 min / 60 min → relevant slots → available/booked/protected meaning → compact summary → Add Times`

Select Today by default when entering the current week. Preserve the week, selected day, and active duration filter after contextual add/edit/remove/save actions whenever still valid. Recurrence is secondary. Human timezone presentation is required.

Custom ranges are a mobile convenience that generates the existing discrete 30/60-minute slot payload client-side. Validate end > start, duration boundaries, overlap, booked/protected safety, and backend constraints. Do not invent arbitrary durations or add a new backend range contract.

## Business Correctness Guardrails
These rules protect the app from incorrect UI behavior.

- Do not change backend contracts in this design phase.
- Do not infer session state in UI.
- Session lifecycle and business eligibility must come from the current backend operational contract and endpoint-specific capability responses.
- The current client contract exposes `operational.state`, `operational.timelineBucket`, `operational.reasonCode`, `operational.join`, `operational.actions`, `operational.room`, and `operational.resolution`; use those fields as supplied.
- For joining, use the current join contract/capabilities such as `operational.join.allowed`, `operational.join.canPrepareRuntime`, and the join response's `canJoin`, `blockedReason`, `availableAt`, `expiresAt`, and room/runtime fields.
- For other actions, use the supplied `operational.actions.canJoin`, `canPrepareRuntime`, `canCancel`, `canPay`, `canReview`, and `canMarkPatientNoShow` capabilities, or the role-specific action contract where provided.
- Legacy `status`, `presentationStatus`, and other display-only fields must not be promoted back into business authority. `joinAvailability` is not the current client contract.
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

## Source-of-Truth Boundaries

- `DESIGN.md` defines durable design and product principles.
- `SAWIYAA_MOBILE_PRODUCT_UX_TRACKER.md` owns implementation phases, status, execution order, and completion tracking.

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

## Brand Maintenance Rule

Use the current `Sawiyaa` / `سويّة` brand in brand-facing contexts.

Do not rename code folders, backend modules, app package identifiers, environment variables, or technical paths unless a separate engineering migration task explicitly requests it. This document controls visual identity and agent guidance, not repository renaming.

## Maintenance Rule
If a screen cannot be understood without a paragraph of explanation, the layout is probably wrong. Fix the structure first, then the copy.


# Sawiyaa Web Design System

## 1. Brand Identity & Positioning

Sawiyaa (**سويّة**) is a warm, premium, and human wellbeing ecosystem, care marketplace, and wellness coaching platform.

* **Arabic Name:** سويّة
* **English Name:** Sawiyaa
* **Official Domain:** `sawiyaa.com`
* **Core Tagline EN:** *Care for mind, body, and balance*
* **Core Tagline AR:** *رعاية للعقل والجسم والتوازن*

### Positioning Tone
Sawiyaa is **not** a cold, clinical hospital portal, nor is it a biometrics dashboard or a commercial fitness tracker. It is a premium space for guided care, mental health coaching, nutrition, and personal balance. 
The visual and user experience of the web application must feel:
* **Calm & Warm:** Soft, organic backgrounds and generous spacing instead of sterile clinic gray or harsh SaaS interfaces.
* **Premium & Trustworthy:** Refined typography, subtle shadows, and intentional gold details.
* **Human-Centered:** Readable microcopy, clean layouts for patients under stress, and clear next steps.
* **Arabic-First:** Fully native right-to-left alignment, typographic balance, and mirrored visuals that feel natural rather than simply translated.

---

## 2. Official Web Palette

The web app uses the official Sawiyaa brand palette to maintain consistency with the mobile application:

| Variable Token | Color Name | HEX Code | Primary Web Usage |
| :--- | :--- | :--- | :--- |
| `primary` | Deep Teal | `#24564F` | Main brand identity, logo accents, primary buttons, major headings, active menu highlights. |
| `secondary` | Soft Sage | `#A7BFAE` | Supportive icons, secondary decorative elements, quiet border highlights. |
| `background` | Warm Ivory | `#F7F4EE` | Main page background (default web app backdrop). |
| `background-light`| Soft Page Background| `#FBF9F5` | Secondary landing sections or lighter public marketing areas. |
| `card` | Pure White | `#FFFFFF` | Core panels, active modals, elevated grid surfaces. |
| `card-warm` | Warm Card | `#FCFAF6` | Secondary panels, info boards, sidebars, and read-only content segments. |
| `sand` | Muted Sand | `#E6D6B8` | Structural separators, borders, outline treatments. |
| `accent` | Warm Gold | `#C8A979` | Restrained high-end accents (dots, indicators, small rating stars, focus highlights). |
| `green-light` | Green Tint Light | `#D9E4DB` | Light green surfaces, alert backdrops, and active soft buttons. |
| `green-surface` | Green Surface | `#EEF4EF` | Badges, filter pills, hover states, and background highlights. |
| `text-main` | Main Text | `#1C2F2B` | Body copy, dark buttons labels, primary field values. |
| `text-muted` | Muted Text | `#61716C` | Descriptions, timestamps, field labels, placeholder values. |
| `border-soft` | Soft Border | `#E6D6B8` | Card outlines, input borders, panel separators. |

---

## 3. Current Web Theme Gap (globals.css)

The current CSS configuration in [globals.css](file:///d:/Web/full-projects/fayed/fayed-frontend-v1/src/app/globals.css) utilizes legacy Fayed theme variables that are cold and out of sync with the new visual identity:

### Gaps to Rectify in Next Phases:
1. **Primary Palette:** `--primary` is currently `#44a194` (a bright, digital teal) and must be updated to the premium brand Deep Teal `#24564F`.
2. **Background Color:** `--background` is currently `#edf1f5` (a cold, gray-blue) and must be aligned to the Warm Ivory `#F7F4EE`.
3. **Typography Colors:** The text parameters (`--text-primary` at `#1f2a2d` and `--text-secondary` at `#56656b`) are cold slate tones. They must be updated to the warm slate-greens `#1C2F2B` (Main Text) and `#61716C` (Muted Text).
4. **Card system & borders:** Borders currently utilize gray shades (`#d9e0e6` / `#c5ced6`) which must be replaced with warm Muted Sand (`#E6D6B8`) and soft Warm Ivory borders (`#E8DED0`).

> [!WARNING]
> Do NOT modify `globals.css` in Phase Web-0. Only record this gap analysis for Phase Web-1 execution.

---

## 4. Web Layout Principles

* **Responsive Adaptation:** Layouts are desktop-first (with grid systems and generous side margins) but must gracefully collapse into tablet and mobile viewports.
* **Auth Layout:** Keep these views extremely clean and centered. Surfaces must utilize Warm Card backgrounds (`#FCFAF6`) and soft borders to instill calmness and security during registration/login.
* **Patient Portal Shell:** The dashboard must resemble a wellness care center, not an ops console. Avoid heavy sidebar boxes, neon metric graphs, or tabular gray boxes. Leverage clean spacing, round avatars, and soft badge components.
* **Warmth over Slate:** Cards must stay pure white (`#FFFFFF`) with warm outlines (`#E8DED0`), sitting over Warm Ivory (`#F7F4EE`) background. Never use cold blue-gray panels.
* **No SaaS Clichés:** Do not use heavy black dropshadows, dense borders, or bright neon gradients. All depth must use the soft brand shadow: `0 8px 24px rgba(36, 86, 79, 0.08)`.

---

## 5. RTL/LTR Design & Mirroring Rules

Both Arabic (RTL) and English (LTR) layouts are treated as first-class citizens. To avoid hardcoded layout biases, the web app must follow logical CSS spacing properties:

### CSS Logical Properties Strategy
* **Margins:** Use `margin-inline-start` and `margin-inline-end` (or Tailwind `ms-*` / `me-*`) instead of `margin-left` / `margin-right`.
* **Padding:** Use `padding-inline` (or Tailwind `px-*` / `ps-*` / `pe-*`) instead of `padding-left` / `padding-right`.
* **Borders:** Use `border-inline-start` and `border-inline-end` instead of `border-left` / `border-right`.
* **Alignment:** Use `text-align: start` and `text-align: end` instead of `left` / `right`.

### Direction-Aware Elements
* **Chevrons & Arrows:** Interactive directional indicators (e.g., pagination, slide controls, CTA arrows, breadcrumbs) must mirror:
  * LTR: Point right (`→`, chevron-right).
  * RTL: Point left (`←`, chevron-left).
* **Sidebar Layout:** The navigation sidebar is pinned to the **left** in English (LTR) and to the **right** in Arabic (RTL).
* **Form Alignment:** Labels must sit directly above inputs, aligned to the start of the field (left in LTR, right in RTL).
* **Rhythm:** Arabic text requires slightly larger line-heights (`leading-relaxed` or `leading-loose`) to prevent diacritics from colliding.

---

## 6. Web Components Rules

### A. App Shell & Layout
* **Patient Sidebar:** Warm Card surface (`#FCFAF6`), Soft Border (`#E8DED0`). Active link states must use Deep Teal text (`#24564F`) with Green Surface backdrop (`#EEF4EF`).
* **Header/Topbar:** Minimal height, frosted glass backdrop (`backdrop-filter`) with Warm Ivory undertones. Show logo, translation switcher, and user avatar.

### B. Cards & Panels
* White background (`#FFFFFF`), generous rounded corners (`rounded-[20px]`), and soft tonal brand shadow (`shadow-sawiyaa-card`).
* Accent lines (if used) must be a subtle Warm Gold (`#C8A979`) line (maximum 3px thick) on the leading edge (left in LTR, right in RTL).

### C. Buttons
* **Primary:** Deep Teal background (`#24564F`), white text (`#FFFFFF`). Hover state: Slightly darker teal (`#1F4A44`).
* **Secondary:** Transparent background, Deep Teal border (`#24564F`), Deep Teal text (`#24564F`). Hover state: Green Surface background (`#EEF4EF`).
* **Interactive States:** Active/focused buttons must have an accent gold border (`#C8A979`) or soft outer ring shadow (`focus:ring-2 focus:ring-sawiyaa-primary/20`).

### D. Inputs & Forms
* Soft border (`#E8DED0`), white background, text-main input color. On focus, border must animate to Deep Teal (`#24564F`) with a subtle ring.

### E. Tabs & Filters
* Pill-shaped filters: Active pills use Deep Teal (`#24564F`) with white text. Inactive pills use Green Surface (`#EEF4EF`) or Warm Card (`#FCFAF6`) with text-muted.

### F. Loading, Empty, & Error States
* **Loading:** Use calm skeleton indicators with soft gray-sage pulsing, not raw spinners.
* **Empty:** A single clear heading, a desaturated illustration or icon, a 1-line friendly description, and a single primary action button.
* **Error:** Soft warning card using error-soft backdrop (`#F8E8E6`), explaining the issue clearly with a "Retry" CTA.

### G. Avatars & Fallbacks
* Circular avatar. If image loading fails, fall back to assets `/images/user.avif` or initial-less placeholder graphic. Never output bare initials like "U" or "P".

---

## 7. Business Correctness Guardrails

To protect the application from data anomalies and compliance bugs, we strictly enforce these rules:

* **Source of Truth:** All content (doctor names, slots, profile data) must come directly from backend endpoints/hooks.
* **Zero Dummy Data:** Never invent prices, reviews, names, or addresses.
* **Raw Enum Safety:** Translate all backend status keys (e.g. `PENDING`, `BOOKED`, `COMPLETED`) via localization files (`ar.json`, `en.json`) before rendering. Never show raw strings to the user.
* **Strict Currency Constraint:**
  * Supported currencies are **EGP** and **USD** only.
  * Render currency using backend formatting or regional configuration helpers (never hardcode `ج.م`, `EGP`, `$`, or `USD` in JSX).
  * Do **NOT** mention SAR, `ريال`, `ر.س`, or any Saudi Arabian currencies anywhere in the code or mockups.
* **Brand Lock:** The brand is strictly **Sawiyaa** / **سويّة**. The old name **Fayed** / **فايد** must not be shown in any patient-facing header, copy, or page text.

---

## 8. Web Implementation Phases

We break down the visual restructuring of the web front-end into 10 structured phases:

* **Phase Web-0:** Establish `DESIGN.md` (Current Phase).
* **Phase Web-1:** Update `src/app/globals.css` with the new Sawiyaa CSS color variables and Tailwind configurations.
* **Phase Web-2:** Restructure common primitive components (Buttons, Cards, Inputs, Avatar, Badges).
* **Phase Web-3:** Update authentication screens (login, signup) and public pages (landing, search).
* **Phase Web-4:** Restructure patient app shell layout, top headers, dynamic sidebar, and translation selectors.
* **Phase Web-5:** Restructure Patient Home dashboard page (Hero banner, quick actions rail, list cards).
* **Phase Web-6:** Patient Session timelines, calendars, booking flows, and appointment summaries.
* **Phase Web-7:** Patient Wallet, payments flow, Packages, and Academy views.
* **Phase Web-8:** Support ticket page, chat thread interfaces, message indicators.
* **Phase Web-9:** Full translation pass, keyboard focus verification, and responsiveness checking.

---

## 9. Phase QA Checklist

Every phase of the web visual enhancement must be validated against the following criteria:

* [ ] **Arabic RTL:** Layout, margins, paddings, borders, icons, navigation, form alignments mirror correctly.
* [ ] **English LTR:** Alignment and readable fonts render correctly.
* [ ] **Brand Lock:** Brand is strictly `Sawiyaa` / `سويّة`. No occurrences of `Fayed` or `فايد` in copy.
* [ ] **Data Safety:** Zero exposure of raw enum values, undefined fields, null objects, or `[object Object]` strings.
* [ ] **Currency Compliance:** Currency is only resolved to EGP or USD. No references to SAR (`ر.س` / `ريال`).
* [ ] **Responsive Design:** Visually correct on Large Desktop, Small Desktop, Tablet, and Mobile devices.
* [ ] **Accessibility:** Clean keyboard focus rings, readable contrast ratios, logical component focus orders.
* [ ] **State Integrity:** Component accounts for Loading states, Empty states, and Error/Failure states.
* [ ] **Business Safety:** Underlying backend routes, API contracts, hooks, and routing behavior are left unchanged.

---

## 10. Motion, Loading, & Accessibility Principles

To maintain a calm, premium, and human wellbeing ecosystem, all visual feedback and screen transitions must follow these styling rules:

### A. Motion Personality
* Movement in **Sawiyaa** must feel quiet, soft, premium, and comfortable.
* **Never** use bouncy, flashy, or elastic animation properties.
* Avoid large, dramatic scale changes or distracting translations.
* Animations should serve purely to explain system states and actions, never for showcase or style over function.

### B. Loading Skeleton Rules
* All Skeletons must match the exact dimensions, spacing, and shapes of the real content they replace to avoid visual layout shifts.
* **No generic gray blocks**: Avoid cold gray surfaces. Instead, utilize warm brand color variables:
  * Base backgrounds: `Warm Card` (`--surface-tertiary`) / `Green Surface` (`--primary-light`) / `Warm Ivory` (`--background`).
  * Shimmer overlay: `Soft Sage` (`--secondary`) or light green tint overlays.
* **Zero Dummy Timers**: Skeletons must only render during genuine hook-driven loading states. Never introduce simulated delays or `setTimeout` calls to show skeletons.

### C. Reusable Motion Utilities
The following classes are exposed in `globals.css` for app-wide consistency:
* `sawiyaa-skeleton`: Shimmering gradient indicator mapping warm card and primary light states.
* `sawiyaa-hover-lift`: Gentle upward card translations with soft brand borders and light Deep Teal shadows.
* `sawiyaa-btn-press`: Visual active feedback scale-down for clickable elements.
* `sawiyaa-animate-fade-in`: Tonal opacity and slight translation entrance effect.

### D. Timing & Easing
* Micro-interactions (hover, click, focus) must execute within **150ms to 240ms**.
* Page and card entrance animation must remain extremely subtle (e.g. opacity transition combined with small vertical translation).
* Easing functions must favor a natural deceleration curve (such as out-quintic `cubic-bezier(0.16, 1, 0.3, 1)`).

### E. Reduced Motion Support
Respect the browser's Accessibility preferences through media queries. If `prefers-reduced-motion: reduce` is enabled:
* The shimmer animation on `.sawiyaa-skeleton` must stop immediately and display a static background.
* The translation and shadow expansion on `.sawiyaa-hover-lift` must be disabled.
* The scaling effect on `.sawiyaa-btn-press` active states must be disabled.
* Page entrance animations (`.sawiyaa-animate-fade-in`) must instantly display at full opacity without movement.

### F. Accessibility & Focus States
* Focus rings must remain fully visible and distinct (`focus:ring-2 focus:ring-primary/20`) to support keyboard navigation.
* Interactive motions must never overlay, hide, or block content from interactive users.
* Loading state wrappers must remain clear and understandable.

### G. Patient Home Pilot
The first pilot application of these principles is implemented on the patient portal screen:
* [PatientJourneyScreen.tsx](file:///d:/Web/full-projects/fayed/fayed-frontend-v1/src/features/patient-journey/components/PatientJourneyScreen.tsx)
* Uses a custom `<PatientJourneySkeleton />` mapping the exact layout block-by-block.
* Appends `sawiyaa-hover-lift` on cards and `sawiyaa-btn-press` on CTAs.
* Wraps the loaded template in a `sawiyaa-animate-fade-in` container.


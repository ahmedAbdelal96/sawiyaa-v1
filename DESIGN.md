---
name: Fayed Healthcare Platform
description: Professional healthcare platform connecting patients with practitioners
colors:
  primary: "#44a194"
  primary-hover: "#3d9286"
  primary-active: "#357f74"
  primary-light: "#e8f4f2"
  primary-light-hover: "#d9eeea"
  secondary: "#8fc6bf"
  secondary-hover: "#7fbab2"
  accent: "#e4f2f0"
  accent-hover: "#d8ece8"
  text-brand: "#357f74"
  text-primary: "#1f2a2d"
  text-secondary: "#56656b"
  text-muted: "#7a8891"
  background: "#edf1f5"
  surface: "#ffffff"
  surface-secondary: "#ffffff"
  surface-tertiary: "#f7f9fb"
  border-light: "#d9e0e6"
  border-strong: "#c5ced6"
  border-focus: "#44a194"
  error: "#f04438"
  error-light: "#fef3f2"
  warning: "#f79009"
  warning-light: "#fffaeb"
  success: "#12b76a"
  success-light: "#ecfdf3"
  gray-50: "#f8fafb"
  gray-100: "#edf1f5"
  gray-200: "#d9e0e6"
  gray-300: "#c5ced6"
  gray-400: "#98a3ad"
  gray-500: "#7c8791"
  gray-600: "#626d77"
  gray-700: "#4e5963"
  gray-800: "#39434d"
  gray-900: "#27313a"
typography:
  display:
    fontFamily: "Outfit, sans-serif"
    fontWeight: 600
    lineHeight: 1.1
  headline:
    fontFamily: "Outfit, sans-serif"
    fontWeight: 600
    lineHeight: 1.2
  title:
    fontFamily: "Outfit, sans-serif"
    fontWeight: 500
    lineHeight: 1.3
  body:
    fontFamily: "Outfit, sans-serif"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Outfit, sans-serif"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "#44a194"
    textColor: "#ffffff"
    rounded: "8px"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "#3d9286"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "#56656b"
  card:
    backgroundColor: "#ffffff"
    rounded: "12px"
    padding: "24px"
  input:
    backgroundColor: "#ffffff"
    borderColor: "#d9e0e6"
    rounded: "8px"
    padding: "12px 16px"
---

# Design System: Fayed Healthcare Platform

## 1. Overview

**Creative North Star: "Clinical Warmth"**

A healthcare platform that feels professionally credible yet warmly approachable. The system balances clinical trustworthiness with human warmth - avoiding both the cold sterility of traditional medical software and the over-styled aesthetics of generic SaaS. Every element communicates calm competence.

The design explicitly rejects: generic startup aesthetics, gamified healthcare apps, cluttered medical dashboards, and over-stylized interfaces. Healthcare decisions are serious; the interface should feel serious but not stiff.

**Key Characteristics:**
- Teal/sage primary palette conveys calm and healing
- Outfit typeface provides modern, friendly readability
- Flat surfaces by default with subtle shadows on interaction
- Refined, restrained components that don't shout for attention
- Generous whitespace that breathes and reduces cognitive load
- Arabic-first support with full RTL consideration

## 2. Colors

**The Calm Confidence Rule.** Primary accent (#44a194) is used for primary actions and key interactions. Its rarity is the point - it signals importance without overwhelming.

### Primary
- **Calm Sage** (#44a194): Primary brand color. Buttons, links, active states, key CTAs. Chosen for healthcare appropriateness - teal signals trust, healing, and calm.
- **Calm Sage Dark** (#3d9286): Hover state for primary elements.
- **Calm Sage Deep** (#357f74): Active/pressed state.

### Secondary
- **Soft Seafoam** (#8fc6bf): Secondary actions, supporting elements, decorative accents. Warm enough to feel approachable, muted enough to stay professional.

### Neutral
- **Charcoal** (#1f2a2d): Primary text. Not pure black - softened toward warmth.
- **Slate** (#56656b): Secondary text, supporting content.
- **Muted Gray** (#7a8891): Tertiary text, placeholders, disabled states.
- **Light Border** (#d9e0e6): Subtle dividers, input borders.
- **Surface White** (#ffffff): Card backgrounds, input fields, modals.

### Semantic
- **Success Green** (#12b76a): Positive feedback, confirmations.
- **Warning Amber** (#f79009): Alerts, cautions, pending states.
- **Error Red** (#f04438): Errors, destructive actions, validation failures.

### Dark Mode
All colors invert appropriately with increased contrast and opacity-based transparency for depth. Primary shifts to #63c9bc for better dark-mode visibility.

## 3. Typography

**Font Family:** Outfit (sans-serif)

**Character:** Clean, modern, and friendly without being playful. Outfit's geometric yet warm construction suits healthcare - professional enough for clinical contexts, approachable enough for patient-facing interfaces.

### Hierarchy
- **Display** (600 weight, 48-72px): Hero headlines, marketing sections.
- **Headline** (600 weight, 30-36px): Page titles, major section headers.
- **Title** (500 weight, 20-24px): Card titles, list headers, navigation.
- **Body** (400 weight, 14-16px): Primary content, descriptions, form labels.
- **Label** (500 weight, 12-14px): Buttons, badges, small UI text.

**The Readability Rule.** Body text max line length capped at 65-75ch for optimal scanning. Healthcare content requires clear information hierarchy.

## 4. Elevation

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to state (hover, focus, active). This keeps the interface calm and prevents visual noise.

### Shadow Vocabulary
- **Subtle** (`0px 1px 3px rgba(16,24,40,0.08)`): Minor depth, tooltips, small elements.
- **Card** (`0px 4px 8px -2px rgba(16,24,40,0.08)`): Standard card elevation, hover states.
- **Modal** (`0px 12px 16px -4px rgba(16,24,40,0.06)`): Dialogs, overlays, high-priority surfaces.

**The Layered Depth Rule.** Rather than heavy shadows, depth is conveyed through tonal layering - surface-tertiary backgrounds, subtle border distinctions, and opacity variations.

## 5. Components

### Buttons
- **Shape:** Rounded corners (8px radius)
- **Primary:** #44a194 background, white text, 12px 24px padding
- **Hover:** #3d9286 background, subtle lift with card shadow
- **Focus:** #44a194 ring with 0.18 opacity glow
- **Ghost/Secondary:** Transparent with #56656b text, subtle hover background

### Cards
- **Corner Style:** 12px radius
- **Background:** Pure white (#ffffff)
- **Shadow Strategy:** Flat by default; subtle card shadow on hover only
- **Border:** None (rely on surface differentiation)
- **Internal Padding:** 24px

### Inputs / Fields
- **Style:** White background, #d9e0e6 border, 8px radius
- **Padding:** 12px 16px
- **Focus:** Border shifts to #44a194 with focus ring glow
- **Error:** Red border (#f04438) with error-light background tint
- **Disabled:** Reduced opacity (0.5), subtle gray background

### Navigation
- **Style:** Clean text links with hover underline
- **Active State:** Primary color (#44a194) with subtle background tint
- **Mobile:** Touch-friendly 44px minimum tap targets

## 6. Do's and Don'ts

### Do:
- **Do** use the Calm Sage primary (#44a194) for primary actions and key interactions.
- **Do** keep surfaces flat by default, adding shadow only on hover or focus.
- **Do** use generous whitespace (24px+) between content sections.
- **Do** maintain 4.5:1 contrast ratio for all text.
- **Do** support Arabic RTL - layout must flip correctly.
- **Do** use Outfit font consistently across all interfaces.

### Don't:
- **Don't** use bright or neon accent colors (healthcare must feel calm).
- **Don't** add glassmorphism or heavy blurs (distracts from clarity).
- **Don't** use border-left/right colored stripes as accents (anti-pattern).
- **Don't** create identical card grids with same-sized repeating cards.
- **Don't** use modals as first-resort for information (prefer inline/flyout).
- **Don't** animate layout properties (causes jank; animate opacity/transform only).
- **Don't** use gradient text for decoration (use weight/size for emphasis).
- **Don't** create "hero metric" templates with big numbers and gradient accents.
- **Don't** make it feel like generic SaaS - this is healthcare, not a productivity tool.
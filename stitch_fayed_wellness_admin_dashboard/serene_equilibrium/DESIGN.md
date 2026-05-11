---
name: Serene Equilibrium
colors:
  surface: '#f6faf8'
  surface-dim: '#d7dbd9'
  surface-bright: '#f6faf8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f2'
  surface-container: '#ebefec'
  surface-container-high: '#e5e9e7'
  surface-container-highest: '#dfe3e1'
  on-surface: '#181c1b'
  on-surface-variant: '#3e4947'
  inverse-surface: '#2d3130'
  inverse-on-surface: '#eef2ef'
  outline: '#6e7977'
  outline-variant: '#bdc9c6'
  surface-tint: '#006a60'
  primary: '#006a60'
  on-primary: '#ffffff'
  primary-container: '#44a194'
  on-primary-container: '#00322c'
  inverse-primary: '#7cd6c8'
  secondary: '#526167'
  on-secondary: '#ffffff'
  secondary-container: '#d5e5ec'
  on-secondary-container: '#58676d'
  tertiary: '#914a35'
  on-tertiary: '#ffffff'
  tertiary-container: '#d07d64'
  on-tertiary-container: '#511a08'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#98f3e4'
  primary-fixed-dim: '#7cd6c8'
  on-primary-fixed: '#00201c'
  on-primary-fixed-variant: '#005048'
  secondary-fixed: '#d5e5ec'
  secondary-fixed-dim: '#b9c9d0'
  on-secondary-fixed: '#0f1e23'
  on-secondary-fixed-variant: '#3a494f'
  tertiary-fixed: '#ffdbd1'
  tertiary-fixed-dim: '#ffb59f'
  on-tertiary-fixed: '#3a0a00'
  on-tertiary-fixed-variant: '#743420'
  background: '#f6faf8'
  on-background: '#181c1b'
  surface-variant: '#dfe3e1'
typography:
  headline-xl:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 0.5rem
  sm: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  gutter: 24px
  margin: 32px
---

## Brand & Style

This design system is built for a mental health context, prioritizing emotional safety and professional reliability. The style is a refined **Corporate/Modern** aesthetic with a strong lean toward **Minimalism**. It eschews the frantic energy of typical SaaS platforms in favor of wide open spaces, soft transitions, and a grounding "healthcare-friendly" color palette.

The brand personality is empathetic but clinical, designed to reduce cognitive load for both patients and practitioners. The interface uses high-quality white space and subtle sage accents to create a sense of breathability. All visual elements are optimized for an RTL-friendly architecture to ensure seamless localized experiences in diverse markets.

## Colors

The palette revolves around a calming Sage Green primary color, which provides a natural, organic anchor for the platform. 

- **Primary:** Use #44A194 for call-to-action buttons, active states, and critical brand identifiers.
- **Background:** The #EDF1F5 light gray serves as the "stage," providing enough contrast to make white surface cards feel elevated and clean.
- **Surface:** Pure White (#FFFFFF) is reserved for interactive cards, data tables, and modal containers to highlight focus areas.
- **Neutral Scale:** Dark Neutral (#1F2A2D) is used for high-readability headers; Secondary (#56656B) for body text; and Muted (#7A8891) for labels, placeholders, and deactivated states.

## Typography

**Manrope** is selected for this design system for its geometric clarity combined with a warm, humanistic touch. It strikes the perfect balance between the precision required for healthcare and the friendliness required for wellness.

- **Headlines:** Use tighter letter-spacing and semi-bold weights to establish a confident hierarchy.
- **Body:** Standard body text is set to 16px to ensure accessibility for all users, including those in high-stress states.
- **Labels:** Use medium or semi-bold weights in a slightly smaller size for form labels and navigation items to distinguish them from reading content.

## Layout & Spacing

This design system utilizes a **Fixed Grid** approach for administrative dashboards and a **Fluid Grid** for patient-facing content. 

- **Grid:** A 12-column grid system is used for desktop. On tablet, this transitions to 8 columns, and on mobile, to 4 columns.
- **Gutter & Margins:** Consistent 24px gutters ensure content never feels cramped. Desktop margins are set to 32px or greater to allow the UI to "breathe."
- **Alignment:** All layouts must be built with logical properties (e.g., `margin-inline-start` instead of `margin-left`) to support RTL languages natively without codebase duplication.
- **Rhythm:** Spacing follows a 4px baseline, though primary increments are 8px to maintain a clean, organized visual structure.

## Elevation & Depth

Visual hierarchy in this design system is achieved through **Tonal Layers** combined with **Ambient Shadows**.

- **Depth Levels:**
    - **Level 0 (Background):** #EDF1F5. Flat.
    - **Level 1 (Cards/Tables):** #FFFFFF. Soft, extra-diffused shadow with a subtle Sage tint (e.g., `rgba(68, 161, 148, 0.08)`).
    - **Level 2 (Dropdowns/Popovers):** #FFFFFF. Slightly more pronounced shadow to indicate temporary interaction layers.
    - **Level 3 (Modals):** High-diffusion shadow with a 20% backdrop blur on the underlying content to focus user attention.

Avoid heavy black shadows. The goal is to make elements appear as though they are gently floating above the gray background rather than being pressed against it.

## Shapes

The shape language is consistently **Rounded**, avoiding sharp corners that can feel aggressive or overly clinical.

- **Components:** Standard buttons, input fields, and small cards use a 0.5rem (8px) radius.
- **Large Containers:** Dashboard widgets and main content sections use `rounded-lg` (16px) or `rounded-xl` (24px) for a softer, friendlier appearance.
- **Data Points:** Status indicators and avatars should be fully circular (pill-shaped) to provide visual variety against the structured grid.

## Components

- **Buttons:** Primary buttons use the Sage Green background with white text. Secondary buttons use a Sage Green outline with sage text. Buttons have a height of 48px for high touch-targets.
- **Inputs:** Use white backgrounds with a subtle 1px border in #EDF1F5. On focus, the border transitions to Sage Green with a soft outer glow.
- **Cards:** White surfaces with a 16px corner radius. Padding within cards should be generous (min 24px) to ensure a premium, spacious feel.
- **Chips:** Used for categorizing health topics or session tags. These should have a very light Sage background (`#44A194` at 10% opacity) with dark sage text.
- **Progress Indicators:** Use soft, rounded bars. Avoid thin lines; a 6px or 8px height feels more substantial and calming.
- **Admin Tables:** Use clean rows with no vertical borders. Horizontal borders should be very light (#EDF1F5) to maintain the minimalist aesthetic.
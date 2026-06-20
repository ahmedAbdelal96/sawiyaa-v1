---
name: Clinical Warmth
colors:
  surface: '#f5fafa'
  surface-dim: '#d5dbda'
  surface-bright: '#f5fafa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff5f4'
  surface-container: '#e9efee'
  surface-container-high: '#e4e9e9'
  surface-container-highest: '#dee4e3'
  on-surface: '#171d1d'
  on-surface-variant: '#3d4949'
  inverse-surface: '#2c3131'
  inverse-on-surface: '#ecf2f1'
  outline: '#6d7a79'
  outline-variant: '#bcc9c9'
  surface-tint: '#00696b'
  primary: '#00696b'
  on-primary: '#ffffff'
  primary-container: '#00a4a6'
  on-primary-container: '#003233'
  inverse-primary: '#5cd8da'
  secondary: '#5e5f5d'
  on-secondary: '#ffffff'
  secondary-container: '#e0e0dd'
  on-secondary-container: '#626361'
  tertiary: '#5f5e5e'
  on-tertiary: '#ffffff'
  tertiary-container: '#959393'
  on-tertiary-container: '#2d2c2c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#7cf5f7'
  primary-fixed-dim: '#5cd8da'
  on-primary-fixed: '#002020'
  on-primary-fixed-variant: '#004f50'
  secondary-fixed: '#e3e2e0'
  secondary-fixed-dim: '#c7c6c4'
  on-secondary-fixed: '#1a1c1a'
  on-secondary-fixed-variant: '#464745'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474746'
  background: '#f5fafa'
  on-background: '#171d1d'
  surface-variant: '#dee4e3'
  mint-accent: '#E8F5F1'
  cream-accent: '#FFF9EE'
  blue-accent: '#E8F1F8'
  amber-accent: '#FFF3E0'
  alert-red: '#FCECEC'
typography:
  display-lg:
    fontFamily: Source Serif 4
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 42px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Source Serif 4
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Source Serif 4
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Source Sans 3
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Source Sans 3
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Source Sans 3
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Source Sans 3
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  display-lg-mobile:
    fontFamily: Source Serif 4
    fontSize: 28px
    fontWeight: '700'
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
  xs: 8px
  sm: 16px
  md: 24px
  lg: 32px
  xl: 48px
  margin-mobile: 20px
  gutter-mobile: 12px
---

## Brand & Style

This design system is anchored in the concept of "Clinical Warmth"—a balance between professional medical excellence and human empathy. It is designed specifically for a marketplace model where trust and accessibility are paramount. 

The aesthetic is **Modern Corporate** with a **Tactile** softness. It avoids clinical clichés in favor of a sophisticated, editorial approach. The interface should feel spacious and breathable, utilizing significant white space and a soft color palette to reduce user anxiety. The style emphasizes high-quality typography and subtle surface transitions over aggressive borders or heavy shadows, creating a calm, high-end environment for healthcare interactions.

## Colors

The palette is centered around **Fayed Teal**, a color that represents precision and vitality. To achieve the "Warmth" required by the brand, the default background is a soft off-white (`#FAF9F6`), which prevents the interface from feeling sterile or "blue-light" heavy.

- **Primary:** Used for main actions, active states, and brand identifiers.
- **Surface Strategy:** Layers are created using pure `#FFFFFF` on top of the warm off-white background. This provides a clean, elevated look without needing heavy lines.
- **Accents:** These are used sparingly for category tinting (e.g., different session types) and status indicators. They should always be desaturated and light to maintain the calm vibe.
- **Typography:** The neutral dark (`#161616`) is used for primary text to ensure high legibility and a premium feel.

## Typography

The typography system utilizes a serif/sans-serif pairing to evoke an editorial, trustworthy feel. **Source Serif 4** provides an authoritative yet warm voice for headlines, while **Source Sans 3** offers high functional legibility for body text and labels.

**Bilingual Support:** 
The system is designed for native Arabic (RTL) and English (LTR) support. When rendering Arabic, ensure line-height is increased by approximately 20% to accommodate script descenders and ascenders. Source Sans 3 provides excellent glyph support for a modern, professional Arabic presentation that aligns with the Latin weights.

## Layout & Spacing

This design system follows a **Fixed-Fluid Hybrid** model for mobile. It uses a 4-column grid for mobile devices with a standard 20px outer margin. 

- **Vertical Rhythm:** Spacing between sections should follow a 24px (md) or 32px (lg) increment to maintain a sense of openness. 
- **RTL Behavior:** The layout must fully mirror for Arabic. This includes the placement of icons within inputs, the direction of the bottom navigation, and the alignment of chevron indicators.
- **Safe Areas:** Adhere strictly to mobile safe-area insets for the bottom action bar and header.

## Elevation & Depth

Depth in this system is communicated through **Tonal Layering** rather than traditional shadows. 

1. **Level 0 (Background):** The warm off-white (#FAF9F6) serves as the foundation.
2. **Level 1 (Surfaces):** Cards and main content containers use pure white (#FFFFFF). 
3. **Shadow Character:** Where shadows are necessary (e.g., floating action buttons or primary cards), use a very soft, highly diffused ambient shadow: `y: 4, blur: 20, color: rgba(22, 22, 22, 0.05)`. Avoid dark, concentrated shadows.
4. **Interactive States:** Use a subtle "pressed" state where the element scales slightly (98%) or a soft inner-tint change rather than an elevation increase.

## Shapes

The shape language is defined by large, welcoming radii. 
- **Containers & Cards:** Use a 24px radius (`rounded-xl` logic) to create a soft, friendly appearance that removes "clinical" sharpness.
- **Buttons & Controls:** Use 12px to 16px to maintain a professional, sturdy feel.
- **Interactive Elements:** Segmented controls and pills should use fully rounded (pill-shaped) ends to differentiate them from structural containers.

## Components

### Header & Navigation
- **Header:** Features a left-aligned logo (mirrored for RTL). Right-aligned utility icons (Messages, Notifications) use subtle 2pt red badges for unread states.
- **Bottom Action Bar:** A high-blur translucent white surface with 4 main anchors. Active states use the Fayed Teal for both the icon and a small dot indicator below.

### Buttons & Inputs
- **Primary Button:** Fayed Teal background with white text. High-contrast, 16px radius.
- **Input Fields:** Soft white background with a 1px border in the background color (#FAF9F6). On focus, the border transitions to Fayed Teal.

### Specific Patterns
- **Hero Areas:** Soft-gradient backgrounds using the "Mint" or "Cream" accents to highlight upcoming sessions or featured marketplace clinicians.
- **Timeline Blocks:** A vertical 2px line in Fayed Teal with circular nodes to represent session history or medical milestones.
- **Status Pills:** Used for session status (e.g., "Confirmed", "Pending"). These use the named accent colors with matching dark-text counterparts for maximum legibility.
- **Cards:** White surfaces with 24px padding. Content should be vertically stacked with a clear hierarchy between the Source Serif headline and Source Sans metadata.
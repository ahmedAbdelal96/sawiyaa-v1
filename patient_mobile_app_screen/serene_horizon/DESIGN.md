# Design System Strategy: The Breathable Canvas

This design system is built to facilitate a "Serene Sanctuary"—a digital environment for mental health that prioritizes emotional safety over clinical utility. By moving away from rigid grids and harsh borders, we create a fluid, editorial experience that feels like a premium wellness journal rather than a medical portal.

## 1. Creative North Star: The Breathable Canvas
The guiding principle of this system is **The Breathable Canvas**. In mental health design, cognitive load is the enemy. We achieve "calm" through intentional asymmetry, oversized margins (breathing room), and a rejection of traditional structural lines. 

Instead of boxed-in layouts, we use organic depth and tonal shifts to guide the eye. This creates an "Editorial Modernist" aesthetic that signals high-end care and professional trustworthiness without the coldness of a hospital or the rigidity of a bank.

---

## 2. Color & Tonal Architecture

Our palette is anchored in deep, trustworthy blues and soft, ethereal neutrals. We do not use color simply for decoration; we use it to define state and emotional resonance.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section off content. Boundaries must be defined solely through background color shifts or subtle tonal transitions. For example, a card component (`surface_container_lowest`) should sit on a background of `surface_container_low` to create a natural edge.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of fine paper. Use the surface-container tiers to create "nested" depth:
- **Base Layer:** `surface` (The foundation).
- **Sectioning Layer:** `surface_container_low` (Large content blocks).
- **Component Layer:** `surface_container_lowest` (Individual cards or interactive elements).
- **Active Layer:** `surface_container_highest` (Hover states or active tabs).

### The "Glass & Gradient" Rule
To elevate the "Premium" feel, use **Glassmorphism** for floating elements like top app bars or bottom navigation. 
- **Recipe:** Use `surface` at 70% opacity with a 24px backdrop blur.
- **Signature Texture:** Primary CTAs should use a subtle linear gradient from `primary` to `primary_container`. This adds a "soul" to the UI that flat colors lack.

---

## 3. Typography: The Editorial Voice

We pair two typefaces to balance authority with approachability.

*   **Display & Headlines (Manrope):** Used for "Hero" moments and section headers. Manrope’s geometric yet soft terminals feel modern and expensive. Use `headline-lg` with generous tracking (-2%) to create a sophisticated, editorial look.
*   **Body & Utility (Inter):** Used for all functional text. Inter provides maximum legibility for users who may be experiencing high stress or cognitive fog.

**Hierarchy Note:** Always prioritize white space over font size. A `title-md` surrounded by 40px of padding feels more premium than a `headline-lg` cramped into a small space.

---

## 4. Elevation & Depth: Tonal Layering

Traditional shadows are often too "heavy" for a mental health context. We replace them with **Ambient Tonal Layering**.

*   **The Layering Principle:** Depth is achieved by stacking the surface-container tokens. A `surface_container_lowest` card placed on a `surface_container_high` section creates a soft, natural lift.
*   **Ambient Shadows:** Where a floating effect is mandatory (e.g., a "New Journal Entry" FAB), use an extra-diffused shadow.
    *   **Blur:** 32px to 48px.
    *   **Opacity:** 4% to 8%.
    *   **Color:** Use a tinted version of `on_surface` (a deep navy/slate) rather than pure black.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility (e.g., input fields), use the `outline_variant` token at **15% opacity**. Never use a 100% opaque border.

---

## 5. Components

### App Bars (Sophisticated)
Do not use a flat, solid-color bar. Use a glassmorphic `surface` with a 24px blur. Headlines should be left-aligned (LTR) or right-aligned (RTL) using `headline-sm`, avoiding the centered "standard" app look for a more bespoke, editorial feel.

### Buttons
*   **Primary:** Rounded `full` (pill-shaped) with the signature `primary` to `primary_container` gradient.
*   **Secondary:** No background; use `primary` text with a `surface_container_high` background on hover.
*   **Sizing:** 56px height for primary actions to ensure a comfortable touch target (reducing frustration).

### Soft Cards & Lists
*   **Rule:** Forbid divider lines.
*   **Styling:** Use `surface_container_lowest` for the card body. Use 24px corner radius (`xl`). 
*   **Separation:** Content within lists is separated by 16px of vertical white space, not lines.

### Emotionally Supportive Status Indicators
Avoid "Alert Red" or "Success Green" where possible. 
- Use `tertiary` (soft lavender) for "In Progress."
- Use `primary_container` for "Success/Complete."
- Only use `error` (muted red) for critical system failures, never for user mistakes. Use soft, encouraging copy instead.

### Input Fields
Large, pill-shaped inputs (24px radius) using `surface_container_low`. On focus, the background shifts to `surface_container_lowest` with a "Ghost Border" of `primary` at 20% opacity.

---

## 6. Do’s and Don’ts

### Do
- **Embrace Asymmetry:** Let headers bleed off the edge or use staggered card layouts.
- **Prioritize RTL:** Ensure the `manrope` display type mirrors beautifully for Arabic users, maintaining the same editorial weight.
- **Use Micro-interactions:** Buttons should "breathe" (subtle scale up) when pressed, providing tactile, supportive feedback.

### Don’t
- **Don’t use "Clinical" White:** Always prefer `surface` or `surface_container_low` to prevent eye strain.
- **Don’t use 90-degree corners:** Mental health apps should feel soft. Stick to the 16px-24px (`lg` to `xl`) range.
- **Don’t Overcrowd:** If a screen feels full, it needs a scroll. Never sacrifice white space for density.

---

## 7. Accessibility & Motion
Motion should be "Leisurely." Transitions between screens should use a long duration (400ms - 500ms) with a `cubic-bezier(0.4, 0, 0.2, 1)` easing to mimic the feeling of a slow breath. This reinforces the "supportive" brand promise at a functional level.
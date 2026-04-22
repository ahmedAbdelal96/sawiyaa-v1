# Design System Document

## 1. Overview & Creative North Star: "The Clinical Sanctuary"

This design system is built upon the "Clinical Sanctuary" North Star. In the context of mental health, users require a delicate balance of authoritative precision (Clinical) and comforting stability (Sanctuary). We depart from the generic, airy "wellness" aesthetic—which often feels flighty or unsubstantial—and move toward a high-end editorial experience.

The system utilizes **Intentional Asymmetry** and **Tonal Depth** to guide the eye. By breaking the rigid "grid of boxes" and instead using layered surfaces, we create an environment that feels structured, trustworthy, and premium. It is a system designed for high-density information that remains calm and legible, prioritizing the user's cognitive load above all else.

---

## 2. Colors & Surface Architecture

The color logic follows a strict "Material-plus" hierarchy. We use color not just for decoration, but as a structural tool to define importance and relationship.

### The Surface Hierarchy (The Layering Principle)
To create a high-end feel, we prohibit the use of standard 1px borders for sectioning. Instead, depth is achieved by "stacking" tonal containers.

*   **Base Layer:** `surface` (#f7f9fe) – The foundation of the application.
*   **Secondary Layer:** `surface-container-low` (#f1f4f9) – Used for large content blocks or grouping related categories.
*   **Primary Interaction Layer:** `surface-container-lowest` (#ffffff) – Reserved for the most important interactive cards or "floating" elements that need to pop against the background.
*   **Elevated Detail:** `surface-container-high` (#e6e8ed) – Used for headers or navigation bars that stay pinned during scroll.

### The "Glass & Texture" Rule
For floating elements (modals, bottom sheets, or navigation bars), use **Glassmorphism**:
*   **Token:** `surface_container_low` at 85% opacity.
*   **Effect:** Apply a `24px` backdrop-blur. 
*   **Signature Texture:** Main CTAs should use a subtle linear gradient from `primary` (#0b5cac) to `primary_container` (#3575c7) at a 135-degree angle. This provides a "weighted" feel that solid flat colors lack.

---

## 3. Typography: Editorial Authority

We use a dual-typeface system to distinguish between "The Brand Voice" and "The Data."

*   **Headlines (Manrope):** Geometric and authoritative. Headlines should utilize tight letter-spacing (-0.02em) to feel cohesive and "printed."
*   **Body & Data (Inter):** Chosen for its exceptional readability in clinical contexts. Body text should have a slightly increased line-height (1.6) to prevent clinical data from feeling cramped.

### Typography Scale
*   **Display (L/M/S):** Manrope. Reserved for onboarding and major milestone screens. High contrast sizing.
*   **Headline (L/M/S):** Manrope. Used for screen titles. Always `on_surface` (#181c20).
*   **Title (L/M/S):** Inter Bold/Semi-Bold. Used for card titles and section headers.
*   **Body (L/M/S):** Inter Regular. For all user-generated content and instructional text.
*   **Label (M/S):** Inter Medium All-Caps with +0.05em tracking. Used for secondary metadata and status indicators.

---

## 4. Elevation, Depth & RTL Logic

### Ambient Shadows
Forget "drop shadows." We use **Ambient Tinted Shadows**.
*   **Color:** Use a 10% opacity version of `on_surface` (#181c20) mixed with a hint of `primary`.
*   **Blur:** Extra-diffused (Spread: 0, Blur: 20px to 40px). 
*   **Offset:** Y-axis only (4px to 8px).

### The "Ghost Border" Fallback
If an element (like a text input) requires a boundary for accessibility:
*   **Token:** `outline_variant` (#c2c6d3) at **20% opacity**.
*   **Rule:** 100% opaque borders are strictly forbidden as they clutter the visual field.

### RTL (Right-to-Left) Support
Designed for English and Arabic. 
*   **Logic:** All spacing tokens are defined as `start` and `end` rather than `left` and `right`. 
*   **Mirroring:** Iconic indicators (arrows, progress bars) must mirror, while data charts and currency symbols maintain their logical clinical orientation.

---

## 5. Components

### Cards & Data Lists
*   **Structure:** No divider lines. Separate items using `16px` or `24px` of vertical white space or by alternating background tones between `surface_container_low` and `surface_container_lowest`.
*   **Hierarchy:** The "Money/Wallet" flows must use `tertiary` (#854f00) for "Pending/Action Required" and `primary` for "Settled/Trust" status.

### Buttons
*   **Primary:** High-contrast gradient (Primary to Primary Container). Roundedness: `md` (0.375rem).
*   **Secondary:** `surface_container_high` background with `on_primary_fixed_variant` text.
*   **Tertiary:** No background. Bold `primary` text. Use for low-emphasis actions like "Cancel" or "Skip."

### Input Fields
*   **State:** Default state uses the **Ghost Border**.
*   **Active State:** Transition to a 2px `primary` bottom-border only, or a subtle `primary_fixed` glow.
*   **Error State:** `error` (#ba1a1a) text with `error_container` background tint.

### Specialized Component: The "Pulse Indicator"
For mental health tracking, use a signature component: A `surface_container_lowest` card with a `surface_tint` accent bar (4px) on the `inline-start` edge. This provides a clear "status" without boxing in the content.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use tonal layering to define sections (e.g., a white card on a light blue-grey background).
*   **Do** use asymmetrical layouts for headers to give the app a custom, non-templated feel.
*   **Do** ensure all interactive elements have a minimum touch target of 44x44dp.
*   **Do** prioritize the Arabic "Amiri" or "IBM Plex Sans Arabic" if Manrope/Inter fallbacks are needed for RTL.

### Don't:
*   **Don't** use 1px solid dividers to separate list items.
*   **Don't** use generic "happy person" or "green leaf" icons. Use precise, thin-stroke medical or utility icons.
*   **Don't** use excessive whitespace. The user is here for care; empty space can feel lonely. Use "Breathable Density."
*   **Don't** use pure black (#000000) for text. Always use `on_surface` (#181c20) for a softer, more professional contrast.
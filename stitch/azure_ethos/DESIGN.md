# Design System Strategy: The Serene Curator

## 1. Overview & Creative North Star
The "Creative North Star" for this design system is **The Serene Curator**. In the wellness and guided care space, we must move away from the cold, sterile "medical dashboard" and toward an editorial, high-end sanctuary. This system is designed to feel like a premium physical space—think of a high-end wellness retreat where every interaction is intentional, calm, and weightless.

We break the "standard template" look by utilizing **intentional asymmetry** and **breathable compositions**. Rather than a rigid, boxy grid, we use expansive white space and overlapping elements (e.g., an image bleeding off the edge of a container) to create a sense of organic movement. Typography is treated as a design element itself, with large display headers acting as structural anchors for the lighter, floating UI components.

---

## 2. Color & Tonal Depth
This system relies on a sophisticated palette of blues and neutrals to establish trust without being clinical.

### The "No-Line" Rule
To maintain an elegant, premium feel, **1px solid borders are strictly prohibited for sectioning.** We do not draw boxes; we define spaces. Boundaries must be created exclusively through:
*   **Background Shifts:** Transitioning from `surface` to `surface-container-low`.
*   **Tonal Transitions:** Using the subtle difference between `#f9f9ff` (Background) and `#ffffff` (Surface) to imply structure.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine paper. 
*   **Base:** `background` (#f9f9ff)
*   **Content Areas:** `surface-container-low` (#f0f3ff)
*   **Active Cards:** `surface-container-lowest` (#ffffff)
*   **Nesting:** When placing a card inside a section, the inner container must always be a higher luminance (lighter) than the parent to create a "lifted" effect.

### The "Glass & Gradient" Rule
To add "soul" to the interface:
*   **Signature Gradients:** Use a subtle linear gradient from `primary` (#0b5cac) to `primary-container` (#3575c7) for hero CTAs. This prevents the primary action from feeling flat or heavy.
*   **Glassmorphism:** For floating navigation bars or overlays, use `surface` with a 70% opacity and a `24px` backdrop-blur. This integrates the component into the environment rather than "pasting" it on top.

---

## 3. Typography (Arabic & English)
The hierarchy is designed to be authoritative yet approachable. We use **Manrope** for English, paired with a high-contrast Arabic sans-serif.

*   **Display (Lg/Md/Sm):** Used for editorial storytelling and welcome screens. These should have tight letter-spacing and feel "monumental."
*   **Headline (Lg/Md):** The primary structural anchors. In RTL (Arabic) layouts, these provide the strong right-aligned "spine" of the page.
*   **Title (Lg/Md/Sm):** Used for card titles and section labeling.
*   **Body (Lg/Md/Sm):** Set with generous line-height (1.6+) to ensure readability and a "calm" density.
*   **Labels:** Always uppercase or slightly tracked-out to distinguish from body text.

*Director's Note: Hierarchy is not just size; it is weight. Use `title-lg` in a Medium weight to contrast against `body-lg` in Regular.*

---

## 4. Elevation & Depth
We eschew traditional shadows in favor of **Tonal Layering**.

*   **The Layering Principle:** Depth is achieved by "stacking." A `surface-container-lowest` card sitting on a `surface-container-low` section creates a natural, soft lift without the need for CSS shadows.
*   **Ambient Shadows:** For high-priority floating elements (e.g., Booking Modal), use a "Cloud Shadow": 
    *   `box-shadow: 0 12px 40px rgba(16, 28, 46, 0.06);` 
    *   The shadow is tinted with the `on-surface` color (#101c2e) rather than black, creating a natural atmospheric effect.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility in forms, use `outline-variant` (#c2c6d3) at **15% opacity**. Never use a 100% opaque border.

---

## 5. Components

### Buttons & CTAs
*   **Primary:** Gradient-filled (`primary` to `primary-container`) with `xl` (1.5rem) roundedness. No shadow; the color depth provides the prominence.
*   **Secondary:** `surface-container-highest` background with `on-secondary-container` text. This feels "embedded" rather than "floating."

### Cards & List Items
*   **Strict Rule:** No divider lines between list items. Use **24px vertical spacing** or alternating subtle background tints (`surface-container-low` vs `surface-container-lowest`).
*   **Card Style:** Use `xl` (1.5rem) radius for large cards and `md` (0.75rem) for nested items. This "squircle" nesting creates a high-end, custom hardware aesthetic.

### Refined Filter Chips
*   **In-Active:** `surface-container-high` background, no border.
*   **Active:** `primary` background with `on-primary` text.
*   **Shape:** Always `full` (9999px) radius for a soft, pill-like feel.

### Booking UI Elements
*   **Time Slots:** Use `surface-container-low` as the base. Upon selection, transition to `primary-fixed` (#d5e3ff) with a soft `primary` text. This avoids high-contrast "shouting" and keeps the user calm during a task.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** prioritize RTL (Arabic) as the primary layout driver. Ensure icons are mirrored correctly (e.g., back arrows pointing right).
*   **Do** use asymmetrical padding. Give more room to the top of a section than the bottom to create a "rising" editorial feel.
*   **Do** use the `surface-dim` (#cfdaf3) for subtle background patterns or "behind-the-scenes" elements.

### Don't:
*   **Don't** use `#000000` for text. Use `on-surface` (#101c2e) to keep the contrast soft and readable.
*   **Don't** use harsh `sm` (0.25rem) radiuses unless it is for a very small utility like a checkbox. Wellness requires "soft" edges.
*   **Don't** use vertical dividers. Use white space and alignment to imply columns.
*   **Don't** use muddy grays. Every neutral in this system is "blue-tinted" to maintain the serene, cool atmosphere.
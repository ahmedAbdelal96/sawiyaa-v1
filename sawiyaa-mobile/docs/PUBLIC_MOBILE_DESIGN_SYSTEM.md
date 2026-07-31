# Public Mobile Design System — Stitch Specifications

This document defines the visual system, semantic tokens, layout principles, and component specifications for Sawiyaa's public mobile experience.

---

## 1. Visual Principles

The design is anchored in **Symmetry and Balance** (سويّة), delivering a premium, modern-tactile experience that blends clinical reliability with a warm sanctuary aesthetic.
- **Intentional Whitespace**: Heavy use of spacing to lower cognitive load.
- **Tactile Verticality**: Soft shadows and layered surfaces over a warm canvas background.
- **RTL-First Integrity**: Eye flow and layouts are designed natively from right-to-left.

---

## 2. Semantic Colours

Public components consume only the nested `public` semantic token layer of the theme:

| Token Name | Light Value | Dark Value | Purpose |
| :--- | :--- | :--- | :--- |
| `canvas` | `#F7F4EE` | `#101716` | Screen base background |
| `heroSurface` | `#FFFCF8` | `#131b1a` | Hero section canvas |
| `raisedSurface` | `#FFFCF8` | `#182221` | Cards and modular surfaces |
| `accentMint` | `#DDEAE3` | `#153534` | Soft mint highlights, icons |
| `accentSand` | `#F4E0C5` | `#332612` | Warm sand secondary actions |
| `accentPeach` | `#EECFC2` | `#2d2620` | Soft peach details |
| `primaryText` | `#053f38` | `#f2f7f6` | Botanical teal primary copy |
| `secondaryText` | `#404847` | `#c8d4d2` | Soft neutral supporting copy |
| `subtleBorder` | `#DDEAE3` | `rgba(156,180,177,0.16)` | Soft mint borders |
| `ambientShadow` | `rgba(31,51,47,0.05)` | `rgba(0,0,0,0.32)` | Ambient shadows |

---

## 3. Dimensions & Scales

### Typography Scale
- **Display Header**: `display-lg-mobile` (Size: 32px, Line Height: 42px, Bold) for welcome hero.
- **Section Title**: `headline-md` (Size: 28px, Line Height: 36px, Semi-Bold) for section headers.
- **Card Title**: `headline-sm` (Size: 22px, Line Height: 30px, Semi-Bold).
- **Body copy**: `body-md` (Size: 16px, Line Height: 24px, Regular).
- **Metadata**: `label-md` (Size: 14px, Line-height: 20px).

### Spacing Scale (8-Point Grid)
- `xs`: 4px | `sm`: 8px | `md`: 16px | `lg`: 24px | `xl`: 32px | `xxl`: 48px
- **Page Padding**: Standard `MOBILE_HORIZONTAL_PADDING = 20px` is applied to all public canvas screens.
- **Section Rhythm**: A larger vertical rhythm of `32px` is applied between main content blocks.

### Radius Scale
- `Input Radius`: 12px (form controls)
- `Card Radius`: 24px or 28px (Bento boxes, visual containers)
- `Button Radius`: 16px (actions)
- `Pill Radius`: 9999px (specialty chips, status badges)

---

## 4. Layout & Structural Rules

### Bottom Navigation
- Structure is prepared for four main screens: **Home**, **Practitioners**, **Specialties**, and **Packages**.
- To ensure a clean experience, unfinished screens are hidden from the active tab layout by setting `href: null` in screen configurations.

### Header Rules (TopAppBar)
- Height is fixed at `56px` with a subtle bottom border (`subtleBorder`).
- Left actions contain language switcher ("العربية" / "EN").
- Right actions contain logo and patient Sign In. (Flipped natively in RTL).

### Hero Rules
- Centered editorial typography layout displaying premium taglines and dual button choices (minHeight 52px, radius 16px).

### Bento Grid Responsive Behaviour
- **Arabic Text Readability**: Arabic text must never be compressed into narrow vertical columns.
- **Viewport Constraints**:
  - For Arabic locale: Always stack bento cards vertically (1 column grid) regardless of screen width.
  - For English locale:
    - Viewports `width >= 390`: Render first card wide, next 2 side-by-side in a 2-column row.
    - Viewports `width < 390`: Stack all cards vertically.

### States Specification
- **Loading states**: Custom skeleton list with background color aligned to theme values.
- **Empty states**: Displays localized illustration and descriptive helper label.
- **Error states**: Section-specific error panel exposing a "Retry" trigger.

---

## 5. Auth Gateway Rules

The global Modal Auth Gateway intercepts protected actions only.
- **Protected Actions**: Book Session, Buy Package, Message Practitioner, Save Favourite.
- **Public Browsing (Free)**: Browse Specialists, View Practitioner Details, Explore Specialties, and View Packages must *never* trigger the Auth Gateway. If a route is not implemented, the CTA should be disabled or hidden instead of gating it.
- **Patient Actions Only**: Modal options must strictly contain patient options:
  - Create Patient Account (`/(auth)/signup/patient`)
  - Patient Sign In (`/(auth)/signin/patient`)
  - Continue Browsing (Dismisses Modal)
- **Prohibited**: Under no circumstances should the gateway display practitioner signup, therapist registration, or raw unstyled alerts.

---

## 6. Prohibited Visual & Content Patterns

1. **No Fake Statistics**: Never use statements like "Over 100 specialists" or numeric metrics that are not backed by real data.
2. **No Unsupported Claims**: Do not use "complete privacy", "end-to-end encrypted", or "complete therapy journey".
3. **No Practitioner Mobile Onboarding**: Mobile registration is patient-only. Practitioners can only sign in.
4. **No Result Cards on Public Home**: Public Home is strictly editorial and must perform **zero** result-list API queries.
5. **No Remote Stitch Assets**: Do not use remote URL images for illustrations. Use native branded drawing compositions or approved local assets.
6. **No Auth-Gating Browse Actions**: Free exploration is fully public. Only transactional/protected actions trigger authentication prompts.
7. **No Unrelated Visual Systems per Screen**: Every public page must follow this exact semantic token system.

# Sawiyaa Web Design System & Product Direction

> **Repository:** `D:\Web\full-projects\sawiyaa\sawiyaa-frontend-v1`
>
> This document defines the permanent design system, visual language, customer copy standards, and architectural conventions for the Sawiyaa Web frontend.

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
- customer-facing language
- emotional warmth
- page hierarchy
- human-centered presentation
- simple CTAs
- early practitioner visibility
- trust-building
- helping uncertain users choose
- low cognitive load
- supportive Arabic wording

Sawiyaa should strongly learn from Shezlong's product communication model.

This does **NOT** mean copying their proprietary:
- logo
- illustrations
- photographs
- exact text
- exact assets
- pixel-for-pixel layouts

Use the same UX/copy school and product psychology while building a distinct, modern Sawiyaa identity. Sawiyaa should ultimately feel more modern and refined while preserving the human warmth that makes Shezlong effective.

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

*(These are style examples, not mandatory hardcoded strings. All final wording must fit the actual screen and business purpose.)*

---

## 5. Words & Patterns to Avoid

Avoid repeating product/technical concepts such as:
- ❌ `"مسار واضح"`
- ❌ `"رحلة واضحة"`
- ❌ `"سياق واضح"`
- ❌ `"قواعد واضحة"`
- ❌ `"حالة الدفع واضحة"`
- ❌ `"المعاينات الشكلية"`
- ❌ `"إدارة رحلة الرعاية"`
- ❌ `"مسار الرعاية"`
- ❌ `"تجربة متكاملة"`

unless the context genuinely requires them.

**Do not tell customers that the platform is "clear". Make the experience clear.**

Do not expose implementation details or failure-state terminology in marketing copy (e.g., payment state machine internals, runtime rules, chat eligibility constraints, system states, backend terminology).

---

## 6. Do Not Diagnose the Customer

Customer copy must not assume diagnoses.

- Prefer: `"إيه اللي محتاج مساعدة فيه؟"` over language that assumes the customer knows a clinical diagnosis.
- A customer understands: **قلق، نوم، ضغط، علاقات، مشاكل أسرية، مشاكل أطفال، توتر، مزاج** before knowing the clinical specialty.
- Clinical taxonomy can still exist underneath the UI.

---

## 7. Visual Direction & Quality Bar

The Sawiyaa visual system should be:
- **modern**
- **calm**
- **premium but approachable**
- **highly readable**
- **spacious**
- **human-centered**
- **emotionally safe**

Key visual rules:
- Use strong hierarchy and intentional whitespace.
- Avoid excessive small cards and card walls.
- Avoid dashboard-like public pages.
- Avoid clutter and excessive competing CTAs.
- Practitioner faces and human imagery should have meaningful visual importance.
- Trust signals should feel integrated into the experience.
- Use the **Taste Skill** (`.agents/skills/taste-skill/SKILL.md`) as the implementation quality bar.

---

## 8. CTA Hierarchy

Each screen should have a clear primary action.
- Avoid three or four competing primary buttons.
- For discovery/public experiences, common decision paths are:
  - **Primary:** `"اختار مختص"`
  - **Secondary:** `"ساعدني أختار"`
- Do not place unrelated personas such as `"دخول المختصين"` as a competing hero CTA for customers. Practitioner access belongs in secondary navigation / footer / topbar utility.

---

## 9. Public Experience Philosophy

Public pages should answer the customer's questions in roughly this order:
1. **هل المكان ده ممكن يساعدني؟** (Can this place help me?)
2. **أبدأ منين؟** (Where do I start?)
3. **مين الناس اللي ممكن أتكلم معاهم؟** (Who are the specialists I can talk to?)
4. **هل هم مناسبين وموثوقين؟** (Are they qualified and trustworthy?)
5. **الموضوع بيشتغل إزاي؟** (How does it work?)
6. **هل خصوصيتي محفوظة؟** (Is my privacy safe?)
7. **بكام وإمتى أقدر أحجز؟** (How much does it cost and when can I book?)
8. **ماذا أفعل إذا لم أعرف من أختار؟** (What if I don't know who to choose?)

Do not organize public pages around internal product modules. Organize them around customer concerns.

---

## 10. Customer Application Philosophy

After authentication, the experience may become more functional but must stay human:
- Avoid turning the customer area into an ops dashboard.
- Prefer `"جلستك القادمة"` over `"Session status: READY_TO_JOIN"`.
- Prefer `"ادخل الجلسة"` over exposing technical state names.
- Customer screens should translate system state into human meaning.

---

## 11. Business Preservation Rule

> **"Before redesigning an existing Sawiyaa screen, preserve the screen's BUSINESS CONTRACT, not its current VISUAL IMPLEMENTATION."**

Every redesign begins with a business-function audit. Identify before changing:
- current APIs and hooks
- existing and hidden user actions
- query parameters & route state
- permissions & auth guards
- backend states & transitions
- loading, error, and empty states
- booking, pricing, payment, session, and messaging rules

Do not remove functionality just because the current UI is visually poor. Business behavior is authoritative; frontend presentation may change radically around it.

---

## 12. Transformation Level

For customer/public redesign tasks:
- **DO NOT default to minimum-change frontend edits.**
- The expected transformation is substantial.
- Old UI structures may be replaced when necessary.
- The agent should preserve business capabilities, NOT old visual architecture.
- *"Smallest coherent change"* refers to avoiding unrelated code churn. It does NOT mean keeping a weak UX.

The agent may:
- change page composition
- change hierarchy
- change component structure
- change visual language
- move information
- simplify presentation
- replace old cards/sections
- rewrite customer-facing copy
- reduce unnecessary UI noise
- create new frontend components

as long as the business capability remains intact.

---

## 13. No Fake UI

Never create controls that look functional but are not connected to real behavior. Do NOT add:
- fake filters
- fake reviews
- fake ratings
- fake availability
- fake practitioner counts
- fake statistics
- fake trust logos
- fake testimonials
- fake online status

If data is unavailable, design honestly around the available data.

---

## 14. Localization & RTL/LTR

- Never solve Arabic redesign problems by hardcoding Arabic strings inside components.
- Use the localization infrastructure (`messages/ar/` and `messages/en/`).
- Respect both **Arabic (RTL)** and **English (LTR)**. Both languages must remain functional.
- Arabic is the primary design review language for this redesign.
- Use CSS logical properties (`margin-inline-start`, `padding-inline`, `ms-*`, `me-*`, `ps-*`, `pe-*`, `start`/`end`).
- Interactive directional indicators (arrows, chevrons) must mirror correctly (LTR: point right `→`, RTL: point left `←`).

---

## 15. Responsive Design

Web must be designed deliberately for:
- **Desktop** (spacious, multi-column when appropriate, comfortable reading line lengths)
- **Tablet** (balanced layouts, touch-friendly targets)
- **Mobile Browser** (drawer navigation, full-width cards, thumb-friendly CTAs, no horizontal overflow)

Do not merely shrink desktop UI — compose responsive viewports deliberately.

---

## 16. Cross-Platform Consistency

Web and Mobile share:
- voice and Arabic copywriting tone
- terminology (no "مريض" in customer UI)
- emotional tone (calm, trusted, warm)
- CTA philosophy and mental model
- core color palette and brand identity

Web leverages full desktop viewports and browser capabilities; Mobile follows native interaction patterns.

---

## 17. Brand Identity & Official Palette

* **Arabic Name:** سويّة
* **English Name:** Sawiyaa
* **Official Domain:** `sawiyaa.com`
* **Core Tagline EN:** *Care for mind, body, and balance*
* **Core Tagline AR:** *رعاية للعقل والجسم والتوازن*

### Official Color Palette

| Variable Token | Color Name | HEX Code | Usage |
| :--- | :--- | :--- | :--- |
| `primary` | Deep Teal | `#24564F` | Main brand identity, primary CTAs, major headings, active menu states. |
| `secondary` | Soft Sage | `#A7BFAE` | Supportive icons, secondary highlights, soft borders. |
| `background` | Warm Ivory | `#F7F4EE` | Main page background (default backdrop). |
| `background-light` | Soft Background | `#FBF9F5` | Secondary landing sections or lighter marketing areas. |
| `card` | Pure White | `#FFFFFF` | Core panels, active modals, elevated surfaces. |
| `card-warm` | Warm Card | `#FCFAF6` | Secondary panels, sidebars, info modules. |
| `sand` | Muted Sand | `#E6D6B8` | Structural separators, borders, outline treatments. |
| `accent` | Warm Gold | `#C8A979` | Restrained high-end accents (rating stars, focus rings, subtle badges). |
| `green-light` | Green Tint Light | `#D9E4DB` | Light green surfaces, alert backdrops. |
| `green-surface` | Green Surface | `#EEF4EF` | Badges, filter pills, hover states. |
| `text-main` | Main Text | `#1C2F2B` | Body copy, dark button labels, primary field values. |
| `text-muted` | Muted Text | `#61716C` | Descriptions, timestamps, field labels, placeholder values. |
| `border-soft` | Soft Border | `#E6D6B8` | Card outlines, input borders, panel separators. |

---

## 18. Web Platform Specifics & Technical Architecture

- **Framework:** Next.js 16 (App Router), React 19, TypeScript.
- **Styling:** Tailwind CSS v4, PostCSS, `@tailwindcss/postcss`.
- **Fonts:** `@fontsource-variable/cairo` (Arabic) and `@fontsource-variable/outfit` (Latin).
- **Internationalization:** `next-intl` (`messages/ar/`, `messages/en/`).
- **State Management:** Zustand (`src/stores/`), TanStack React Query (`@tanstack/react-query`).
- **Icons:** `lucide-react`.
- **UI Components:** `src/components/ui/` (primitives), `src/features/` (domain feature modules), `src/layout/` (app shells).
- **Currency Support:** EGP and USD only (never hardcode currency strings; resolve via localization / backend formatting).
- **Brand Lock:** Strictly **Sawiyaa** / **سويّة** (never expose legacy "Fayed" in customer UI).



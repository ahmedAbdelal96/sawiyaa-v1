<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — Sawiyaa Web Engineering & Product Rules

> **Repository:** `D:\Web\full-projects\sawiyaa\sawiyaa-frontend-v1`
>
> This file defines the permanent operating rules for coding agents working on the Sawiyaa Web application.
> It applies to the entire web frontend repository.

---

## Sawiyaa Design Preflight — Mandatory

Before performing ANY task in this repository, the coding agent must read:

1. `AGENTS.md`
2. `DESIGN.md`
3. `.agents/skills/taste-skill/SKILL.md`
4. Any additional files explicitly required by the Taste Skill

This preflight is mandatory for every task in Sawiyaa Web/Mobile.

For ANY task that creates, modifies, reviews, fixes, or refactors:

- UI
- UX
- customer-facing copy
- components
- pages/screens
- layouts
- navigation
- responsive behavior
- RTL
- typography
- spacing
- colors
- forms
- empty states
- loading states
- errors
- booking UX
- session UX
- messaging UX
- customer account UX

the Taste Skill must actively guide the implementation.

Do not merely read the skill and ignore it.

Apply its principles to the implementation.

Before changing an existing customer-facing screen, understand:

- why the screen exists
- what business function it performs
- what data it consumes
- what actions are available
- what states are supported
- what permissions/guards affect it
- what happens before this screen
- what happens after this screen

A visual redesign must never accidentally remove business functionality.

Radical visual change is allowed.

Business regression is not.

The agent must never interpret "preserve existing functionality" as:

"keep the old layout and only change colors."

For the upcoming Sawiyaa redesign, deep structural UI changes are explicitly allowed and expected.

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

as long as the business capability of the screen remains intact.

---

## 1. Product Direction & Primary Benchmark

Sawiyaa is going through a major UX/UI and customer-copy transformation.

### Primary Benchmark — Shezlong
**Shezlong** (https://www.shezlong.com/ar?target=%2Far%2Fhome) is the primary benchmark for:
- customer-facing language and emotional warmth
- page hierarchy and human-centered presentation
- simple CTAs and early practitioner visibility
- trust-building and helping uncertain users choose
- low cognitive load and supportive Arabic wording

Sawiyaa should strongly learn from Shezlong's product communication model. This does **not** mean copying proprietary logos, illustrations, photography, or layout pixel-for-pixel. We adopt the UX/copy school and product psychology while building a distinct, modern, premium Sawiyaa identity.

### Secondary Reference — Esaal
**Esaal** (https://esaal.me/home) serves as a secondary reference for conversion clarity, streamlined onboarding, and direct decision paths.

---

## 2. Customer Language & Arabic Voice Rules

### Avoid "مريض" in Customer UI
Internally, the Backend, domain models, database entities, routes, APIs, and TypeScript types may still use terminology such as `PATIENT`. **Do NOT rename backend roles, database entities, APIs, permissions, routes, contracts, enums, or domain concepts.**

However, customer-facing UI must **never** call the person:
- ❌ `"مريض"`
- ❌ `"حساب المريض"`
- ❌ `"لوحة المريض"`
- ❌ `"اختيار المختص المناسب للمريض"`

Prefer speaking directly to the person (second-person language):
- ✅ `"اختار المختص المناسب لك"`
- ✅ `"جلساتك"`
- ✅ `"رسائلك"`
- ✅ `"حسابك"`
- ✅ `"مواعيدك"`
- ✅ `"محتاج مساعدة تختار؟"`

### Arabic Voice Quality Bar
Arabic copy must feel:
- **Human, calm, warm, simple, respectful, reassuring.**
- Conversational and natural without becoming slang-heavy (close to everyday Egyptian/Arabic speech).
- Avoid overly formal institutional/hospital Arabic and technical product jargon.
- Examples of target voice:
  - `"مش عارف تبدأ منين؟ نساعدك."`
  - `"اختار المختص المناسب لك."`
  - `"اتكلم براحتك."`
  - `"احجز في الوقت المناسب لك."`
  - `"خصوصيتك محفوظة."`
  - `"شوف الخبرة والتخصص والمواعيد قبل ما تحجز."`
  - `"محتاج تتكلم دلوقتي؟ شوف المختصين المتاحين."`

### Words and Patterns to Avoid
Avoid repeating product/technical abstractions such as:
- ❌ `"مسار واضح"` / `"رحلة واضحة"` / `"سياق واضح"` / `"قواعد واضحة"`
- ❌ `"حالة الدفع واضحة"` / `"المعاينات الشكلية"` / `"إدارة رحلة الرعاية"` / `"مسار الرعاية"`
- ❌ Do not tell customers that the platform is "clear" — **make it clear.**
- ❌ Never expose payment state machines, runtime rules, chat eligibility constraints, or backend failure terms in marketing/customer copy.

### Do Not Diagnose the Customer
Customer copy must not assume diagnoses.
- Prefer: `"إيه اللي محتاج مساعدة فيه؟"`
- Frame concerns around human feelings and daily life (قلق، نوم، ضغط، علاقات، مشاكل أسرية، مشاكل أطفال، توتر، مزاج) before clinical specialties.

---

## 3. Business Preservation Rule

> **"Before redesigning an existing Sawiyaa screen, preserve the screen's BUSINESS CONTRACT, not its current VISUAL IMPLEMENTATION."**

Keep the capability. The old visual structure is not sacred.

If an existing screen supports:
- booking / instant booking
- canceling / rescheduling
- joining video/audio sessions
- real-time messaging / attachments
- viewing prices and session durations
- viewing practitioner information, bio, credentials, reviews
- selecting duration & currency (EGP / USD)
- payment flow & receipt/invoice states
- viewing session status & meeting link readiness

the redesign must retain all those capabilities unless the user explicitly requested a business logic change.

---

## 4. Important Sawiyaa Domain Rules

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
4. **No Fake UI:** Never render fake filters, fake reviews, fake ratings, fake online counts, fake testimonials, or hardcoded mock lists when live data is expected.

---

## 5. Future Screen Redesign Workflow (Mandatory)

For every future customer-facing redesign task, the agent must strictly follow this 9-step workflow:

1. **STEP 1 — Preflight:** Read `AGENTS.md`, `DESIGN.md`, and `.agents/skills/taste-skill/SKILL.md`.
2. **STEP 2 — Component Inspection:** Inspect the requested screen and all related subcomponents, modals, and wrappers.
3. **STEP 3 — Flow Inspection:** Trace the complete existing business flow (where the user came from, where they go next).
4. **STEP 4 — Requirements Audit:** Identify:
   - screen purpose & customer goal
   - primary CTA & secondary CTA
   - current business features & interactions
   - API/hook dependencies & query parameters
   - states (idle, loading, empty, error, disabled, success)
   - permissions and auth guards
5. **STEP 5 — Problem Analysis:** Identify UX friction, visual noise, clutter, weak hierarchy, and robotic copy.
6. **STEP 6 — Design Solution:** Design an improved customer experience inspired by `DESIGN.md`, the Shezlong communication model, and Taste Skill standards.
7. **STEP 7 — Implementation:** Implement the new components/layouts cleanly without breaking existing props, hooks, or business logic.
8. **STEP 8 — Capability Verification:** Audit and verify that no business capability or edge-case handling was dropped.
9. **STEP 9 — Multi-Dimensional Review:**
   - Arabic copy (natural, warm, second-person)
   - English copy (clear, concise)
   - RTL & LTR layout mirroring
   - Responsive behavior across Desktop, Tablet, and Mobile Web
   - Loading skeletons, empty states, error fallbacks
   - Accessibility (focus rings, aria attributes, color contrast)
   - Visual hierarchy & CTA prominence

---

## 6. Web Stack & Technical Conventions

- **Framework:** Next.js 16 (App Router), React 19, TypeScript.
- **Styling:** Tailwind CSS v4, CSS Logical Properties (`ms-*`, `me-*`, `ps-*`, `pe-*`), PostCSS.
- **Typography:** Cairo Variable Font (`@fontsource-variable/cairo` for Arabic), Outfit Variable Font (`@fontsource-variable/outfit` for Latin).
- **Internationalization:** `next-intl` with messages in `messages/ar/` and `messages/en/`. Always use translation keys for customer-facing text.
- **State & Data Fetching:** Zustand for client UI state, `@tanstack/react-query` for server state.
- **Icons:** `lucide-react`.
- **Forms & Validation:** `react-hook-form` + `zod`.
- **Notifications & Feedback:** `sonner` for toast notifications.


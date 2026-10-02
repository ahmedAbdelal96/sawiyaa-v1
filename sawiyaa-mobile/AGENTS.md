# AGENTS.md — Sawiyaa Mobile Engineering & Product Rules

> **Repository:** `D:\Web\full-projects\sawiyaa\sawiyaa-mobile`
>
> This file defines the permanent operating rules for coding agents working on the Sawiyaa mobile application.
> It applies to the entire repository unless a deeper `AGENTS.md` explicitly overrides a rule for a narrower subtree.

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

# 1. Product Model

Sawiyaa ships as **one mobile application** containing two independent product experiences:

```text
Sawiyaa Mobile App
├── Patient Experience
└── Practitioner Experience
```

Treat Patient and Practitioner as separate UX products that share infrastructure.

Share where appropriate:

- API client
- authentication infrastructure
- i18n infrastructure
- design tokens
- primitive UI components
- session contracts
- messaging infrastructure
- notification infrastructure
- money/date/time helpers
- error mapping
- common utilities

Do **not** force both roles into one generic screen/component when their user jobs differ.

Prefer focused compositions such as:

```text
patient/screens/Home
practitioner/screens/Home
```

over large role-conditional components.

---

# 2. Core Product Rule

> **Backend = modules. Mobile = human workflows.**

Backend organization must not dictate mobile navigation or screen structure.

Before implementing a screen, identify:

- who the user is;
- what they are trying to accomplish;
- what they need to know now;
- the next valid action;
- what should remain hidden until needed.

A screen should normally answer **one dominant user question**.

---

# 3. Product/UX Source of Truth

For mobile UI/UX work, read and follow:

1. the user's current explicit requirement;
2. `AGENTS.md` and `DESIGN.md`;
3. `.agents/skills/taste-skill/SKILL.md` (mandatory design quality bar);
4. current backend/API contracts and canonical operational capabilities;
5. `SAWIYAA_MOBILE_PRODUCT_UX_TRACKER.md`;
6. existing project conventions;
7. generic external skills/guidance.

`SAWIYAA_MOBILE_PRODUCT_UX_TRACKER.md` is the active execution tracker.

Do **not** re-audit the entire project for every UX task.

Instead:

1. identify the relevant tracker issue ID(s);
2. perform focused discovery around those workflows;
3. implement the smallest coherent change;
4. validate;
5. update the tracker in the same task.

---

# 4. Sawiyaa Mobile UI Skill & Taste Skill

For any task involving:

- mobile UI;
- UX;
- navigation;
- information hierarchy;
- product copy;
- AR/EN localization;
- RTL/LTR;
- loading/empty/error/success states;
- visual redesign;
- screen polish;
- accessibility;

use the repository skills:

1. **Taste Skill (Mandatory Quality Bar):**
```text
.agents/skills/taste-skill/SKILL.md
```
2. **Sawiyaa Mobile UI Skill:**
```text
.agents/skills/sawiyaa-mobile-ui/SKILL.md
```

Consult installed companion skills only when relevant:

```text
$expo-native-ui
$expo-design-system
$expo-router
$expo-data-fetching
$vercel-react-native-skills
```

Sawiyaa rules and installed project versions always take precedence over generic skill examples.

---

# 5. Analysis Before Editing

Before changing code:

1. run `git status`;
2. identify unrelated local changes and preserve them;
3. read the relevant tracker issue(s);
4. inspect only directly related routes, features, hooks, translations, API contracts, and shared components;
5. understand the current workflow;
6. identify the root UX/technical cause;
7. define the target workflow;
8. identify business behavior that must remain unchanged.

Do not begin by modifying JSX/styles.

Do not perform broad refactors unless they are necessary for the requested workflow.

---

# 6. Safe Change Rules

Always prefer the smallest safe coherent change for code structure, while allowing deep UX/UI visual transformations.

> **"Before redesigning an existing Sawiyaa screen, preserve the screen's BUSINESS CONTRACT, not its current VISUAL IMPLEMENTATION."**

The agent must never interpret "preserve existing functionality" as:
"keep the old layout and only change colors."

For the upcoming Sawiyaa redesign, deep structural UI changes are explicitly allowed and expected.

Never:

- overwrite unrelated local work;
- silently reset files;
- change backend contracts without explicit need;
- introduce a new architecture for a local UI issue;
- add production dependencies without justification;
- upgrade Expo / React Native / Expo Router as a side effect of UX work;
- create duplicate infrastructure when a shared implementation already exists.

Before using APIs suggested by external skills, verify compatibility with the repository's actual `package.json`.

---

# 7. Backend Authority

The backend remains authoritative for business decisions.

Do not reconstruct business rules locally when canonical backend capabilities already exist.

This includes, where applicable:

- session lifecycle;
- join eligibility;
- payment eligibility;
- cancellation eligibility;
- no-show actions;
- attendance decisions;
- practitioner completion actions;
- financial eligibility;
- operational state;
- replacement/resolution behavior.

Do not infer canonical state from local device time when the backend already supplies an operational contract.

Do not add client-side fallback business logic merely to make UI behavior appear correct.

If required information is missing, report the contract gap.

---

# 8. Mobile Information Architecture

Do not expose backend modules directly as navigation simply because they exist.

Examples of user mental models:

### Practitioner

```text
What do I have today?
What is my next session?
What times are booked?
What times are available?
How do I add or remove time?
What needs action?
What did I earn?
What messages need attention?
```

### Patient

```text
How do I find the right specialist?
When can I book?
How much will it cost?
How do I pay?
When is my next session?
Can I join now?
What happened in previous sessions?
What is in my wallet?
What transactions/refunds do I have?
```

Optimize navigation around these jobs.

---

# 9. Navigation Rules

Each primary destination should have one predictable navigation owner.

Use:

- bottom tabs for primary workflows;
- contextual actions inside the current workflow;
- More for secondary account/settings/support destinations;
- Home contextual CTAs for urgent or timely actions.

Avoid duplicating the same destination in:

- bottom tabs;
- Home quick-access cards;
- header actions;
- More;

unless a distinct context makes the duplicate genuinely useful.

Preserve context after actions.

Examples:

- after adding Tuesday schedule slots → return to Tuesday;
- after changing a filter → preserve selected day when valid;
- after session action → return to the relevant session/list context.

---

# 10. Visual Hierarchy

Do not default to:

- card walls;
- dashboard grids;
- cards inside cards;
- giant time-slot matrices;
- repeated headings;
- long explanatory paragraphs;
- decorative UI with no functional purpose.

Prefer:

1. current context;
2. most important information;
3. primary action;
4. concise summary;
5. secondary/optional detail.

Use progressive disclosure.

A normal mobile workflow should be understandable without reading an essay.

# 11. Sawiyaa Design System & Primary Benchmark

Use existing project tokens and primitives before introducing new ones.

Inspect:

```text
src/constants/theme.ts
src/components/ui/
src/components/mobile-shell/
src/components/money/
src/components/timezone/
src/components/shared/
```

Do not create a parallel palette or duplicate spacing/typography system.

Sawiyaa visual direction should remain:

- calm;
- warm;
- trustworthy;
- human;
- premium without visual excess;
- appropriate for healthcare;
- comfortable under stress.

### Primary Benchmark — Shezlong
**Shezlong** (https://www.shezlong.com/ar?target=%2Far%2Fhome) is the primary benchmark for:
- customer-facing language and emotional warmth;
- page hierarchy and human-centered presentation;
- simple CTAs and early practitioner visibility;
- trust-building and helping uncertain users choose;
- low cognitive load and supportive Arabic wording.

Sawiyaa should strongly learn from Shezlong's product communication model while developing its own modern, refined identity.
**Secondary Reference:** **Esaal** (https://esaal.me/home) serves as a secondary reference for conversion clarity and rapid decision pathways.

Competitor references may inform:
- workflow;
- density;
- interaction sequence;
- discoverability;
- hierarchy;
- copy brevity.

They must not dictate Sawiyaa branding or exact visual styling.

---

# 12. Cards

A card must have a semantic reason to exist.

Use cards for:

- a meaningful entity;
- contained interaction;
- a state that benefits from clear separation.

Do not use a card merely because a section exists.

Prefer spacing, typography, dividers, rows, and surface hierarchy where appropriate.

---

# 13. Primary Actions

Prefer one dominant filled CTA per important state/viewport.

Secondary actions must remain visually subordinate.

Name actions clearly.

Good:

```text
إضافة أوقات
عرض الجلسة
اختيار الموعد
متابعة للدفع
إعادة المحاولة
```

Avoid vague labels when a clearer action can be named.

Financial or destructive actions must be especially explicit.

---

# 14. Product Copy & Voice Rules

Localization is product writing, not literal translation.

## Never Use "مريض" in Customer UI
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

## Arabic Voice Quality Bar
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

## Words and Patterns to Avoid
Avoid repeating product/technical abstractions such as:
- ❌ `"مسار واضح"` / `"رحلة واضحة"` / `"سياق واضح"` / `"قواعد واضحة"`
- ❌ `"حالة الدفع واضحة"` / `"المعاينات الشكلية"` / `"إدارة رحلة الرعاية"` / `"مسار الرعاية"`
- ❌ Do not tell customers that the platform is "clear" — **make it clear.**
- ❌ Never expose payment state machines, runtime rules, chat eligibility constraints, or backend failure terms in marketing/customer copy.

## Do Not Diagnose the Customer
Customer copy must not assume diagnoses.
- Prefer: `"إيه اللي محتاج مساعدة فيه؟"`
- Frame concerns around human feelings and daily life (قلق، نوم، ضغط، علاقات، مشاكل أسرية، مشاكل أطفال، توتر، مزاج) before clinical specialties.

## English
Use concise product English. Do not mechanically mirror Arabic sentence structure.

## Never expose directly
- raw enums;
- provider names;
- route names;
- API errors;
- stack traces;
- internal IDs;
- technical timezone IDs;
- implementation terminology.

Examples:

```text
Availability
→ الجدول / جدولي
→ Schedule / My schedule

Find Doctor
→ ابحث عن مختص
→ Find a specialist

Africa/Cairo
→ توقيت القاهرة
→ Cairo time
```

Error codes remain available for logs/support, not normal product UI.

---

# 14.1. Important Sawiyaa Domain Rules

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

# 14.2. Future Screen Redesign Workflow (Mandatory)

For every future customer-facing redesign task, the agent must strictly follow this 9-step workflow:

1. **STEP 1 — Preflight:** Read `AGENTS.md`, `DESIGN.md`, `.agents/skills/taste-skill/SKILL.md`, and `.agents/skills/sawiyaa-mobile-ui/SKILL.md`.
2. **STEP 2 — Component Inspection:** Inspect the requested screen and all related subcomponents, sheets, modals, and wrappers.
3. **STEP 3 — Flow Inspection:** Trace the complete existing business flow (where the user came from, where they go next).
4. **STEP 4 — Requirements Audit:** Identify:
   - screen purpose & customer goal
   - primary CTA & secondary CTA
   - current business features & interactions
   - API/hook dependencies & route parameters
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
   - Safe area handling and mobile interaction
   - Loading skeletons, empty states, error fallbacks
   - Accessibility (touch targets, readable contrast)
   - Visual hierarchy & CTA prominence

---

# 15. Money

Use centralized money formatting/components.

Do not build currency strings manually in screens.

Approved display direction:

```text
English:
$20 USD
EGP 500

Arabic:
20 دولار أمريكي
500 جنيه مصري
```

Backend amount/currency is authoritative.

Do not hardcode a user's financial currency based on country or UI assumptions.

---

# 16. Date / Time / Timezone

Use centralized project helpers.

Do not expose raw IANA timezone IDs in ordinary product UI.

Do not hardcode UTC offsets that can become inaccurate.

Always verify bidi behavior for:

- Arabic + numbers;
- date/time;
- currency;
- Latin identifiers.

---

# 17. RTL / LTR

Use existing direction infrastructure such as:

```text
src/i18n/direction.ts
```

Arabic must feel natively RTL, not mechanically mirrored.

Verify:

- header/back icons;
- chevrons;
- tabs;
- segmented controls;
- week/day selectors;
- time rows;
- currency;
- list rows;
- inputs;
- sheets;
- navigation.

Do not solve RTL globally with blind `row-reverse`.

Do not fix Arabic by breaking English.

---

# 18. Accessibility

For core workflows verify:

- touch targets;
- icon-only accessible labels;
- no color-only status meaning;
- readable contrast;
- compact-width layouts;
- dynamic text resilience;
- safe areas;
- keyboard behavior for inputs;
- meaningful loading/error semantics.

---

# 19. UI States

Every redesigned workflow must explicitly handle applicable states:

- loading;
- populated;
- empty;
- retryable error;
- non-retryable error;
- disabled;
- protected;
- success;
- conflict;
- stale/refetch;
- offline where relevant.

Do not rely on a generic blank screen.

---

# 20. Data Fetching & React Query

Preserve established React Query/API behavior.

Avoid:

- redundant queries;
- unnecessary refetches;
- incorrect invalidation;
- layout thrashing caused by unstable fetch states;
- duplicate local cache layers.

When changing server-driven workflows, validate:

- loading;
- retry;
- stale data;
- invalidation;
- success refresh;
- offline/network failure where applicable.

---

# 21. Performance

For high-frequency screens such as:

- Home;
- Schedule;
- Sessions;
- Discovery;
- Booking;
- Messages;

check for:

- unnecessary re-renders;
- large unvirtualized lists;
- expensive derived calculations in render;
- avoidable network requests;
- unstable object/function props;
- image misuse;
- layout shifts.

Use external React Native performance guidance only when compatible with the installed stack.

---

# 22. Visual Validation

A UI task is not visually complete just because code compiles or tests pass.

When the environment supports it:

1. run the actual app;
2. navigate to the target state;
3. inspect the rendered result;
4. capture screenshots where practical;
5. check hierarchy, spacing, typography, density, clipping, RTL/LTR, safe areas, touch targets, keyboard behavior;
6. fix concrete defects;
7. render again.

Use existing Maestro flows where relevant.

If real visual inspection was not possible, final report must say:

```text
Visual validation: NOT VISUALLY VALIDATED
```

and explain what remains to be checked.

Never claim visual validation without seeing the rendered screen.

---

# 23. Testing

Use the smallest relevant validation set first.

Inspect `package.json` for current scripts.

Common project commands may include:

```text
npm test
npm run lint
npm run validate:i18n
npm run validate:changed-types
npm run validate:mobile-runtime
npm run verify:android-device
```

Use targeted tests when possible.

Run broader validation when:

- shared primitives changed;
- navigation changed;
- session/payment logic integration changed;
- i18n infrastructure changed;
- scope is release-critical.

Do not hide pre-existing failures.

Distinguish:

- baseline failure;
- regression caused by current work.

---

# 24. Maestro

The project contains `.maestro/flows`.

Use existing flows for important mobile workflows where available.

Add/extend focused flows when a redesigned workflow is important enough to protect from regression.

Do not claim Maestro validation when Maestro did not actually run.

---

# 25. Tracker Update

For UX tasks, update:

`SAWIYAA_MOBILE_PRODUCT_UX_TRACKER.md`

in the **same task**.

Only mark:

```text
[x]
Status: DONE
```

after applicable acceptance criteria and validation are complete.

If visual validation is required but unavailable, do not falsely close the item.

Append an Execution Log entry including:

- implemented issue IDs;
- what changed;
- validation;
- visual validation;
- remaining work;
- next step.

---

# 26. Documentation Discipline

Do not create new planning/reference files when the information belongs in an existing source of truth.

For mobile Product/UX:

- execution status → `SAWIYAA_MOBILE_PRODUCT_UX_TRACKER.md`;
- design-system / UX rules → `DESIGN.md` when a durable design rule changes;
- agent operating rules → `AGENTS.md`;
- reusable mobile implementation workflow → `.agents/skills/sawiyaa-mobile-ui/`.

Keep these sources synchronized.

---

# 27. Git Safety

Before work:

```text
git status
```

Preserve unrelated changes.

Do not:

- reset unrelated files;
- stash/drop another user's work without permission;
- amend unrelated commits;
- force push;
- commit unless explicitly requested.

After changes, report the exact files changed.

---

# 28. Scope Discipline

Do not opportunistically fix unrelated issues during a focused UX task.

If a nearby issue is discovered:

1. record it;
2. add/update the tracker if appropriate;
3. leave it for a coherent follow-up unless it blocks correctness.

Avoid “while I am here” refactors.

---

# 29. Definition of Done

A mobile workflow is DONE only when all applicable conditions pass:

- user job is clear;
- primary action is obvious;
- navigation is coherent;
- context is preserved;
- no unnecessary backend terminology;
- no duplicate actions/information;
- AR reviewed;
- EN reviewed;
- RTL verified;
- LTR verified;
- loading/empty/error/disabled/success states handled;
- accessibility considered;
- business contracts preserved;
- relevant tests pass;
- real visual result inspected when required;
- tracker updated;
- execution log updated.

---

# 30. Required Final Report

Every implementation phase must end with:

## What was actually changed
Concrete files/workflows and user-visible behavior.

## Why
Tracker issue IDs and the user problem solved.

## What was deliberately not changed
Backend/domain behavior, deferred items, and unrelated areas.

## Validation performed
Commands, tests, and manual scenarios.

## Visual validation
What was actually rendered/inspected, or explicitly `NOT VISUALLY VALIDATED`.

## Remaining issues
Any unresolved or newly discovered follow-up.

## Next recommended step
One coherent next phase or sub-phase.

---

# 31. Current Product Direction

The current highest-priority redesign direction is:

1. Practitioner Schedule.
2. Mobile information architecture.
3. Arabic/English product vocabulary.
4. User-facing error mapping.
5. Practitioner Home.
6. Practitioner Sessions.
7. Patient Booking.
8. Patient Sessions.
9. Finance/Wallet.
10. Messages/Notifications.
11. More/Profile/Settings.
12. Technical decomposition/performance only where required.

Always confirm the live order from `SAWIYAA_MOBILE_PRODUCT_UX_TRACKER.md` before implementation.

---

# Final Reminder

The goal is not to expose every capability.

The goal is to help a Patient or Practitioner complete the right task with the least confusion, least unnecessary navigation, and highest confidence.

**Backend = modules. Mobile = human workflows.**

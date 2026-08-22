# AGENTS.md — Sawiyaa Mobile Engineering & Product Rules

> **Repository:** `D:\Web\full-projects\sawiyaa\sawiyaa-mobile`
>
> This file defines the permanent operating rules for coding agents working on the Sawiyaa mobile application.
> It applies to the entire repository unless a deeper `AGENTS.md` explicitly overrides a rule for a narrower subtree.

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
2. current backend/API contracts and canonical operational capabilities;
3. `SAWIYAA_MOBILE_PRODUCT_UX_TRACKER.md`;
4. `DESIGN.md`;
5. existing project conventions;
6. generic external skills/guidance.

`SAWIYAA_MOBILE_PRODUCT_UX_TRACKER.md` is the active execution tracker.

Do **not** re-audit the entire project for every UX task.

Instead:

1. identify the relevant tracker issue ID(s);
2. perform focused discovery around those workflows;
3. implement the smallest coherent change;
4. validate;
5. update the tracker in the same task.

---

# 4. Sawiyaa Mobile UI Skill

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

use the repository skill:

```text
$sawiyaa-mobile-ui
```

Location:

```text
.agents/skills/sawiyaa-mobile-ui/
```

It is the governing mobile product UI skill.

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

Always prefer the smallest safe coherent change.

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

---

# 11. Sawiyaa Design System

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

Do not visually clone Shezlong, Esaal, or another competitor.

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

# 14. Product Copy

Localization is product writing, not literal translation.

## Arabic

Use concise, natural Modern Standard Arabic.

Avoid:

- backend vocabulary;
- bureaucratic phrasing;
- technical English mixed into Arabic;
- unnecessary paragraphs;
- literal translation of internal terms.

## English

Use concise product English.

Do not mechanically mirror Arabic sentence structure.

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

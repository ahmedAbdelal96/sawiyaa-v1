# Platform Settings Redesign P1 Implementation Plan

> For agentic workers: use superpowers:executing-plans to implement this plan task-by-task.

Goal: Make the backend authoritative for platform-setting domain metadata and effective ownership, and turn the Web platform-settings route into a directory with nested domain pages while preserving current mutation APIs and business behavior.

Architecture: Expand the existing GET /admin/platform-settings response with backward-compatible effective-source, ownership, capability, domain-summary, section, and dedicated-route metadata. Keep single-setting mutation/history endpoints unchanged. Replace the Web page's substring classifier with backend metadata, render a directory-only home, and add nested route wrappers around one shared domain-page surface.

Tech Stack: NestJS/TypeScript/Jest, Next.js 16 App Router, React 19, TypeScript, next-intl, TanStack Query, Vitest, Playwright.

Spec: C:\Users\IT\.codex\attachments\78817399-b7d6-4417-ae1a-406cfca8f892\Pasted text.txt

## Global Constraints

- Preserve business behavior, runtime defaults, setting values, permissions semantics, production bootstrap, and existing configuration keys.
- Preserve existing list, update, reset, and history APIs.
- Do not modify Prisma schema, migrations, or sawiyaa-mobile.
- Do not commit or push.
- Keep payment mutation behind the existing dedicated payment-control workflow.
- Environment and sensitive values remain redacted.
- Arabic RTL remains first-class.

## Review Focus

- No setting has two ordinary primary homes: backend metadata tests prove unique assignment.
- Effective source is not confused with the legacy source field: compatibility tests assert both fields.
- Payment and environment values are safe: contract tests assert dedicated/environment semantics and redaction.
- The home is a directory: Web tests assert no setting cards render without a search query.
- Legacy query URLs remain usable: route tests assert the mapping to nested or dedicated destinations.

### Task 1: Backend metadata and effective settings contract

Files:
- Create: sawiyaa-backend-v1/src/modules/config/registry/admin-platform-settings.metadata.ts
- Modify: sawiyaa-backend-v1/src/modules/config/dto/admin-platform-settings.dto.ts
- Modify: sawiyaa-backend-v1/src/modules/config/services/admin-platform-settings.service.ts
- Modify: sawiyaa-backend-v1/src/modules/config/services/admin-platform-settings.service.spec.ts

Interfaces:
- Produces AdminPlatformSettingDomain, AdminPlatformSettingSection, AdminPlatformSettingOwnership, AdminPlatformSettingEffectiveSource, AdminPlatformSettingCapabilities, AdminPlatformSettingDomainSummary, and enriched setting DTO fields.
- Preserves source: OVERRIDE | CATALOG_DEFAULT for existing clients.

- [ ] Write failing tests for domain assignment, section assignment, effective source, ownership, capabilities, redaction, payment dedicated-control metadata, and domain-summary counts.
- [ ] Run the focused backend spec and verify the expected failures are caused by missing contract fields.
- [ ] Add explicit backend metadata mappings and typed summary metadata. Do not use frontend key matching.
- [ ] Extend the query DTO with an optional domain filter and extend the response with domains and safe advanced settings.
- [ ] Project capabilities from existing configuration permissions and definition risk flags.
- [ ] Keep environment/sensitive values null and expose only safe metadata.
- [ ] Run the focused backend spec and the backend typecheck.

### Task 2: Backend compatibility and contract coverage

Files:
- Modify: sawiyaa-backend-v1/src/modules/config/controllers/admin-platform-settings.controller.ts only if DTO routing requires it.
- Modify: sawiyaa-backend-v1/src/modules/config/services/admin-platform-settings.service.spec.ts

Interfaces:
- Existing GET/PATCH/history routes remain unchanged.
- GET accepts optional domain filtering without breaking old clients.

- [ ] Add tests proving legacy settings remain separate and mutation paths still reject legacy and payment writes.
- [ ] Add tests proving domain summary counts equal unique ordinary domain membership.
- [ ] Run the focused service/controller-adjacent test set.

### Task 3: Web contract types and API hook

Files:
- Modify: sawiyaa-frontend-v1/src/features/admin/platform-settings/types/platform-settings.types.ts
- Modify: sawiyaa-frontend-v1/src/features/admin/platform-settings/api/platform-settings.api.ts
- Modify: sawiyaa-frontend-v1/src/features/admin/platform-settings/hooks/use-platform-settings.ts

Interfaces:
- Web consumes backend domain ids and metadata, never local matching functions.
- listPlatformSettings({ domain }) supports nested domain pages.

- [ ] Add failing type/component assertions for backend-owned domain metadata and domain-filtered queries.
- [ ] Implement the response types and query parameter.
- [ ] Run the platform-settings component type/test checks.

### Task 4: Settings directory and shared domain surface

Files:
- Create: sawiyaa-frontend-v1/src/features/admin/platform-settings/components/PlatformSettingsDirectory.tsx
- Create: sawiyaa-frontend-v1/src/features/admin/platform-settings/components/PlatformSettingsDomainScreen.tsx
- Modify: sawiyaa-frontend-v1/src/features/admin/platform-settings/components/AdminPlatformSettingsScreen.tsx
- Modify: sawiyaa-frontend-v1/messages/ar/admin-platform-settings.json
- Modify: sawiyaa-frontend-v1/messages/en/admin-platform-settings.json
- Modify: sawiyaa-frontend-v1/src/features/admin/platform-settings/components/AdminPlatformSettingsScreen.test.tsx

Interfaces:
- Directory renders cards and compact search results only.
- Domain screen renders only settings returned for its backend domain and groups them by section.
- Existing single-setting editor and history API remain usable.

- [ ] Write failing tests for directory-only home, payment navigation, advanced visibility, domain filtering, grouped sections, readable structured values, and history before/after display.
- [ ] Run the focused Web tests and confirm the failures are missing new behavior.
- [ ] Implement the shared directory/domain surfaces with Arabic and English translations.
- [ ] Humanize byte values, MIME values, arrays, booleans, durations, and structured objects in display.
- [ ] Preserve generic single-setting edit behavior for safe ordinary settings; do not add batch editing.
- [ ] Run focused Web tests and typecheck.

### Task 5: Nested routes and query compatibility

Files:
- Modify: sawiyaa-frontend-v1/src/app/[locale]/(admin)/admin/platform-settings/page.tsx
- Create: route pages for sessions, notifications, messaging, practitioners, patients-accounts, content-academy, general, and advanced.
- Modify: sawiyaa-frontend-v1/src/features/admin/platform-settings/components/AdminPlatformSettingsScreen.test.tsx or add route-focused tests in the existing test location.

Interfaces:
- /admin/platform-settings is the directory.
- Legacy ?domain= links redirect safely to nested routes or /admin/payments.

- [ ] Add failing route tests for nested destinations and legacy query mapping.
- [ ] Implement locale-preserving route wrappers and redirect compatibility.
- [ ] Run the focused route/component tests and Web typecheck.

### Task 6: Backend and Web validation, visual QA, and closure artifact

Files:
- Create: qa-artifacts/platform-settings-redesign-p1/PLATFORM-SETTINGS-REDESIGN-P1-CLOSURE.md
- Modify tests only if verification exposes a scoped regression.

Interfaces:
- No schema migration, no business logic change, no mobile changes.

- [ ] Run backend focused tests, backend typecheck, and relevant backend full suite.
- [ ] Run Web focused component tests, i18n checks, lint/typecheck, and build where feasible.
- [ ] Run the rendered flow in the available Browser path: home, each domain route, advanced, query redirect, and payment navigation.
- [ ] Record exact commands, counts, viewport evidence, changed-file scope, remaining P2 work, and final verdict in the required closure artifact.
- [ ] Verify git status and confirm no commit or push was performed.

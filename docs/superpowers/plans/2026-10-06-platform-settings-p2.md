# P2 Platform Settings Inline Editing Plan

## Outcome

Convert ordinary domain settings from card-to-modal editing into a shared inline draft form with one review/reason step and one atomic backend change-set save. Preserve single-setting APIs, permissions, runtime defaults, payment boundaries, audit requirements, optimistic concurrency, and no-schema/no-mobile constraints.

## Backend

1. Add DTOs and `POST /admin/platform-settings/change-set`.
2. Add a shared configuration-management change-set operation supporting update and reset items in one serializable transaction.
3. Validate all items, permissions, versions, scopes, value types, and file-limit cross-field relationships before writes.
4. Return changed keys, audit IDs, and refreshed effective settings.
5. Keep the existing single-setting update/reset endpoints unchanged.

## Frontend

1. Add a typed change-set API function and React Query mutation.
2. Replace the domain card grid/editor modal with shared `SettingRow`, `SettingControl`, `SettingSection`, draft state, reset-draft, save bar, review panel, and conflict state primitives.
3. Keep typed existing controls, add localized units and compact validation, and keep advanced/system/environment entries read-only.
4. Make reset a draft operation and send changed settings only.
5. Refetch after save, clear drafts after success, and warn before leaving with unsaved changes.
6. Remove unreferenced retired domain implementations and tests after source-reference verification.

## Verification

Add backend tests for valid multi-save, atomic rejection, permissions, cross-field validation, concurrency, mixed update/reset, unchanged items, audit reason, and effective results. Add frontend tests for inline controls, multi-edit, save/cancel/reset/review/validation/conflict/navigation warning, and no routine modal. Run typechecks, focused lint, existing relevant suites, and authenticated visual QA if an approved local fixture/session is available.

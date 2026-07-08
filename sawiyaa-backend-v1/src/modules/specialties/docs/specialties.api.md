# Specialties Module API

## Purpose Of Module

Specialties Module is the source of truth for **practitioner specialties catalog only**.

It owns:
- specialties read/list/get-by-slug
- specialties admin create/update/toggle
- specialty categories read baseline (schema-dependent)

It does not own:
- practitioner-specialty linkage workflows (Practitioners Module)
- article categories
- course categories
- content/academy taxonomy

## Endpoints

Read side:
- `GET /specialties`
- `GET /specialties/:slug`
- `GET /specialty-categories`

Admin side:
- `POST /admin/specialties/categories`
- `PATCH /admin/specialties/categories/:id`
- `POST /admin/specialties`
- `PATCH /admin/specialties/:id`
- `PATCH /admin/specialties/:id/toggle-status`

## Guards Used

Read side:
- `@Public()` (catalog read endpoints are intentionally public for shared consumption)

Admin side:
- `JwtAccessAuthGuard`
- `AdminGuard`
- `ActiveAccountGuard` via `@RequireAccountStates(ACTIVE_ACCOUNT)`

## Main DTOs

- `ListSpecialtiesDto`
- `CreateSpecialtyDto`
- `CreateSpecialtyCategoryDto`
- `UpdateSpecialtyCategoryDto`
- `UpdateSpecialtyDto`
- `ToggleSpecialtyStatusDto`
- `SpecialtyResponseDto`
- `SpecialtyCategoryResponseDto`

## Main Use Cases

- `ListSpecialtiesUseCase`
- `GetSpecialtyBySlugUseCase`
- `ListSpecialtyCategoriesUseCase`
- `CreateSpecialtyUseCase`
- `CreateSpecialtyCategoryUseCase`
- `UpdateSpecialtyCategoryUseCase`
- `UpdateSpecialtyUseCase`
- `ToggleSpecialtyStatusUseCase`

## Response Shape Notes

Specialty response includes:
- `id`
- `name`
- `slug`
- `description`
- `isActive`
- `sortOrder`
- `category` (currently `null` until dedicated specialty-category schema is introduced)
- `createdAt`
- `updatedAt`

No raw database shape or practitioner linkage internals are exposed.

### Category Clarification

- `GET /specialty-categories` returns active specialty categories ordered by `sortOrder`.
- `POST /admin/specialties/categories` creates a new primary category with server-side slug generation.
- `PATCH /admin/specialties/categories/:id` updates primary category data and regenerates slug when title changes.
- `SpecialtyResponse.category` is nullable for legacy specialties that are not linked yet.
- New specialty creation now requires `categoryId` to enforce main-category classification.

## Slug Behavior

- Slug is a canonical identifier for specialty reads (`/specialties/:slug`).
- Slug must be unique at the canonical specialty level.
- On create/update, slug input is normalized to lowercase kebab-case server-side before persistence.
- Update does not require slug changes; when slug is provided, uniqueness is re-validated and conflicts return `409`.
- Slug is not auto-generated in this baseline; admin provides it explicitly.

## Status Toggle Semantics

- `isActive=false` means specialty is hidden from public/read catalog endpoints.
- `isActive=false` also blocks **new** practitioner linkage because practitioners module validates active specialty ids.
- Existing practitioner-specialty links are not deleted automatically by toggle.
- Toggle is catalog-state control, not historical linkage mutation.

## Localized Messages Notes

- success messages are resolved with `I18nService.t(...)`
- business errors use `messageKey` for global filter localization
- keys are namespaced under `specialties.*`

## Boundary Notes

- `Specialties Module` handles practitioner specialties catalog only.
- `Article categories` and `Course categories` belong to different domains and are intentionally excluded.
- Category domain is limited to taxonomy linkage. It does not imply recommendation engines, ranking analytics, or multi-level deep hierarchies beyond the main-category + specialty baseline.

## Out Of Scope

- practitioner linking flows
- article/course category management
- content/academy taxonomy flows
- search ranking and advanced discovery logic
- sessions/payments/reviews/chat concerns

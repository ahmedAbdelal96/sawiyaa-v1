# Training API (V1 Complete)

## Purpose
Training module provides owner/admin authoring for course lifecycle and public catalog reads for published trainings.

## Scope in This Slice
- Public published training list
- Public published training details by slug
- Owner/admin create/update/publish/archive lifecycle
- Owner/admin create/update/list schedules
- Enrollment window + capacity readiness logic
- Patient enrollment runtime (payment-gated)
- External join access control (Zoom link exposure only when eligible)
- Attendance baseline (admin marking + patient visibility)
- Reminder hooks for confirmed enrollment and upcoming schedule

## Explicit Boundaries
- This slice does not include scheduler platform redesign.
- Authoring is owner/admin-only in V1.
- Public endpoints never expose drafts or archived courses.

## Lifecycle Rules (Slice 1)
- `DRAFT` -> `PUBLISHED` is allowed.
- `DRAFT`/`PUBLISHED` -> `ARCHIVED` is allowed.
- Invalid transitions are rejected.

## Schedule Rules (Slice 2)
- Schedules are linked to a single course.
- Schedule windows must be valid:
  - `enrollmentOpenAt < enrollmentCloseAt`
  - `startsAt < endsAt`
  - `enrollmentCloseAt <= startsAt`
- Capacity override (if provided) must be `>= 1`.
- Enrollment-open signal is backend-computed from:
  - schedule status
  - enrollment window
  - schedule start time
  - capacity vs occupied seats snapshot

## Enrollment + Payment Rules (Slice 3)
- Patient can create enrollment only for schedule that is currently enrollable.
- Enrollment starts as `PENDING_PAYMENT`.
- Enrollment is activated only after payment success (`CAPTURED`).
- Failed/expired payments do not activate enrollment.
- One enrollment per `(schedule, user)` is enforced.
- Payment purpose is `COURSE_ENROLLMENT` and is coupled to the enrollment record.

## Join Access Rules (Slice 4)
- Join access is resolved by backend only via patient-owned enrollment endpoint.
- Join is blocked unless enrollment is `ACTIVE`.
- Join is blocked when schedule status is not joinable (`OPEN_FOR_ENROLLMENT`, `FULL`, `STARTED` only).
- Join is blocked outside join window:
  - opens `15` minutes before schedule start
  - closes `180` minutes after schedule end
- Host/internal room URLs are never exposed in patient join contract.
- Public catalog/details endpoints do not include external join URLs.

## Attendance Rules (Final Slice)
- Attendance is baseline-only and admin/owner-controlled.
- Admin can mark enrollment attendance as `ATTENDED` or `NO_SHOW`.
- Marking is blocked for non-operational enrollment states (`PENDING_PAYMENT`, `CANCELLED`, `REFUNDED`).
- Marking is blocked before schedule start.
- Patient enrollment reads include attendance state.

## Reminder Hooks (Final Slice)
- Enrollment confirmation emits best-effort training notification hook.
- Upcoming reminder hook is queued (no scheduler redesign in this slice).
- Hooks are additive and reuse the existing notifications module.

## Visibility Rules
- Public catalog/details return only `PUBLISHED` + `PUBLIC`.
- `DRAFT` and `ARCHIVED` are never visible in public endpoints.

## Endpoints

### Public
- `GET /api/v1/trainings`
- `GET /api/v1/trainings/:slug`

### Owner/Admin
- `POST /api/v1/admin/trainings`
- `GET /api/v1/admin/trainings`
- `GET /api/v1/admin/trainings/:id`
- `PATCH /api/v1/admin/trainings/:id`
- `PATCH /api/v1/admin/trainings/:id/publish`
- `PATCH /api/v1/admin/trainings/:id/archive`
- `GET /api/v1/admin/trainings/:id/schedules`
- `POST /api/v1/admin/trainings/:id/schedules`
- `PATCH /api/v1/admin/trainings/:id/schedules/:scheduleId`
- `GET /api/v1/admin/trainings/:id/schedules/:scheduleId/enrollments`
- `PATCH /api/v1/admin/trainings/:id/enrollments/:enrollmentId/attendance`

### Patient
- `POST /api/v1/patients/me/training/schedules/:scheduleId/enrollments`
- `GET /api/v1/patients/me/training/enrollments`
- `GET /api/v1/patients/me/training/enrollments/:id`
- `GET /api/v1/patients/me/training/enrollments/:id/join-access`

## Deferred Beyond V1
- Advanced attendance analytics
- Full reminder scheduler infrastructure
- LMS features (certificates/quizzes/community)

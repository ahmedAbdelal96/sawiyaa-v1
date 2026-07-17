# Academy Training Finance Consolidation

## Purpose

Sawiyaa now treats **Academy Programs** as the only active learning product.
The legacy course/enrollment branch is retired from runtime creation and retained only until its historical data and payment dependencies are safely removed.

## Source of truth

- **Active aggregates:** `AcademyProgram`, `AcademyProgramSession`, `AcademyProgramEnrollment`, `AcademyProgramPaymentAttempt`, `AcademyProgramSessionAttendance`, and `AcademyLearner`.
- **Active payment purpose:** `ACADEMY_PROGRAM_ENROLLMENT`.
- **Legacy payment purpose:** `COURSE_ENROLLMENT`, present only in historical migrations and the retirement migration's preflight/cleanup logic.
- **Rule:** do not create new legacy enrollments or legacy course payments.
- **Rule:** historical compatibility is preserved until the forward retirement migration is applied.

## Runtime policy

- Academy Programs continue to power the public, patient, and admin learning surfaces, including the mobile v2 Academy flow.
- Legacy creation returns `ACADEMY_LEGACY_ENROLLMENT_DISABLED` before a new legacy payment/enrollment side effect is created.
- Existing canonical payment capture, status, webhook, and redirect flows use `ACADEMY_PROGRAM_ENROLLMENT`; provider logic was not changed.
- The forward migration is `20260716160000_retire_legacy_academy_and_course_models`.
- Its preflight aborts when legacy `COURSE_ENROLLMENT` payments have Refund rows, then removes only retired legacy rows/models and recreates `PaymentPurpose` without the legacy value.
- The migration verifies that canonical Academy program, session, enrollment, payment-attempt, learner, and category-reference counts are unchanged during cleanup.
- The migration has not been applied to the current local database in this work.

## Retirement boundary

The following old models are scheduled for removal by the guarded forward migration:

- `AcademyCourse`, `AcademyCourseLecture`, `AcademyEnrollment`, `AcademyPaymentAttempt`, and `AcademyEnrollmentActivityLog`.
- Unused generic learning models: `Course`, `CourseTranslation`, `CourseSchedule`, `CourseSession`, `Enrollment`, `EnrollmentAttendance`, and `CourseApproval`.
- Their exclusive Prisma enums and the legacy `PaymentPurpose.COURSE_ENROLLMENT` value.

Historical migrations are intentionally unchanged. The retirement migration must be reviewed and applied only after the production preflight confirms that legacy payment/refund dependencies have been reconciled.

## Future retirement plan

1. Keep the legacy branch quarantined while the deployment database is audited.
2. Apply the guarded retirement migration during an approved maintenance window; do not reset or seed the database.
3. Verify canonical Academy public/admin/patient/mobile flows and payment status handling after deployment.
4. Move all active product work to Academy Programs only and remove remaining historical compatibility code after finance/data sign-off.

-- Retire the pre-AcademyProgram learning aggregates in one guarded forward migration.
-- This migration intentionally fails when legacy payment rows have finance history.
DO $$
DECLARE
  canonical_programs_before bigint;
  canonical_sessions_before bigint;
  canonical_enrollments_before bigint;
  canonical_attempts_before bigint;
  canonical_payments_before bigint;
  canonical_learners_before bigint;
  canonical_category_refs_before bigint;
  legacy_refunds bigint;
  legacy_wallet_reservations bigint;
  legacy_wallet_entries bigint;
  legacy_ledger_entries bigint;
  legacy_recoveries bigint;
  legacy_coupon_redemptions bigint;
  legacy_policy_acceptances bigint;
  legacy_canonical_enrollments bigint;
  legacy_canonical_attempts bigint;
  legacy_package_purchases bigint;
  unrelated_payments_before bigint;
  refunds_before bigint;
  wallet_entries_before bigint;
  ledger_entries_before bigint;
  recoveries_before bigint;
BEGIN
  SELECT COUNT(*) INTO canonical_programs_before FROM "AcademyProgram";
  SELECT COUNT(*) INTO canonical_sessions_before FROM "AcademyProgramSession";
  SELECT COUNT(*) INTO canonical_enrollments_before FROM "AcademyProgramEnrollment";
  SELECT COUNT(*) INTO canonical_attempts_before FROM "AcademyProgramPaymentAttempt";
  SELECT COUNT(*) INTO canonical_payments_before
    FROM "Payment"
    WHERE "paymentPurpose"::text = 'ACADEMY_PROGRAM_ENROLLMENT';
  SELECT COUNT(*) INTO canonical_learners_before FROM "AcademyLearner";
  SELECT COUNT(*) INTO canonical_category_refs_before
    FROM "AcademyProgram" WHERE "categoryId" IS NOT NULL;
  SELECT COUNT(*) INTO unrelated_payments_before
    FROM "Payment" WHERE "paymentPurpose"::text <> 'COURSE_ENROLLMENT';
  SELECT COUNT(*) INTO refunds_before FROM "Refund";
  SELECT COUNT(*) INTO wallet_entries_before FROM "CustomerWalletEntry";
  SELECT COUNT(*) INTO ledger_entries_before FROM "LedgerEntry";
  SELECT COUNT(*) INTO recoveries_before FROM "PractitionerRecovery";

  SELECT COUNT(*) INTO legacy_refunds
    FROM "Refund" r
    JOIN "Payment" p ON p."id" = r."paymentId"
    WHERE p."paymentPurpose"::text = 'COURSE_ENROLLMENT';

  IF legacy_refunds > 0 THEN
    RAISE EXCEPTION
      'ACADEMY_LEGACY_RETIREMENT_BLOCKED: % legacy COURSE_ENROLLMENT refund rows require finance review',
      legacy_refunds;
  END IF;

  SELECT COUNT(*) INTO legacy_wallet_reservations
    FROM "CustomerWalletReservation"
    WHERE "paymentId" IN (SELECT "id" FROM "Payment" WHERE "paymentPurpose"::text = 'COURSE_ENROLLMENT');
  SELECT COUNT(*) INTO legacy_wallet_entries
    FROM "CustomerWalletEntry"
    WHERE "paymentId" IN (SELECT "id" FROM "Payment" WHERE "paymentPurpose"::text = 'COURSE_ENROLLMENT');
  SELECT COUNT(*) INTO legacy_ledger_entries
    FROM "LedgerEntry"
    WHERE "paymentId" IN (SELECT "id" FROM "Payment" WHERE "paymentPurpose"::text = 'COURSE_ENROLLMENT');
  SELECT COUNT(*) INTO legacy_recoveries
    FROM "PractitionerRecovery"
    WHERE "paymentId" IN (SELECT "id" FROM "Payment" WHERE "paymentPurpose"::text = 'COURSE_ENROLLMENT');
  SELECT COUNT(*) INTO legacy_coupon_redemptions
    FROM "CouponRedemption"
    WHERE "paymentId" IN (SELECT "id" FROM "Payment" WHERE "paymentPurpose"::text = 'COURSE_ENROLLMENT');
  SELECT COUNT(*) INTO legacy_policy_acceptances
    FROM "RefundPolicyAcceptance"
    WHERE "paymentId" IN (SELECT "id" FROM "Payment" WHERE "paymentPurpose"::text = 'COURSE_ENROLLMENT');
  SELECT COUNT(*) INTO legacy_canonical_enrollments
    FROM "AcademyProgramEnrollment"
    WHERE "paymentId" IN (SELECT "id" FROM "Payment" WHERE "paymentPurpose"::text = 'COURSE_ENROLLMENT');
  SELECT COUNT(*) INTO legacy_canonical_attempts
    FROM "AcademyProgramPaymentAttempt"
    WHERE "paymentId" IN (SELECT "id" FROM "Payment" WHERE "paymentPurpose"::text = 'COURSE_ENROLLMENT');
  SELECT COUNT(*) INTO legacy_package_purchases
    FROM "PatientPackagePurchase"
    WHERE "paymentId" IN (SELECT "id" FROM "Payment" WHERE "paymentPurpose"::text = 'COURSE_ENROLLMENT');

  IF legacy_wallet_reservations + legacy_wallet_entries + legacy_ledger_entries
     + legacy_recoveries + legacy_coupon_redemptions + legacy_policy_acceptances
     + legacy_canonical_enrollments + legacy_canonical_attempts + legacy_package_purchases > 0 THEN
    RAISE EXCEPTION
      'ACADEMY_LEGACY_RETIREMENT_BLOCKED: legacy COURSE_ENROLLMENT payment has finance or canonical dependencies (wallet_reservations=%, wallet_entries=%, ledger_entries=%, recoveries=%, coupon_redemptions=%, policy_acceptances=%, canonical_enrollments=%, canonical_attempts=%, package_purchases=%)',
      legacy_wallet_reservations, legacy_wallet_entries, legacy_ledger_entries,
      legacy_recoveries, legacy_coupon_redemptions, legacy_policy_acceptances,
      legacy_canonical_enrollments, legacy_canonical_attempts, legacy_package_purchases;
  END IF;

  -- The cleanup below is allowed to remove only legacy rows. Canonical rows are
  -- checked again after cleanup before the migration can commit.
  DELETE FROM "PaymentEvent"
    WHERE "paymentId" IN (
      SELECT "id" FROM "Payment"
      WHERE "paymentPurpose"::text = 'COURSE_ENROLLMENT'
    );

  DELETE FROM "AcademyPaymentAttempt";
  DELETE FROM "AcademyEnrollmentActivityLog";
  DELETE FROM "AcademyEnrollment";
  DELETE FROM "AcademyCourseLecture";
  DELETE FROM "AcademyCourse";

  DELETE FROM "EnrollmentAttendance";
  DELETE FROM "CourseApproval";
  DELETE FROM "Enrollment";
  DELETE FROM "CourseSession";
  DELETE FROM "CourseSchedule";
  DELETE FROM "CourseTranslation";
  DELETE FROM "Course";

  DELETE FROM "Payment"
    WHERE "paymentPurpose"::text = 'COURSE_ENROLLMENT';

  -- Remove the retired tables only after their disposable rows are cleared.
  -- Explicit drops keep enum and foreign-key dependencies visible and avoid
  -- relying on broad CASCADE behavior.
  DROP TABLE "AcademyEnrollmentActivityLog";
  DROP TABLE "AcademyPaymentAttempt";
  DROP TABLE "AcademyEnrollment";
  DROP TABLE "AcademyCourseLecture";
  DROP TABLE "AcademyCourse";
  DROP TABLE "EnrollmentAttendance";
  DROP TABLE "CourseApproval";
  DROP TABLE "Enrollment";
  DROP TABLE "CourseSession";
  DROP TABLE "CourseSchedule";
  DROP TABLE "CourseTranslation";
  DROP TABLE "Course";

  IF (SELECT COUNT(*) FROM "AcademyProgram") <> canonical_programs_before
     OR (SELECT COUNT(*) FROM "AcademyProgramSession") <> canonical_sessions_before
     OR (SELECT COUNT(*) FROM "AcademyProgramEnrollment") <> canonical_enrollments_before
     OR (SELECT COUNT(*) FROM "AcademyProgramPaymentAttempt") <> canonical_attempts_before
     OR (SELECT COUNT(*) FROM "Payment"
         WHERE "paymentPurpose"::text = 'ACADEMY_PROGRAM_ENROLLMENT') <> canonical_payments_before
     OR (SELECT COUNT(*) FROM "AcademyLearner") <> canonical_learners_before
     OR (SELECT COUNT(*) FROM "AcademyProgram" WHERE "categoryId" IS NOT NULL) <> canonical_category_refs_before
     OR (SELECT COUNT(*) FROM "Payment" WHERE "paymentPurpose"::text <> 'COURSE_ENROLLMENT') <> unrelated_payments_before
     OR (SELECT COUNT(*) FROM "Refund") <> refunds_before
     OR (SELECT COUNT(*) FROM "CustomerWalletEntry") <> wallet_entries_before
     OR (SELECT COUNT(*) FROM "LedgerEntry") <> ledger_entries_before
     OR (SELECT COUNT(*) FROM "PractitionerRecovery") <> recoveries_before
  THEN
    RAISE EXCEPTION 'ACADEMY_LEGACY_RETIREMENT_BLOCKED: canonical Academy rows changed during cleanup';
  END IF;
END $$;

DROP TYPE IF EXISTS "AcademyEnrollmentStatus";
DROP TYPE IF EXISTS "CourseReviewDecision";
DROP TYPE IF EXISTS "AttendanceSource";
DROP TYPE IF EXISTS "AttendanceStatus";
DROP TYPE IF EXISTS "EnrollmentAttendanceStatus";
DROP TYPE IF EXISTS "EnrollmentStatus";
DROP TYPE IF EXISTS "CourseScheduleStatus";
DROP TYPE IF EXISTS "CourseVisibility";
DROP TYPE IF EXISTS "CourseStatus";
DROP TYPE IF EXISTS "CourseDeliveryMode";
DROP TYPE IF EXISTS "CourseType";

ALTER TYPE "PaymentPurpose" RENAME TO "PaymentPurpose_legacy";
CREATE TYPE "PaymentPurpose" AS ENUM (
  'SESSION_BOOKING',
  'SESSION_INSTANT_BOOKING',
  'SESSION_EXTENSION',
  'SESSION_PACKAGE_PURCHASE',
  'ACADEMY_PROGRAM_ENROLLMENT',
  'MANUAL_INVOICE'
);
ALTER TABLE "Payment"
  ALTER COLUMN "paymentPurpose" TYPE "PaymentPurpose"
  USING "paymentPurpose"::text::"PaymentPurpose";
DROP TYPE "PaymentPurpose_legacy";

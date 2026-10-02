-- Add the immutable patient-safe reschedule event to the existing SessionEvent enum.
ALTER TYPE "SessionEventType" ADD VALUE IF NOT EXISTS 'RESCHEDULED' BEFORE 'PAYMENT_PENDING';

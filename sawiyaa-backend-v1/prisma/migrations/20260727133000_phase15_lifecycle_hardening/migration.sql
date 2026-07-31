-- Phase 1.5: explicit settlement lifecycle states.
ALTER TYPE "PractitionerSettlementStatus" ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
ALTER TYPE "PractitionerSettlementStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "PractitionerSettlementStatus" ADD VALUE IF NOT EXISTS 'CREDITED';
ALTER TYPE "PractitionerSettlementStatus" ADD VALUE IF NOT EXISTS 'PAID_OUT';

import { ConflictException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma, SessionResolutionPatientRemedy, SessionResolutionPractitionerRemedy, SessionStatus } from '@prisma/client';
import { CalculatePackageSessionAllocationService } from '@modules/financial-operations/services/calculate-package-session-allocation.service';
import { ExtractPaymentLedgerBreakdownService } from '@modules/financial-operations/services/extract-payment-ledger-breakdown.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { AdminResolutionFinding, ADMIN_RESOLUTION_FINDINGS } from '../dto/admin-session-resolution.dto';

export type AdminResolutionDecision = {
  findingCode?: AdminResolutionFinding;
  attendanceOutcome?: SessionStatus;
  patientRemedy: SessionResolutionPatientRemedy;
  practitionerRemedy: SessionResolutionPractitionerRemedy;
  reasonCode: string;
  customReasonNote?: string;
  adminNotes: string;
  replacementStartAt?: string;
  idempotencyKey: string;
};

@Injectable()
export class AdminSessionResolutionPolicyService {
  constructor(
    private readonly packageAllocation: CalculatePackageSessionAllocationService,
    private readonly prisma: PrismaService,
    private readonly extractPaymentLedgerBreakdown: ExtractPaymentLedgerBreakdownService,
  ) {}

  normalizeFinding(input: AdminResolutionDecision): AdminResolutionFinding {
    const finding = input.findingCode ?? (input.attendanceOutcome as string | undefined);
    if (!finding || !ADMIN_RESOLUTION_FINDINGS.includes(finding as AdminResolutionFinding)) {
      throw new ConflictException({ error: 'SESSION_RESOLUTION_FINDING_INVALID' });
    }
    if (finding === 'OTHER' && !input.customReasonNote?.trim()) {
      throw new ConflictException({ error: 'SESSION_RESOLUTION_OTHER_NOTE_REQUIRED' });
    }
    return finding as AdminResolutionFinding;
  }

  lifecycleOutcome(finding: AdminResolutionFinding): SessionStatus {
    if (finding === 'SESSION_COMPLETED_AFTER_REVIEW') return SessionStatus.COMPLETED;
    if (finding === 'PATIENT_NO_SHOW') return SessionStatus.PATIENT_NO_SHOW;
    if (finding === 'PRACTITIONER_NO_SHOW') return SessionStatus.PRACTITIONER_NO_SHOW;
    if (finding === 'BOTH_NO_SHOW') return SessionStatus.BOTH_NO_SHOW;
    return SessionStatus.AWAITING_ADMIN_RESOLUTION;
  }

  async buildPlan(input: { sessionId: string; decision: AdminResolutionDecision; tx?: Prisma.TransactionClient }) {
    const finding = this.normalizeFinding(input.decision);
    const db = input.tx ?? this.prisma;
    const session = await db.session.findUnique({
      where: { id: input.sessionId },
      include: { packagePurchase: { include: { payment: true } } },
    });
    if (!session) throw new ConflictException({ error: 'SESSION_NOT_FOUND' });
    const isPackage = session.paymentCoverageType === 'PACKAGE' && Boolean(session.packagePurchaseId);
    let walletCredit: { amount: string; currency: string; source: string } | null = null;
    let warnings: string[] = [];
    let financialFingerprint: Record<string, unknown> = { coverage: session.paymentCoverageType };
    if (input.decision.patientRemedy === SessionResolutionPatientRemedy.CREDIT_WALLET) {
      if (isPackage) {
        const purchase = session.packagePurchase;
        const sessionPackageIndex = (session as typeof session & { packageSessionIndex: number | null }).packageSessionIndex;
        if (!purchase || !sessionPackageIndex || !purchase.sessionCountSnapshot || !purchase.patientPayableTotalSnapshot || !purchase.platformFinalShareSnapshot || !purchase.practitionerFinalShareSnapshot || !purchase.platformOriginalShareSnapshot || !purchase.practitionerOriginalShareSnapshot || !purchase.platformDiscountShareSnapshot || !purchase.practitionerDiscountShareSnapshot || !purchase.discountAmountSnapshot) {
          throw new ConflictException({ error: 'SESSION_RESOLUTION_PACKAGE_REFUND_VALUE_UNAVAILABLE' });
        }
        const allocation = this.packageAllocation.allocate({
          patientPayableTotal: purchase.patientPayableTotalSnapshot,
          platformFinalShare: purchase.platformFinalShareSnapshot,
          practitionerFinalShare: purchase.practitionerFinalShareSnapshot,
          platformOriginalShare: purchase.platformOriginalShareSnapshot,
          practitionerOriginalShare: purchase.practitionerOriginalShareSnapshot,
          platformDiscountShare: purchase.platformDiscountShareSnapshot,
          practitionerDiscountShare: purchase.practitionerDiscountShareSnapshot,
          discountAmount: purchase.discountAmountSnapshot,
          sessionCount: purchase.sessionCountSnapshot,
          sessionIndex: sessionPackageIndex,
        });
        if (purchase.payment) {
          const refunded = await db.refund.aggregate({ where: { paymentId: purchase.payment.id, status: 'SUCCEEDED' }, _sum: { amount: true } });
          const remaining = purchase.payment.amountTotal.sub(refunded._sum.amount ?? new Prisma.Decimal(0));
          if (new Prisma.Decimal(allocation.patientPayableAmount).gt(remaining)) {
            throw new ConflictException({ error: 'SESSION_RESOLUTION_PACKAGE_REFUND_VALUE_UNAVAILABLE' });
          }
          financialFingerprint = {
            coverage: 'PACKAGE',
            paymentId: purchase.payment.id,
            paymentStatus: purchase.payment.status,
            paymentAmount: purchase.payment.amountTotal.toFixed(2),
            paymentCurrency: purchase.payment.currencyCode,
            paymentUpdatedAt: purchase.payment.updatedAt instanceof Date ? purchase.payment.updatedAt.toISOString() : String(purchase.payment.updatedAt ?? ''),
            refundedAmount: (refunded._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
            packagePurchaseId: purchase.id,
            packageUpdatedAt: purchase.updatedAt instanceof Date ? purchase.updatedAt.toISOString() : String(purchase.updatedAt ?? ''),
            packageSessionIndex: sessionPackageIndex,
          };
        } else {
          financialFingerprint = { coverage: 'PACKAGE', packagePurchaseId: purchase.id, packageUpdatedAt: purchase.updatedAt instanceof Date ? purchase.updatedAt.toISOString() : String(purchase.updatedAt ?? ''), packageSessionIndex: sessionPackageIndex };
        }
        walletCredit = { amount: allocation.patientPayableAmount, currency: purchase.payment?.currencyCode ?? purchase.selectedCurrencyCode, source: 'IMMUTABLE_PACKAGE_SESSION_ALLOCATION' };
      } else {
        const payment = await db.payment.findFirst({ where: { sessionId: session.id, amountTotal: { gt: 0 } }, orderBy: { createdAt: 'desc' } });
        if (!payment) throw new ConflictException({ error: 'SESSION_RESOLUTION_WALLET_CREDIT_REQUIRES_VALUE' });
        // Preview must consume the exact same immutable payment readiness
        // contract as refund-ledger execution. This prevents an impact plan
        // from claiming to be executable when ledger posting will roll back.
        this.extractPaymentLedgerBreakdown.extract(payment);
        const refunded = await db.refund.aggregate({ where: { paymentId: payment.id, status: 'SUCCEEDED' }, _sum: { amount: true } });
        const remaining = payment.amountTotal.sub(refunded._sum.amount ?? new Prisma.Decimal(0));
        walletCredit = { amount: remaining.gt(0) ? remaining.toFixed(2) : '0.00', currency: payment.currencyCode, source: 'CAPTURED_PAYMENT_REMAINING' };
        financialFingerprint = {
          coverage: 'DIRECT_PAYMENT', paymentId: payment.id, paymentStatus: payment.status,
          paymentAmount: payment.amountTotal.toFixed(2), paymentCurrency: payment.currencyCode,
          paymentUpdatedAt: payment.updatedAt instanceof Date ? payment.updatedAt.toISOString() : String(payment.updatedAt ?? ''), refundedAmount: (refunded._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
        };
      }
    }
    if (input.decision.patientRemedy === SessionResolutionPatientRemedy.CREATE_REPLACEMENT_SESSION && !input.decision.replacementStartAt) {
      throw new ConflictException({ error: 'SESSION_RESOLUTION_REPLACEMENT_TIME_REQUIRED' });
    }
    if (input.decision.patientRemedy === SessionResolutionPatientRemedy.RESTORE_PACKAGE && !isPackage) {
      throw new ConflictException({ error: 'SESSION_RESOLUTION_RESTORE_REQUIRES_PACKAGE' });
    }
    const plan = {
      findingCode: finding,
      resultingStatus: this.lifecycleOutcome(finding),
      patient: { remedy: input.decision.patientRemedy, walletCredit },
      practitioner: { entitlement: input.decision.practitionerRemedy, accountingReviewWillBeCreated: input.decision.practitionerRemedy === SessionResolutionPractitionerRemedy.CREATE_EARNING_REVIEW },
      replacement: { willCreate: input.decision.patientRemedy === SessionResolutionPatientRemedy.CREATE_REPLACEMENT_SESSION, startAt: input.decision.replacementStartAt ?? null },
      warnings,
    };
    const sessionUpdatedAt = session.updatedAt instanceof Date ? session.updatedAt.toISOString() : String(session.updatedAt ?? '');
    const planHash = createHash('sha256').update(JSON.stringify({ sessionId: input.sessionId, sessionUpdatedAt, status: session.status, financialFingerprint, plan })).digest('hex');
    return { ...plan, planHash };
  }
}

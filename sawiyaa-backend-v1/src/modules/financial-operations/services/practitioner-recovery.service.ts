import { BadRequestException, Injectable } from '@nestjs/common';
import {
  PractitionerRecoveryActionType,
  PractitionerRecoveryReasonCode,
  PractitionerRecoveryStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { PractitionerRecoveryRepository } from '../repositories/practitioner-recovery.repository';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PractitionerRecoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recoveryRepository: PractitionerRecoveryRepository,
  ) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  private toDecimal(value: string | number | Prisma.Decimal) {
    return new Prisma.Decimal(value).toDecimalPlaces(2);
  }

  private throwRecoveryError(code: string, messageKey: string): never {
    throw new BadRequestException({
      messageKey,
      error: code,
    });
  }

  async createRecoveryForRefund(input: {
    practitionerId: string;
    refundId: string;
    paymentId?: string | null;
    sessionId?: string | null;
    sessionEarningReviewId?: string | null;
    settlementId?: string | null;
    payoutId?: string | null;
    amount: string | number | Prisma.Decimal;
    currencyCode: string;
    reasonCode: PractitionerRecoveryReasonCode;
    internalReason?: string | null;
    practitionerFacingNote?: string | null;
    createdByUserId?: string | null;
    tx?: Prisma.TransactionClient;
  }) {
    const amount = this.toDecimal(input.amount);
    if (amount.lte(0)) {
      return { item: null, wasAlreadyRecorded: false };
    }

    const idempotencyKey = [
      'practitioner-recovery',
      input.refundId,
      input.practitionerId,
      input.currencyCode.trim().toUpperCase(),
    ].join(':');

    const existing =
      await this.recoveryRepository.findByIdempotencyKey(
        idempotencyKey,
        input.tx,
      );
    if (existing) {
      return { item: existing, wasAlreadyRecorded: true };
    }

    const recovery = await this.recoveryRepository.create(
      {
        practitionerId: input.practitionerId,
        sessionId: input.sessionId ?? null,
        paymentId: input.paymentId ?? null,
        refundId: input.refundId,
        sessionEarningReviewId: input.sessionEarningReviewId ?? null,
        settlementId: input.settlementId ?? null,
        payoutId: input.payoutId ?? null,
        amount,
        recoveredAmount: new Prisma.Decimal(0),
        currencyCode: input.currencyCode.trim().toUpperCase(),
        status: PractitionerRecoveryStatus.OPEN,
        reasonCode: input.reasonCode,
        internalReason: input.internalReason?.trim() || null,
        practitionerFacingNote: input.practitionerFacingNote?.trim() || null,
        createdByUserId: input.createdByUserId ?? null,
        resolvedByUserId: null,
        resolvedAt: null,
        idempotencyKey,
      },
      input.tx,
    );

    return { item: recovery, wasAlreadyRecorded: false };
  }

  async getOutstandingAmount(input: {
    practitionerId: string;
    currencyCode: string;
    tx?: Prisma.TransactionClient;
  }) {
    const recoveries = await this.recoveryRepository.summarizeOutstanding(
      {
        practitionerId: input.practitionerId,
        currencyCode: input.currencyCode.trim().toUpperCase(),
        tx: input.tx,
      },
    );

    return recoveries.reduce((sum, recovery) => {
      const amount = new Prisma.Decimal(recovery.amount);
      const recovered = new Prisma.Decimal(recovery.recoveredAmount);
      const remaining =
        recovery.status === PractitionerRecoveryStatus.WAIVED
          ? new Prisma.Decimal(0)
          : amount.sub(recovered);
      return sum.add(remaining.gt(0) ? remaining : new Prisma.Decimal(0));
    }, new Prisma.Decimal(0));
  }

  async applyOpenRecoveriesToPayout(input: {
    practitionerId: string;
    currencyCode: string;
    payoutId: string;
    payoutAmount: string | number | Prisma.Decimal;
    operatorUserId?: string | null;
    tx?: Prisma.TransactionClient;
  }) {
    const db = this.getDb(input.tx);
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`practitioner-recovery:${input.practitionerId}:${input.currencyCode.trim().toUpperCase()}`})::bigint)`;

    const recoveries = await this.recoveryRepository.listOpenRecoveries(
      input.practitionerId,
      input.currencyCode.trim().toUpperCase(),
      input.tx,
    );
    const existingActions = await this.recoveryRepository.listActionsByPayoutId(
      input.payoutId,
      input.tx,
    );

    if (recoveries.length === 0) {
      return {
        appliedAmount: new Prisma.Decimal(0),
        appliedCount: 0,
        wasAlreadyApplied: false,
      };
    }

    let remainingPayoutAmount = this.toDecimal(input.payoutAmount).sub(
      existingActions.reduce(
        (sum, action) => sum.add(action.amount),
        new Prisma.Decimal(0),
      ),
    );
    if (remainingPayoutAmount.lt(0)) {
      remainingPayoutAmount = new Prisma.Decimal(0);
    }
    let appliedAmount = new Prisma.Decimal(0);
    let appliedCount = 0;
    const appliedAt = new Date();

    for (const recovery of recoveries) {
      if (remainingPayoutAmount.lte(0)) {
        break;
      }

      const amount = new Prisma.Decimal(recovery.amount);
      const recoveredAmount = new Prisma.Decimal(recovery.recoveredAmount);
      const remaining =
        recovery.status === PractitionerRecoveryStatus.WAIVED
          ? new Prisma.Decimal(0)
          : amount.sub(recoveredAmount);
      if (remaining.lte(0)) {
        continue;
      }

      const appliedToThisRecovery = remainingPayoutAmount.lt(remaining)
        ? remainingPayoutAmount
        : remaining;

      const actionIdempotencyKey = [
        'practitioner-recovery-apply',
        recovery.id,
        input.payoutId,
      ].join(':');

      const existingAction =
        await this.recoveryRepository.findActionByIdempotencyKey(
          actionIdempotencyKey,
          input.tx,
        );
      if (existingAction) {
        continue;
      }

      await this.recoveryRepository.createAction(
        {
          recoveryId: recovery.id,
          actionType: PractitionerRecoveryActionType.APPLIED_TO_PAYOUT,
          amount: appliedToThisRecovery,
          payoutId: input.payoutId,
          reason: null,
          performedByUserId: input.operatorUserId ?? null,
          actorUserId: input.operatorUserId ?? null,
          previousStatus: recovery.status,
          newStatus: recoveredAmount.add(appliedToThisRecovery).gte(amount)
            ? PractitionerRecoveryStatus.RECOVERED
            : PractitionerRecoveryStatus.PARTIALLY_RECOVERED,
          previousRemainingAmount: remaining,
          newRemainingAmount: remaining.sub(appliedToThisRecovery),
          idempotencyKey: actionIdempotencyKey,
        },
        input.tx,
      );

      await this.recoveryRepository.update(
        recovery.id,
        {
          recoveredAmount: recoveredAmount.add(appliedToThisRecovery),
          status:
            recoveredAmount.add(appliedToThisRecovery).gte(amount)
              ? PractitionerRecoveryStatus.RECOVERED
              : PractitionerRecoveryStatus.PARTIALLY_RECOVERED,
          payoutId:
            recoveredAmount.add(appliedToThisRecovery).gte(amount)
              ? input.payoutId
              : null,
          resolvedByUserId:
            recoveredAmount.add(appliedToThisRecovery).gte(amount)
              ? input.operatorUserId ?? null
              : null,
          resolvedAt:
            recoveredAmount.add(appliedToThisRecovery).gte(amount)
              ? appliedAt
              : null,
        },
        input.tx,
      );

      appliedAmount = appliedAmount.add(appliedToThisRecovery);
      appliedCount += 1;
      remainingPayoutAmount = remainingPayoutAmount
        .sub(appliedToThisRecovery)
        .toDecimalPlaces(2);
    }

    return {
      appliedAmount: appliedAmount.toDecimalPlaces(2),
      appliedCount,
      wasAlreadyApplied: false,
    };
  }

  async collectRecovery(input: {
    recoveryId: string;
    amountCollected: string | number | Prisma.Decimal;
    operatorUserId: string;
    idempotencyKey: string;
    note?: string | null;
    tx?: Prisma.TransactionClient;
  }) {
    const db = this.getDb(input.tx);
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`practitioner-recovery:${input.recoveryId}`})::bigint)`;

    const recovery = await this.recoveryRepository.findById(
      input.recoveryId,
      input.tx,
    );
    if (!recovery) {
      return { item: null, wasAlreadyRecorded: false };
    }

    if (
      recovery.status === PractitionerRecoveryStatus.RECOVERED ||
      recovery.status === PractitionerRecoveryStatus.WAIVED
    ) {
      this.throwRecoveryError(
        FINANCIAL_OPS_ERROR_CODES.recoveryAlreadyResolved,
        'financialOperations.errors.recoveryAlreadyResolved',
      );
    }

    const existingAction =
      await this.recoveryRepository.findActionByIdempotencyKey(
        input.idempotencyKey,
        input.tx,
      );
    if (existingAction) {
      return {
        item: await this.recoveryRepository.findById(input.recoveryId, input.tx),
        wasAlreadyRecorded: true,
      };
    }

    const amountCollected = this.toDecimal(input.amountCollected);
    const amount = new Prisma.Decimal(recovery.amount);
    const recovered = new Prisma.Decimal(recovery.recoveredAmount);
    const remaining = amount.sub(recovered);

    if (amountCollected.lte(0)) {
      this.throwRecoveryError(
        FINANCIAL_OPS_ERROR_CODES.recoveryAmountInvalid,
        'financialOperations.errors.recoveryAmountInvalid',
      );
    }

    if (amountCollected.gt(remaining)) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.recoveryAmountExceedsRemaining',
        error: FINANCIAL_OPS_ERROR_CODES.recoveryAmountExceedsRemaining,
      });
    }

    const updatedRecoveredAmount = recovered.add(amountCollected);
    const isFullyRecovered = updatedRecoveredAmount.gte(amount);
    const now = new Date();

    await this.recoveryRepository.createAction(
      {
        recoveryId: recovery.id,
        actionType: PractitionerRecoveryActionType.MANUALLY_COLLECTED,
        amount: amountCollected,
        payoutId: null,
        reason: input.note?.trim() || null,
        performedByUserId: input.operatorUserId,
        actorUserId: input.operatorUserId,
        previousStatus: recovery.status,
        newStatus: isFullyRecovered
          ? PractitionerRecoveryStatus.RECOVERED
          : PractitionerRecoveryStatus.PARTIALLY_RECOVERED,
        previousRemainingAmount: remaining,
        newRemainingAmount: remaining.sub(amountCollected),
        idempotencyKey: input.idempotencyKey,
      },
      input.tx,
    );

    const updated = await this.recoveryRepository.update(
      recovery.id,
      {
        recoveredAmount: updatedRecoveredAmount,
        status: isFullyRecovered
          ? PractitionerRecoveryStatus.RECOVERED
          : PractitionerRecoveryStatus.PARTIALLY_RECOVERED,
        resolvedByUserId: isFullyRecovered ? input.operatorUserId : null,
        resolvedAt: isFullyRecovered ? now : null,
      },
      input.tx,
    );

    return { item: updated, wasAlreadyRecorded: false };
  }

  async waiveRecovery(input: {
    recoveryId: string;
    operatorUserId: string;
    reason: string;
    idempotencyKey: string;
    note?: string | null;
    tx?: Prisma.TransactionClient;
  }) {
    const db = this.getDb(input.tx);
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`practitioner-recovery:${input.recoveryId}`})::bigint)`;

    const recovery = await this.recoveryRepository.findById(
      input.recoveryId,
      input.tx,
    );
    if (!recovery) {
      return { item: null, wasAlreadyRecorded: false };
    }

    if (
      recovery.status === PractitionerRecoveryStatus.RECOVERED ||
      recovery.status === PractitionerRecoveryStatus.WAIVED
    ) {
      this.throwRecoveryError(
        FINANCIAL_OPS_ERROR_CODES.recoveryAlreadyResolved,
        'financialOperations.errors.recoveryAlreadyResolved',
      );
    }

    if (!input.reason.trim()) {
      this.throwRecoveryError(
        FINANCIAL_OPS_ERROR_CODES.recoveryReasonRequired,
        'financialOperations.errors.recoveryReasonRequired',
      );
    }

    const existingAction =
      await this.recoveryRepository.findActionByIdempotencyKey(
        input.idempotencyKey,
        input.tx,
      );
    if (existingAction) {
      return {
        item: await this.recoveryRepository.findById(input.recoveryId, input.tx),
        wasAlreadyRecorded: true,
      };
    }

    const amount = new Prisma.Decimal(recovery.amount);
    const recovered = new Prisma.Decimal(recovery.recoveredAmount);
    const remaining = amount.sub(recovered);

    await this.recoveryRepository.createAction(
      {
        recoveryId: recovery.id,
        actionType: PractitionerRecoveryActionType.WAIVED,
        amount: remaining,
        payoutId: null,
        reason: `${input.reason.trim()}${input.note?.trim() ? ` | ${input.note.trim()}` : ''}`,
        performedByUserId: input.operatorUserId,
        actorUserId: input.operatorUserId,
        previousStatus: recovery.status,
        newStatus: PractitionerRecoveryStatus.WAIVED,
        previousRemainingAmount: remaining,
        newRemainingAmount: new Prisma.Decimal(0),
        idempotencyKey: input.idempotencyKey,
      },
      input.tx,
    );

    const updated = await this.recoveryRepository.update(
      recovery.id,
      {
        status: PractitionerRecoveryStatus.WAIVED,
        resolvedByUserId: input.operatorUserId,
        resolvedAt: new Date(),
      },
      input.tx,
    );

    return { item: updated, wasAlreadyRecorded: false };
  }
}

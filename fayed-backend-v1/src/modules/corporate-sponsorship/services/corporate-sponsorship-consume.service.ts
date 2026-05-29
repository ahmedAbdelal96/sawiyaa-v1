import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CorporateSessionSponsorshipRepository } from '../repositories/corporate-session-sponsorship.repository';
import { CorporateBenefitCodeRepository } from '../repositories/corporate-benefit-code.repository';
import { CorporateLedgerRepository } from '../repositories/corporate-ledger.repository';
import {
  CorporateSponsorshipStatus,
  CorporateCodeStatus,
} from '@prisma/client';

export interface ConsumeSponsorshipResult {
  consumed: boolean;
  sponsorshipId: string;
  codeId: string;
  idempotent: boolean;
}

export interface ConsumeSponsorshipInput {
  sponsorshipId: string;
  sessionId: string;
  paymentId: string;
  paidAmount: string;
  currency: string;
}

@Injectable()
export class CorporateSponsorshipConsumeService {
  constructor(
    private readonly sponsorshipRepository: CorporateSessionSponsorshipRepository,
    private readonly codeRepository: CorporateBenefitCodeRepository,
    private readonly ledgerRepository: CorporateLedgerRepository,
  ) {}

  /**
   * Consume a RESERVED corporate sponsorship after payment success.
   *
   * This marks both the sponsorship and the associated benefit code as consumed.
   * Idempotent: if already consumed for the same session, returns success without throwing.
   *
   * Does NOT require reservedUntil > now, because payment may succeed after TTL
   * but was initiated while reservation was valid. If provider captured payment,
   * we must not leave a paid corporate session unconsumed.
   */
  async consumeAfterPayment(
    input: ConsumeSponsorshipInput,
    tx?: Prisma.TransactionClient,
  ): Promise<ConsumeSponsorshipResult> {
    const sponsorship = await this.sponsorshipRepository.findForConsumeById(
      input.sponsorshipId,
      tx,
    );

    if (!sponsorship) {
      throw new BadRequestException({
        messageKey: 'sponsorship.errors.sponsorshipNotFound',
        error: 'SPONSORSHIP_NOT_FOUND',
      });
    }

    if (sponsorship.sessionId !== input.sessionId) {
      throw new ConflictException({
        messageKey: 'sponsorship.errors.sponsorshipSessionMismatch',
        error: 'SPONSORSHIP_SESSION_MISMATCH',
      });
    }

    if (sponsorship.currency !== input.currency) {
      throw new BadRequestException({
        messageKey: 'sponsorship.errors.currencyMismatch',
        error: 'SPONSORSHIP_CURRENCY_MISMATCH',
      });
    }

    if (sponsorship.patientPayAmount.toFixed(2) !== input.paidAmount) {
      throw new BadRequestException({
        messageKey: 'sponsorship.errors.paidAmountMismatch',
        error: 'SPONSORSHIP_PAID_AMOUNT_MISMATCH',
      });
    }

    if (sponsorship.code.status === CorporateCodeStatus.USED) {
      if (sponsorship.code.reservedSessionId === input.sessionId) {
        if (sponsorship.status === CorporateSponsorshipStatus.CONSUMED) {
          const existingLedger = await this.ledgerRepository.findBySponsorshipIdAndEvent(
            sponsorship.id,
            'CODE_CONSUMED',
            tx,
          );
          if (!existingLedger) {
            await this.ledgerRepository.createCodeConsumedEntry(
              {
                organizationId: sponsorship.organizationId,
                contractId: sponsorship.contractId,
                sponsorshipId: sponsorship.id,
                codeId: sponsorship.code.id,
                sessionId: input.sessionId,
                paymentId: input.paymentId,
                amount: new Prisma.Decimal(sponsorship.coveredAmount.toFixed(2)),
                currency: sponsorship.currency,
                originalAmount: sponsorship.originalAmount,
                coveredAmount: sponsorship.coveredAmount,
                patientPayAmount: sponsorship.patientPayAmount,
              },
              tx,
            );
          }
          return {
            consumed: false,
            sponsorshipId: sponsorship.id,
            codeId: sponsorship.code.id,
            idempotent: true,
          };
        }
        throw new ConflictException({
          messageKey: 'sponsorship.errors.codeSponsorshipInconsistent',
          error: 'SPONSORSHIP_CODE_SPONSORSHIP_INCONSISTENT',
        });
      }
      throw new ConflictException({
        messageKey: 'sponsorship.errors.codeAlreadyUsed',
        error: 'SPONSORSHIP_CODE_ALREADY_USED',
      });
    }

    if (sponsorship.code.status !== CorporateCodeStatus.RESERVED) {
      throw new BadRequestException({
        messageKey: 'sponsorship.errors.codeNotAvailable',
        error: 'SPONSORSHIP_CODE_NOT_AVAILABLE',
      });
    }

    if (sponsorship.code.reservedSessionId !== input.sessionId) {
      throw new ConflictException({
        messageKey: 'sponsorship.errors.codeSessionMismatch',
        error: 'SPONSORSHIP_CODE_SESSION_MISMATCH',
      });
    }

    if (sponsorship.status === CorporateSponsorshipStatus.CONSUMED) {
      const existingLedger = await this.ledgerRepository.findBySponsorshipIdAndEvent(
        sponsorship.id,
        'CODE_CONSUMED',
        tx,
      );
      if (!existingLedger) {
        await this.ledgerRepository.createCodeConsumedEntry(
          {
            organizationId: sponsorship.organizationId,
            contractId: sponsorship.contractId,
            sponsorshipId: sponsorship.id,
            codeId: sponsorship.code.id,
            sessionId: input.sessionId,
            paymentId: input.paymentId,
            amount: new Prisma.Decimal(sponsorship.coveredAmount.toFixed(2)),
            currency: sponsorship.currency,
            originalAmount: sponsorship.originalAmount,
            coveredAmount: sponsorship.coveredAmount,
            patientPayAmount: sponsorship.patientPayAmount,
          },
          tx,
        );
      }
      return {
        consumed: false,
        sponsorshipId: sponsorship.id,
        codeId: sponsorship.code.id,
        idempotent: true,
      };
    }

    if (sponsorship.status === CorporateSponsorshipStatus.RELEASED) {
      throw new BadRequestException({
        messageKey: 'sponsorship.errors.sponsorshipReleased',
        error: 'SPONSORSHIP_RELEASED',
      });
    }

    if (sponsorship.status === CorporateSponsorshipStatus.REFUNDED) {
      throw new BadRequestException({
        messageKey: 'sponsorship.errors.sponsorshipRefunded',
        error: 'SPONSORSHIP_REFUNDED',
      });
    }

    if (sponsorship.status !== CorporateSponsorshipStatus.RESERVED) {
      throw new BadRequestException({
        messageKey: 'sponsorship.errors.sponsorshipNotActive',
        error: 'SPONSORSHIP_NOT_ACTIVE',
      });
    }

    const codeUpdateCount = await this.codeRepository.markUsedForSession(
      sponsorship.code.id,
      input.sessionId,
      tx,
    );

    if (codeUpdateCount === 0) {
      throw new ConflictException({
        messageKey: 'sponsorship.errors.codeConsumeFailed',
        error: 'SPONSORSHIP_CODE_CONSUME_FAILED',
      });
    }

    const sponsorshipUpdateCount = await this.sponsorshipRepository.markConsumed(
      sponsorship.id,
      input.sessionId,
      tx,
    );

    if (sponsorshipUpdateCount === 0) {
      throw new ConflictException({
        messageKey: 'sponsorship.errors.sponsorshipConsumeFailed',
        error: 'SPONSORSHIP_CONSUME_FAILED',
      });
    }

    const existingLedger = await this.ledgerRepository.findBySponsorshipIdAndEvent(
      sponsorship.id,
      'CODE_CONSUMED',
      tx,
    );
    if (!existingLedger) {
      await this.ledgerRepository.createCodeConsumedEntry(
        {
          organizationId: sponsorship.organizationId,
          contractId: sponsorship.contractId,
          sponsorshipId: sponsorship.id,
          codeId: sponsorship.code.id,
          sessionId: input.sessionId,
          paymentId: input.paymentId,
          amount: new Prisma.Decimal(sponsorship.coveredAmount.toFixed(2)),
          currency: sponsorship.currency,
          originalAmount: sponsorship.originalAmount,
          coveredAmount: sponsorship.coveredAmount,
          patientPayAmount: sponsorship.patientPayAmount,
        },
        tx,
      );
    }

    return {
      consumed: true,
      sponsorshipId: sponsorship.id,
      codeId: sponsorship.code.id,
      idempotent: false,
    };
  }
}

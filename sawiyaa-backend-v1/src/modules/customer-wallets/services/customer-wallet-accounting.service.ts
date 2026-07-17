import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CustomerWalletEntryDirection,
  CustomerWalletEntryType,
  CustomerWalletReservationStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { CustomerWalletEntryRepository } from '../repositories/customer-wallet-entry.repository';
import { CustomerWalletReservationRepository } from '../repositories/customer-wallet-reservation.repository';
import { CustomerWalletRepository } from '../repositories/customer-wallet.repository';

@Injectable()
export class CustomerWalletAccountingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerWalletRepository: CustomerWalletRepository,
    private readonly customerWalletEntryRepository: CustomerWalletEntryRepository,
    private readonly customerWalletReservationRepository: CustomerWalletReservationRepository,
  ) {}

  private async lockRefundCreditScope(
    db: PrismaService | Prisma.TransactionClient,
    refundId: string,
  ) {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${refundId})::bigint)`;
  }

  async ensureWallet(input: {
    patientId: string;
    currencyCode: string;
    tx?: Prisma.TransactionClient;
  }) {
    return this.customerWalletRepository.upsertWallet(
      {
        patientId: input.patientId,
        currencyCode: input.currencyCode,
      },
      input.tx,
    );
  }

  async getAvailableBalance(input: {
    patientId: string;
    currencyCode: string;
  }): Promise<Prisma.Decimal> {
    const wallet =
      await this.customerWalletRepository.findByPatientIdAndCurrency(
        input.patientId,
        input.currencyCode,
      );

    return wallet?.availableBalance ?? new Prisma.Decimal(0);
  }

  async reserveForSessionPayment(input: {
    patientId: string;
    paymentId: string;
    sessionId: string;
    currencyCode: string;
    amount: string;
    expiresAt?: Date | null;
    tx?: Prisma.TransactionClient;
  }) {
    const amount = new Prisma.Decimal(input.amount);
    if (amount.lte(0)) return null;

    const run = async (tx: Prisma.TransactionClient) => {
      const existing =
        await this.customerWalletReservationRepository.findByPaymentId(
          input.paymentId,
          tx,
        );

      if (existing) {
        return existing;
      }

      const wallet = await this.ensureWallet({
        patientId: input.patientId,
        currencyCode: input.currencyCode,
        tx,
      });

      const reserved = await this.customerWalletRepository.reserveBalance(
        wallet.id,
        amount.toFixed(2),
        tx,
      );

      if (reserved.count !== 1) {
        throw new BadRequestException({
          messageKey: 'customerWallet.errors.insufficientBalance',
          error: 'CUSTOMER_WALLET_INSUFFICIENT_BALANCE',
        });
      }

      const reservation =
        await this.customerWalletReservationRepository.createReservation(
          {
            walletId: wallet.id,
            patientId: input.patientId,
            paymentId: input.paymentId,
            amount: amount.toFixed(2),
            currencyCode: input.currencyCode,
            expiresAt: input.expiresAt ?? null,
            status: CustomerWalletReservationStatus.ACTIVE,
          },
          tx,
        );

      await this.customerWalletEntryRepository.createEntry(
        {
          walletId: wallet.id,
          patientId: input.patientId,
          paymentId: input.paymentId,
          sessionId: input.sessionId,
          entryType: CustomerWalletEntryType.SESSION_PAYMENT_RESERVE,
          direction: CustomerWalletEntryDirection.DEBIT,
          amount: amount.toFixed(2),
          currencyCode: input.currencyCode,
          referenceType: 'payment',
          referenceId: input.paymentId,
          description: 'Wallet amount reserved for session payment.',
          metadataJson: {
            source: 'payment-initiation',
          },
        },
        tx,
      );

      return reservation;
    };

    if (input.tx) {
      return run(input.tx);
    }

    return this.prisma.$transaction(run);
  }

  async captureReservationForPayment(input: {
    paymentId: string;
    currencyCode: string;
    tx?: Prisma.TransactionClient;
  }) {
    const run = async (tx: Prisma.TransactionClient) => {
      const reservation =
        await this.customerWalletReservationRepository.findByPaymentId(
          input.paymentId,
          tx,
        );

      if (!reservation) {
        return null;
      }

      if (reservation.status === CustomerWalletReservationStatus.CAPTURED) {
        return reservation;
      }

      if (reservation.status === CustomerWalletReservationStatus.RELEASED) {
        throw new BadRequestException({
          messageKey: 'customerWallet.errors.reservationReleased',
          error: 'CUSTOMER_WALLET_RESERVATION_RELEASED',
        });
      }

      const captured =
        await this.customerWalletRepository.captureReservedBalance(
          reservation.walletId,
          reservation.amount.toFixed(2),
          tx,
        );

      if (captured.count !== 1) {
        throw new BadRequestException({
          messageKey: 'customerWallet.errors.captureInsufficientReserved',
          error: 'CUSTOMER_WALLET_CAPTURE_INSUFFICIENT_RESERVED',
        });
      }

      await this.customerWalletReservationRepository.markCaptured(
        reservation.id,
        tx,
      );

      await this.customerWalletEntryRepository.createEntry(
        {
          walletId: reservation.walletId,
          patientId: reservation.patientId,
          paymentId: reservation.paymentId,
          entryType: CustomerWalletEntryType.SESSION_PAYMENT_CAPTURE,
          direction: CustomerWalletEntryDirection.DEBIT,
          amount: reservation.amount.toFixed(2),
          currencyCode: input.currencyCode,
          referenceType: 'payment',
          referenceId: reservation.paymentId,
          description: 'Reserved wallet amount captured for session payment.',
          metadataJson: {
            source: 'payment-captured',
          },
        },
        tx,
      );

      return reservation;
    };

    if (input.tx) {
      return run(input.tx);
    }

    return this.prisma.$transaction(run);
  }

  async releaseReservationForPayment(input: {
    paymentId: string;
    currencyCode: string;
    releaseReason: 'PAYMENT_FAILED' | 'PAYMENT_EXPIRED' | 'PAYMENT_CANCELLED';
    tx?: Prisma.TransactionClient;
  }) {
    const run = async (tx: Prisma.TransactionClient) => {
      const reservation =
        await this.customerWalletReservationRepository.findByPaymentId(
          input.paymentId,
          tx,
        );

      if (!reservation) {
        return null;
      }

      if (reservation.status === CustomerWalletReservationStatus.RELEASED) {
        return reservation;
      }

      if (reservation.status === CustomerWalletReservationStatus.CAPTURED) {
        throw new BadRequestException({
          messageKey: 'customerWallet.errors.reservationCaptured',
          error: 'CUSTOMER_WALLET_RESERVATION_ALREADY_CAPTURED',
        });
      }

      const released =
        await this.customerWalletRepository.releaseReservedBalance(
          reservation.walletId,
          reservation.amount.toFixed(2),
          tx,
        );

      if (released.count !== 1) {
        throw new BadRequestException({
          messageKey: 'customerWallet.errors.releaseInsufficientReserved',
          error: 'CUSTOMER_WALLET_RELEASE_INSUFFICIENT_RESERVED',
        });
      }

      await this.customerWalletReservationRepository.markReleased(
        reservation.id,
        tx,
      );

      await this.customerWalletEntryRepository.createEntry(
        {
          walletId: reservation.walletId,
          patientId: reservation.patientId,
          paymentId: reservation.paymentId,
          entryType: CustomerWalletEntryType.SESSION_PAYMENT_RELEASE,
          direction: CustomerWalletEntryDirection.CREDIT,
          amount: reservation.amount.toFixed(2),
          currencyCode: input.currencyCode,
          referenceType: 'payment',
          referenceId: reservation.paymentId,
          description: `Reserved wallet amount released (${input.releaseReason}).`,
          metadataJson: {
            source: 'payment-release',
            releaseReason: input.releaseReason,
          },
        },
        tx,
      );

      return reservation;
    };

    if (input.tx) {
      return run(input.tx);
    }

    return this.prisma.$transaction(run);
  }

  async creditRefundToWallet(input: {
    patientId: string;
    paymentId: string;
    refundId: string;
    sessionId?: string | null;
    currencyCode: string;
    amount: string;
    tx?: Prisma.TransactionClient;
  }) {
    const amount = new Prisma.Decimal(input.amount);
    if (amount.lte(0)) {
      throw new BadRequestException({
        messageKey: 'customerWallet.errors.invalidCreditAmount',
        error: 'CUSTOMER_WALLET_INVALID_CREDIT_AMOUNT',
      });
    }

    const run = async (tx: Prisma.TransactionClient) => {
      await this.lockRefundCreditScope(tx, input.refundId);

      const existing =
        await this.customerWalletEntryRepository.findRefundCreditEntry(
          input.refundId,
          tx,
        );

      if (existing) {
        return existing;
      }

      const wallet = await this.ensureWallet({
        patientId: input.patientId,
        currencyCode: input.currencyCode,
        tx,
      });

      await this.customerWalletRepository.creditAvailableBalance(
        wallet.id,
        amount.toFixed(2),
        tx,
      );

      return this.customerWalletEntryRepository.createEntry(
        {
          walletId: wallet.id,
          patientId: input.patientId,
          paymentId: input.paymentId,
          refundId: input.refundId,
          sessionId: input.sessionId ?? null,
          entryType: CustomerWalletEntryType.REFUND_CREDIT,
          direction: CustomerWalletEntryDirection.CREDIT,
          amount: amount.toFixed(2),
          currencyCode: input.currencyCode,
          referenceType: 'refund',
          referenceId: input.refundId,
          description: 'Refund credited to customer wallet.',
          metadataJson: {
            source: 'refund-processed',
          },
        },
        tx,
      );
    };

    if (input.tx) {
      return run(input.tx);
    }

    return this.prisma.$transaction(run);
  }

  async getWalletSummary(input: { patientId: string; currencyCode?: string }) {
    if (input.currencyCode) {
      return this.customerWalletRepository.findByPatientIdAndCurrency(
        input.patientId,
        input.currencyCode,
      );
    }

    const wallets = await this.customerWalletRepository.findByPatientId(
      input.patientId,
    );
    return wallets[0] ?? null;
  }

  async listWalletEntries(input: {
    patientId: string;
    currencyCode?: string;
    page: number;
    limit: number;
  }) {
    return this.customerWalletEntryRepository.listByPatientId(input);
  }

  async assertWalletOwnerExists(patientId: string) {
    const wallets =
      await this.customerWalletRepository.findByPatientId(patientId);
    if (wallets.length === 0) {
      return null;
    }
    return wallets;
  }

  async assertWalletExistsByPatientAndCurrency(input: {
    patientId: string;
    currencyCode: string;
  }) {
    const wallet =
      await this.customerWalletRepository.findByPatientIdAndCurrency(
        input.patientId,
        input.currencyCode,
      );
    if (!wallet) {
      throw new NotFoundException({
        messageKey: 'customerWallet.errors.walletNotFound',
        error: 'CUSTOMER_WALLET_NOT_FOUND',
      });
    }
    return wallet;
  }
}

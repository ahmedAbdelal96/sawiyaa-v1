import { randomUUID } from 'node:crypto';
import { PrismaService } from '@common/prisma/prisma.service';
import { CustomerWalletAccountingService } from './services/customer-wallet-accounting.service';
import { CustomerWalletRepository } from './repositories/customer-wallet.repository';
import { CustomerWalletEntryRepository } from './repositories/customer-wallet-entry.repository';
import { CustomerWalletReservationRepository } from './repositories/customer-wallet-reservation.repository';

const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
if (
  url &&
  (!['127.0.0.1', 'localhost'].includes(url.hostname) ||
    !['5432', '55438'].includes(url.port) ||
    !/^\/sawiyaa_(lifecycle_test|redteam_[a-z0-9_]+)$/.test(url.pathname))
) {
  throw new Error(
    'Wallet concurrency proofs require the isolated lifecycle database',
  );
}

(url ? describe : describe.skip)(
  'Wallet lifecycle PostgreSQL concurrency',
  () => {
    const db = new PrismaService();
    const service = new CustomerWalletAccountingService(
      db,
      new CustomerWalletRepository(db),
      new CustomerWalletEntryRepository(db),
      new CustomerWalletReservationRepository(db),
    );
    beforeAll(() => db.$connect());
    afterAll(() => db.$disconnect());

    async function fixture() {
      const user = await db.user.create({
        data: { displayName: 'Wallet concurrency fixture' },
      });
      const practitionerUser = await db.user.create({
        data: { displayName: 'Practitioner fixture' },
      });
      const patient = await db.patientProfile.create({
        data: { userId: user.id },
      });
      const practitioner = await db.practitionerProfile.create({
        data: {
          userId: practitionerUser.id,
          publicSlug: `wallet-proof-${randomUUID()}`,
          practitionerType: 'OTHER',
          status: 'DRAFT',
        },
      });
      const session = await db.session.create({
        data: {
          sessionCode: `W-${randomUUID().slice(0, 16)}`,
          patientId: patient.id,
          practitionerId: practitioner.id,
          flowType: 'SCHEDULED',
          sessionMode: 'VIDEO',
          durationMinutes: 30,
          status: 'PENDING_PAYMENT',
        },
      });
      const wallet = await db.customerWallet.create({
        data: {
          patientId: patient.id,
          currencyCode: 'EGP',
          availableBalance: '100.00',
        },
      });
      async function payment() {
        return db.payment.create({
          data: {
            sessionId: session.id,
            patientId: patient.id,
            practitionerId: practitioner.id,
            paymentPurpose: 'SESSION_BOOKING',
            provider: 'PAYMOB',
            status: 'CREATED',
            amountSubtotal: '100.00',
            amountTotal: '100.00',
            amountDiscount: '0.00',
            amountFromWallet: '80.00',
            amountFromGateway: '20.00',
            currencyCode: 'EGP',
          },
        });
      }
      return { patient, session, wallet, payment };
    }

    it('allows only one of two competing reservations to spend the same funds', async () => {
      const f = await fixture();
      const payments = await Promise.all([f.payment(), f.payment()]);
      const results = await Promise.allSettled(
        payments.map((payment) =>
          service.reserveForSessionPayment({
            patientId: f.patient.id,
            sessionId: f.session.id,
            paymentId: payment.id,
            currencyCode: 'EGP',
            amount: '80.00',
          }),
        ),
      );
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const wallet = await db.customerWallet.findUniqueOrThrow({
        where: { id: f.wallet.id },
      });
      expect(wallet.availableBalance.toFixed(2)).toBe('20.00');
      expect(wallet.reservedBalance.toFixed(2)).toBe('80.00');
      expect(
        await db.customerWalletReservation.count({
          where: { walletId: wallet.id },
        }),
      ).toBe(1);
    });

    it('captures one reservation exactly once under concurrent callbacks', async () => {
      const f = await fixture();
      const payment = await f.payment();
      await service.reserveForSessionPayment({
        patientId: f.patient.id,
        sessionId: f.session.id,
        paymentId: payment.id,
        currencyCode: 'EGP',
        amount: '80.00',
      });
      await Promise.all(
        [1, 2].map(() =>
          service.captureReservationForPayment({
            paymentId: payment.id,
            currencyCode: 'EGP',
          }),
        ),
      );
      const wallet = await db.customerWallet.findUniqueOrThrow({
        where: { id: f.wallet.id },
      });
      expect(wallet.availableBalance.toFixed(2)).toBe('20.00');
      expect(wallet.reservedBalance.toFixed(2)).toBe('0.00');
      expect(
        await db.customerWalletEntry.count({
          where: {
            paymentId: payment.id,
            entryType: 'SESSION_PAYMENT_CAPTURE',
          },
        }),
      ).toBe(1);
    });

    it('rejects cross-currency capture without consuming the reservation', async () => {
      const f = await fixture();
      const payment = await f.payment();
      await service.reserveForSessionPayment({
        patientId: f.patient.id,
        sessionId: f.session.id,
        paymentId: payment.id,
        currencyCode: 'EGP',
        amount: '80.00',
      });
      await expect(
        service.captureReservationForPayment({
          paymentId: payment.id,
          currencyCode: 'USD',
        }),
      ).rejects.toThrow();
      const wallet = await db.customerWallet.findUniqueOrThrow({
        where: { id: f.wallet.id },
      });
      expect(wallet.availableBalance.toFixed(2)).toBe('20.00');
      expect(wallet.reservedBalance.toFixed(2)).toBe('80.00');
    });
  },
);

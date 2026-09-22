import { PaymentStatus, Prisma } from '@prisma/client';

/**
 * Reserves one coupon entitlement while the checkout transaction holds the
 * coupon row lock.  The caller must create the discounted payment in the same
 * transaction immediately after this succeeds.
 */
export async function reserveCouponEconomicIntent(input: {
  tx: Prisma.TransactionClient;
  couponId: string;
  patientId: string;
}): Promise<boolean> {
  const { tx, couponId, patientId } = input;
  await tx.$executeRaw`SELECT id FROM "Coupon" WHERE id = ${couponId}::uuid FOR UPDATE`;
  const coupon = await tx.coupon.findUnique({ where: { id: couponId } });
  if (!coupon) return false;

  const activeWhere = {
    couponId,
    status: {
      in: [
        PaymentStatus.CREATED,
        PaymentStatus.PENDING,
        PaymentStatus.REQUIRES_ACTION,
        PaymentStatus.AUTHORIZED,
      ],
    },
  };
  const [reserved, patientReserved, patientUsed] = await Promise.all([
    tx.payment.count({ where: activeWhere }),
    tx.payment.count({ where: { ...activeWhere, patientId } }),
    tx.couponRedemption.count({ where: { couponId, patientId } }),
  ]);

  return !(
    (coupon.usageLimitTotal != null &&
      coupon.currentUsageCount + reserved >= coupon.usageLimitTotal) ||
    (coupon.usageLimitPerPatient != null &&
      patientUsed + patientReserved >= coupon.usageLimitPerPatient)
  );
}

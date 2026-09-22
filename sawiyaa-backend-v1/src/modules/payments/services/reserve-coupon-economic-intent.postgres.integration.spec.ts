import { randomUUID } from 'node:crypto';
import { CouponScope, CouponStatus, DiscountType, PaymentProvider, PaymentPurpose, PaymentStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { reserveCouponEconomicIntent } from './reserve-coupon-economic-intent.service';

const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
if (url && !/^\/sawiyaa_redteam_[a-z0-9_]+$/.test(url.pathname)) throw new Error('Coupon concurrency proof requires an isolated redteam database');
const describeIfDatabase = url ? describe : describe.skip;

describeIfDatabase('Race 2 coupon economic-intent reservation (PostgreSQL)', () => {
  const prisma = new PrismaService();
  let countryId: string;
  beforeAll(async () => {
    await prisma.$connect();
    countryId = (await prisma.country.upsert({ where: { isoCode: 'EG' }, create: { isoCode: 'EG', name: 'Egypt', slug: 'egypt' }, update: {} })).id;
  });
  afterAll(() => prisma.$disconnect());

  async function patient() {
    const userId = randomUUID();
    await prisma.user.create({ data: { id: userId, displayName: `Coupon race ${userId}` } });
    return (await prisma.patientProfile.create({ data: { id: randomUUID(), userId, countryId } }));
  }
  async function run(useSamePatient: boolean) {
    const actor = await patient();
    const other = useSamePatient ? actor : await patient();
    const coupon = await prisma.coupon.create({ data: {
      code: `R2-${randomUUID().slice(0, 12)}`, slug: `r2-${randomUUID()}`, createdByUserId: actor.userId,
      couponScope: CouponScope.PLATFORM_WIDE, status: CouponStatus.ACTIVE, discountType: DiscountType.FIXED_AMOUNT,
      discountValue: 10, platformSharePercent: 100, practitionerSharePercent: 0, usageLimitTotal: useSamePatient ? null : 1,
      usageLimitPerPatient: useSamePatient ? 1 : null, isActive: true,
    } });
    const claim = async (profileId: string) => prisma.$transaction(async (tx) => {
      const accepted = await reserveCouponEconomicIntent({ tx, couponId: coupon.id, patientId: profileId });
      await tx.payment.create({ data: {
        id: randomUUID(), patientId: profileId, paymentPurpose: PaymentPurpose.MANUAL_INVOICE, provider: PaymentProvider.STRIPE,
        status: PaymentStatus.CREATED, amountSubtotal: 100, amountDiscount: accepted ? 10 : 0, amountTotal: accepted ? 90 : 100,
        amountFromWallet: 0, amountFromGateway: accepted ? 90 : 100, currencyCode: 'EGP', couponId: accepted ? coupon.id : null,
        couponCodeSnapshot: accepted ? coupon.code : null, couponDiscountSnapshot: accepted ? 10 : null,
      } });
      return accepted;
    });
    const result = await Promise.all([claim(actor.id), claim(other.id)]);
    expect(result.filter(Boolean)).toHaveLength(1);
    const payments = await prisma.payment.findMany({ where: { couponId: coupon.id } });
    expect(payments).toHaveLength(1);
    await prisma.couponRedemption.create({ data: {
      couponId: coupon.id, paymentId: payments[0].id, patientId: payments[0].patientId!,
      currencyCode: 'EGP', grossAmount: 100, discountAmount: 10,
      platformDiscountShare: 10, practitionerDiscountShare: 0,
    } });
    expect(await prisma.couponRedemption.count({ where: { couponId: coupon.id } })).toBe(1);
    const all = await prisma.payment.findMany({ where: { patientId: { in: [actor.id, other.id] }, createdAt: { gte: coupon.createdAt } } });
    expect(all.filter((payment) => payment.amountDiscount.gt(0))).toHaveLength(1);
    for (const payment of all) {
      expect(payment.amountSubtotal.sub(payment.amountDiscount).eq(payment.amountTotal)).toBe(true);
      expect(payment.amountFromWallet.add(payment.amountFromGateway).eq(payment.amountTotal)).toBe(true);
    }
  }
  it('allows exactly one final global coupon intent in ten independent races', async () => {
    for (let i = 0; i < 10; i += 1) await run(false);
  }, 60_000);
  it('allows exactly one final per-patient coupon intent in ten independent races', async () => {
    for (let i = 0; i < 10; i += 1) await run(true);
  }, 60_000);
});

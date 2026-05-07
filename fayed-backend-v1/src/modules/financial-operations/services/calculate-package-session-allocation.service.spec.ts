import { Prisma } from '@prisma/client';
import { CalculatePackageSessionAllocationService } from './calculate-package-session-allocation.service';
import { MoneyAmountService } from './money-amount.service';

describe('CalculatePackageSessionAllocationService', () => {
  const service = new CalculatePackageSessionAllocationService(
    new MoneyAmountService(),
  );

  it('splits 4-session totals exactly', () => {
    const allocations = Array.from({ length: 4 }, (_, index) =>
      service.allocate({
        patientPayableTotal: new Prisma.Decimal('100.01'),
        platformFinalShare: new Prisma.Decimal('30.01'),
        practitionerFinalShare: new Prisma.Decimal('70.00'),
        platformOriginalShare: new Prisma.Decimal('40.00'),
        practitionerOriginalShare: new Prisma.Decimal('60.01'),
        platformDiscountShare: new Prisma.Decimal('10.00'),
        practitionerDiscountShare: new Prisma.Decimal('10.00'),
        discountAmount: new Prisma.Decimal('20.00'),
        sessionCount: 4,
        sessionIndex: index + 1,
      }),
    );

    expect(
      allocations.reduce(
        (sum, item) => sum.add(new Prisma.Decimal(item.patientPayableAmount)),
        new Prisma.Decimal(0),
      ).toFixed(2),
    ).toBe('100.01');
    expect(
      allocations.reduce(
        (sum, item) => sum.add(new Prisma.Decimal(item.platformFinalShareAmount)),
        new Prisma.Decimal(0),
      ).toFixed(2),
    ).toBe('30.01');
    expect(
      allocations.reduce(
        (sum, item) =>
          sum.add(new Prisma.Decimal(item.practitionerFinalShareAmount)),
        new Prisma.Decimal(0),
      ).toFixed(2),
    ).toBe('70.00');
  });

  it('splits 6-session totals exactly', () => {
    const allocations = Array.from({ length: 6 }, (_, index) =>
      service.allocate({
        patientPayableTotal: new Prisma.Decimal('100.00'),
        platformFinalShare: new Prisma.Decimal('50.00'),
        practitionerFinalShare: new Prisma.Decimal('50.00'),
        platformOriginalShare: new Prisma.Decimal('60.00'),
        practitionerOriginalShare: new Prisma.Decimal('40.00'),
        platformDiscountShare: new Prisma.Decimal('10.00'),
        practitionerDiscountShare: new Prisma.Decimal('10.00'),
        discountAmount: new Prisma.Decimal('20.00'),
        sessionCount: 6,
        sessionIndex: index + 1,
      }),
    );

    expect(
      allocations.reduce(
        (sum, item) => sum.add(new Prisma.Decimal(item.patientPayableAmount)),
        new Prisma.Decimal(0),
      ).toFixed(2),
    ).toBe('100.00');
    expect(
      allocations.reduce(
        (sum, item) => sum.add(new Prisma.Decimal(item.roundingAdjustmentAmount)),
        new Prisma.Decimal(0),
      ).toFixed(2),
    ).toBe('0.00');
  });

  it('splits 8-session totals with deterministic remainder on the final session', () => {
    const allocations = Array.from({ length: 8 }, (_, index) =>
      service.allocate({
        patientPayableTotal: new Prisma.Decimal('80.03'),
        platformFinalShare: new Prisma.Decimal('32.01'),
        practitionerFinalShare: new Prisma.Decimal('48.02'),
        platformOriginalShare: new Prisma.Decimal('40.00'),
        practitionerOriginalShare: new Prisma.Decimal('40.03'),
        platformDiscountShare: new Prisma.Decimal('8.00'),
        practitionerDiscountShare: new Prisma.Decimal('8.01'),
        discountAmount: new Prisma.Decimal('16.01'),
        sessionCount: 8,
        sessionIndex: index + 1,
      }),
    );

    expect(allocations[7]?.patientPayableAmount).toBe('10.03');
    expect(
      allocations.reduce(
        (sum, item) =>
          sum.add(new Prisma.Decimal(item.platformDiscountShareAmount)),
        new Prisma.Decimal(0),
      ).toFixed(2),
    ).toBe('8.00');
    expect(
      allocations.reduce(
        (sum, item) =>
          sum.add(new Prisma.Decimal(item.practitionerDiscountShareAmount)),
        new Prisma.Decimal(0),
      ).toFixed(2),
    ).toBe('8.01');
  });
});

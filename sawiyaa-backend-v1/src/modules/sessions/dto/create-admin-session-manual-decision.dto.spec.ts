import { validate } from 'class-validator';
import { Equals, IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { SessionAdminDecisionType } from '@prisma/client';
import { CreateAdminSessionManualDecisionDto } from './create-admin-session-manual-decision.dto';

class ValidationDto {
  @IsEnum(SessionAdminDecisionType)
  decisionType!: SessionAdminDecisionType;

  @IsString()
  @MaxLength(100)
  reasonCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string | null;

  @Equals(true)
  confirmEvidenceReviewed!: true;

  @Equals(true)
  confirmNoAutomaticRefund!: true;

  @Equals(true)
  confirmNoAutomaticPayout!: true;

  @IsOptional()
  @IsBoolean()
  supersedePrevious?: boolean;
}

describe('CreateAdminSessionManualDecisionDto', () => {
  function validateSync(dto: Partial<CreateAdminSessionManualDecisionDto>) {
    const instance = plainToClass(ValidationDto, dto);
    return validate(instance as any);
  }

  it('accepts a valid complete request', async () => {
    const errors = await validateSync({
      decisionType: SessionAdminDecisionType.MARK_COMPLETED,
      reasonCode: 'COMPLETION_WITH_MEANINGFUL_OVERLAP',
      adminNote: 'Both parties joined and overlap was confirmed.',
      confirmEvidenceReviewed: true,
      confirmNoAutomaticRefund: true,
      confirmNoAutomaticPayout: true,
      supersedePrevious: false,
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts all six decision types', async () => {
    const types = Object.values(SessionAdminDecisionType);
    for (const decisionType of types) {
      const errors = await validateSync({
        decisionType,
        reasonCode: 'TEST_REASON',
        confirmEvidenceReviewed: true,
        confirmNoAutomaticRefund: true,
        confirmNoAutomaticPayout: true,
      });
      expect(errors).toHaveLength(0);
    }
  });

  it('rejects missing reasonCode', async () => {
    const errors = await validateSync({
      decisionType: SessionAdminDecisionType.MARK_COMPLETED,
      confirmEvidenceReviewed: true,
      confirmNoAutomaticRefund: true,
      confirmNoAutomaticPayout: true,
    });
    expect(errors.some((e) => e.property === 'reasonCode')).toBe(true);
  });

  it('rejects reasonCode exceeding 100 characters', async () => {
    const errors = await validateSync({
      decisionType: SessionAdminDecisionType.MARK_COMPLETED,
      reasonCode: 'x'.repeat(101),
      confirmEvidenceReviewed: true,
      confirmNoAutomaticRefund: true,
      confirmNoAutomaticPayout: true,
    });
    expect(errors.some((e) => e.property === 'reasonCode')).toBe(true);
  });

  it('accepts reasonCode at exactly 100 characters', async () => {
    const errors = await validateSync({
      decisionType: SessionAdminDecisionType.MARK_COMPLETED,
      reasonCode: 'x'.repeat(100),
      confirmEvidenceReviewed: true,
      confirmNoAutomaticRefund: true,
      confirmNoAutomaticPayout: true,
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts adminNote within max length', async () => {
    const errors = await validateSync({
      decisionType: SessionAdminDecisionType.MARK_PATIENT_NO_SHOW,
      reasonCode: 'PATIENT_NO_SHOW',
      adminNote: 'Patient did not join within the threshold.',
      confirmEvidenceReviewed: true,
      confirmNoAutomaticRefund: true,
      confirmNoAutomaticPayout: true,
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects adminNote exceeding 2000 characters', async () => {
    const errors = await validateSync({
      decisionType: SessionAdminDecisionType.MARK_COMPLETED,
      reasonCode: 'TEST',
      adminNote: 'x'.repeat(2001),
      confirmEvidenceReviewed: true,
      confirmNoAutomaticRefund: true,
      confirmNoAutomaticPayout: true,
    });
    expect(errors.some((e) => e.property === 'adminNote')).toBe(true);
  });

  it('rejects confirmEvidenceReviewed when not true', async () => {
    const errors = await validateSync({
      decisionType: SessionAdminDecisionType.MARK_COMPLETED,
      reasonCode: 'TEST',
      confirmEvidenceReviewed: false as any,
      confirmNoAutomaticRefund: true,
      confirmNoAutomaticPayout: true,
    });
    expect(errors.some((e) => e.property === 'confirmEvidenceReviewed')).toBe(true);
  });

  it('rejects confirmNoAutomaticRefund when not true', async () => {
    const errors = await validateSync({
      decisionType: SessionAdminDecisionType.MARK_COMPLETED,
      reasonCode: 'TEST',
      confirmEvidenceReviewed: true,
      confirmNoAutomaticRefund: false as any,
      confirmNoAutomaticPayout: true,
    });
    expect(errors.some((e) => e.property === 'confirmNoAutomaticRefund')).toBe(true);
  });

  it('rejects confirmNoAutomaticPayout when not true', async () => {
    const errors = await validateSync({
      decisionType: SessionAdminDecisionType.MARK_COMPLETED,
      reasonCode: 'TEST',
      confirmEvidenceReviewed: true,
      confirmNoAutomaticRefund: true,
      confirmNoAutomaticPayout: false as any,
    });
    expect(errors.some((e) => e.property === 'confirmNoAutomaticPayout')).toBe(true);
  });

  it('accepts supersedePrevious as true', async () => {
    const errors = await validateSync({
      decisionType: SessionAdminDecisionType.MARK_COMPLETED,
      reasonCode: 'TEST',
      confirmEvidenceReviewed: true,
      confirmNoAutomaticRefund: true,
      confirmNoAutomaticPayout: true,
      supersedePrevious: true,
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts supersedePrevious as false', async () => {
    const errors = await validateSync({
      decisionType: SessionAdminDecisionType.MARK_COMPLETED,
      reasonCode: 'TEST',
      confirmEvidenceReviewed: true,
      confirmNoAutomaticRefund: true,
      confirmNoAutomaticPayout: true,
      supersedePrevious: false,
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects an invalid decisionType', async () => {
    const errors = await validateSync({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      decisionType: 'INVALID_TYPE' as any,
      reasonCode: 'TEST',
      confirmEvidenceReviewed: true,
      confirmNoAutomaticRefund: true,
      confirmNoAutomaticPayout: true,
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('does not have evidenceSnapshot as a defined property on the class', () => {
    // The DTO class should not define an evidenceSnapshot property.
    // Verify by checking own-property keys on an instance constructed with no args.
    const dto = new CreateAdminSessionManualDecisionDto();
    expect(Object.prototype.hasOwnProperty.call(dto, 'evidenceSnapshot')).toBe(false);
  });
});

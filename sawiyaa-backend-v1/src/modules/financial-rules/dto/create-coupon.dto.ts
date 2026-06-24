import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CouponScope, CouponStatus, DiscountType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCouponDto {
  @ApiProperty({ example: 'WELCOME10' })
  @IsString()
  @MaxLength(64)
  code!: string;

  @ApiProperty({ example: 'welcome-10' })
  @IsString()
  @MaxLength(191)
  slug!: string;

  @ApiProperty({ enum: CouponScope })
  @IsEnum(CouponScope)
  couponScope!: CouponScope;

  @ApiProperty({ enum: CouponStatus, example: CouponStatus.ACTIVE })
  @IsEnum(CouponStatus)
  status!: CouponStatus;

  @ApiProperty({ enum: DiscountType })
  @IsEnum(DiscountType)
  discountType!: DiscountType;

  @ApiProperty({ example: '10.00' })
  @IsNumberString()
  discountValue!: string;

  @ApiPropertyOptional({ example: '150.00' })
  @IsOptional()
  @IsNumberString()
  maxDiscountAmount?: string;

  @ApiProperty({ example: '100.00' })
  @IsNumberString()
  platformSharePercent!: string;

  @ApiProperty({ example: '0.00' })
  @IsNumberString()
  practitionerSharePercent!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimitTotal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimitPerPatient?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional({ example: '2026-04-01T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  approvedAt?: string;

  @ApiPropertyOptional({ example: '2026-04-01T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  startsAt?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsString()
  endsAt?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerPractitionerId?: string;
}

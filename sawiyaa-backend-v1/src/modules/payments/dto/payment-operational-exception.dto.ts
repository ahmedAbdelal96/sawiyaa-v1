import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PaymentOperationalExceptionStatus,
  PaymentOperationalExceptionType,
  PaymentProvider,
} from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ListPaymentOperationalExceptionsDto {
  @ApiPropertyOptional({ enum: PaymentOperationalExceptionType })
  @IsOptional()
  @IsEnum(PaymentOperationalExceptionType)
  type?: PaymentOperationalExceptionType;

  @ApiPropertyOptional({ enum: PaymentOperationalExceptionStatus })
  @IsOptional()
  @IsEnum(PaymentOperationalExceptionStatus)
  status?: PaymentOperationalExceptionStatus;

  @ApiPropertyOptional({ enum: PaymentProvider })
  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  createdFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  createdTo?: string;
}

export class CreatePaymentOperationalExceptionDto {
  @ApiProperty()
  @IsUUID()
  paymentId!: string;

  @ApiProperty({ enum: PaymentOperationalExceptionType })
  @IsEnum(PaymentOperationalExceptionType)
  type!: PaymentOperationalExceptionType;

  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  reason!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerUserId?: string;

  @ApiPropertyOptional({ description: 'Stable idempotency key for the same operational case.' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  dedupeKey?: string;
}

export class ResolvePaymentOperationalExceptionDto {
  @ApiProperty({ enum: [PaymentOperationalExceptionStatus.IN_REVIEW, PaymentOperationalExceptionStatus.RESOLVED, PaymentOperationalExceptionStatus.DISMISSED] })
  @IsEnum(PaymentOperationalExceptionStatus)
  status!: PaymentOperationalExceptionStatus;

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  resolutionNote!: string;
}

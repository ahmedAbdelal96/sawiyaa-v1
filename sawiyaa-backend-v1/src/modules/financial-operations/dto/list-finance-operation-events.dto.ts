import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  RefundStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export enum FinanceOperationTypeDto {
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
}

export enum FinanceOperationSortByDto {
  OCCURRED_AT = 'OCCURRED_AT',
  CREATED_AT = 'CREATED_AT',
}

export enum FinanceOperationSortOrderDto {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class ListFinanceOperationEventsDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: FinanceOperationTypeDto })
  @IsOptional()
  @IsEnum(FinanceOperationTypeDto)
  operationType?: FinanceOperationTypeDto;

  @ApiPropertyOptional({ enum: PaymentProvider })
  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;

  @ApiPropertyOptional({ enum: PaymentPurpose })
  @IsOptional()
  @IsEnum(PaymentPurpose)
  paymentPurpose?: PaymentPurpose;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ enum: RefundStatus })
  @IsOptional()
  @IsEnum(RefundStatus)
  refundStatus?: RefundStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  paymentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  refundId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  occurredFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  occurredTo?: string;

  @ApiPropertyOptional({
    enum: FinanceOperationSortByDto,
    default: FinanceOperationSortByDto.OCCURRED_AT,
  })
  @IsOptional()
  @IsEnum(FinanceOperationSortByDto)
  sortBy?: FinanceOperationSortByDto = FinanceOperationSortByDto.OCCURRED_AT;

  @ApiPropertyOptional({
    enum: FinanceOperationSortOrderDto,
    default: FinanceOperationSortOrderDto.DESC,
  })
  @IsOptional()
  @IsEnum(FinanceOperationSortOrderDto)
  sortOrder?: FinanceOperationSortOrderDto = FinanceOperationSortOrderDto.DESC;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  query?: string;
}

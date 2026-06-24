import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  RefundDestination,
  SessionCancellationBookingType,
  SessionCancellationRefundMode,
} from '@prisma/client';
import { Type } from 'class-transformer';

export class SessionCancellationPolicyRuleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty()
  priority!: number;

  @ApiPropertyOptional({ nullable: true })
  minHoursBeforeStart!: number | null;

  @ApiPropertyOptional({ nullable: true })
  maxHoursBeforeStart!: number | null;

  @ApiProperty()
  isCancellationAllowed!: boolean;

  @ApiProperty({ enum: SessionCancellationRefundMode })
  refundMode!: SessionCancellationRefundMode;

  @ApiPropertyOptional({ nullable: true })
  refundPercent!: string | null;

  @ApiProperty()
  isActive!: boolean;
}

export class SessionCancellationPolicyItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: SessionCancellationBookingType })
  bookingType!: SessionCancellationBookingType;

  @ApiProperty()
  displayName!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ enum: RefundDestination })
  defaultRefundDestination!: RefundDestination;

  @ApiProperty()
  version!: number;

  @ApiProperty({ type: SessionCancellationPolicyRuleDto, isArray: true })
  rules!: SessionCancellationPolicyRuleDto[];
}

export class SessionCancellationPoliciesDataResponseDto {
  @ApiProperty({ type: SessionCancellationPolicyItemDto, isArray: true })
  items!: SessionCancellationPolicyItemDto[];
}

export class SessionCancellationPoliciesSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: SessionCancellationPoliciesDataResponseDto })
  data!: SessionCancellationPoliciesDataResponseDto;
}

export class SessionCancellationPolicyDataResponseDto {
  @ApiProperty({ type: SessionCancellationPolicyItemDto })
  item!: SessionCancellationPolicyItemDto;
}

export class SessionCancellationPolicySuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: SessionCancellationPolicyDataResponseDto })
  data!: SessionCancellationPolicyDataResponseDto;
}

export class UpdateSessionCancellationPolicyRuleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @ApiProperty()
  @IsInt()
  priority!: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minHoursBeforeStart?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxHoursBeforeStart?: number | null;

  @ApiProperty()
  @IsBoolean()
  isCancellationAllowed!: boolean;

  @ApiProperty({ enum: SessionCancellationRefundMode })
  @IsEnum(SessionCancellationRefundMode)
  refundMode!: SessionCancellationRefundMode;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  refundPercent?: number | null;

  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}

export class UpdateSessionCancellationPolicyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;

  @ApiProperty({ enum: RefundDestination })
  @IsEnum(RefundDestination)
  defaultRefundDestination!: RefundDestination;

  @ApiProperty({ type: UpdateSessionCancellationPolicyRuleDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSessionCancellationPolicyRuleDto)
  rules!: UpdateSessionCancellationPolicyRuleDto[];
}

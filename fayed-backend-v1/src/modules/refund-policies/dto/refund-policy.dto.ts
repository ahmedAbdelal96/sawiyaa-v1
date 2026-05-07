import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  Min,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { RefundPolicyType } from '@prisma/client';

export class RefundPolicyClauseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  titleAr!: string | null;

  @ApiPropertyOptional({ nullable: true })
  titleEn!: string | null;

  @ApiProperty()
  bodyAr!: string;

  @ApiProperty()
  bodyEn!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class RefundPolicyDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: RefundPolicyType })
  policyType!: RefundPolicyType;

  @ApiProperty()
  key!: string;

  @ApiPropertyOptional({ nullable: true })
  titleAr!: string | null;

  @ApiPropertyOptional({ nullable: true })
  titleEn!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: RefundPolicyClauseDto, isArray: true })
  clauses!: RefundPolicyClauseDto[];

  @ApiProperty()
  clauseCount!: number;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty()
  createdAt!: string;
}

export class RefundPoliciesResponseDto {
  @ApiProperty({ type: RefundPolicyDto, isArray: true })
  items!: RefundPolicyDto[];
}

export class UpdateRefundPolicyDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  titleAr?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  titleEn?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateRefundPolicyClauseDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  titleAr?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  titleEn?: string | null;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  bodyAr!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  bodyEn!: string;

  @ApiPropertyOptional()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateRefundPolicyClauseDto extends CreateRefundPolicyClauseDto {}

export class ReorderRefundPolicyClausesItemDto {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  sortOrder!: number;
}

export class ReorderRefundPolicyClausesDto {
  @ApiProperty({ type: ReorderRefundPolicyClausesItemDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderRefundPolicyClausesItemDto)
  items!: ReorderRefundPolicyClausesItemDto[];
}

export class PublicRefundPolicyListItemDto extends RefundPolicyDto {}

export class PublicRefundPoliciesCurrentResponseDto {
  @ApiProperty({ type: PublicRefundPolicyListItemDto, isArray: true })
  items!: PublicRefundPolicyListItemDto[];
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PractitionerPayoutMethodType } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class PractitionerPayoutDestinationInputDto {
  @ApiProperty({ enum: PractitionerPayoutMethodType })
  @IsEnum(PractitionerPayoutMethodType)
  methodType!: PractitionerPayoutMethodType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(191)
  accountHolderName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(191)
  bankName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(191)
  bankAccountNumber?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(191)
  iban?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(191)
  walletProvider?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(191)
  walletIdentifier?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  otherDetails?: string | null;
}

export class PractitionerPayoutDestinationResponseDto {
  @ApiProperty({ enum: PractitionerPayoutMethodType, nullable: true })
  methodType!: PractitionerPayoutMethodType | null;

  @ApiPropertyOptional({ nullable: true })
  accountHolderName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  bankName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  bankAccountNumber!: string | null;

  @ApiPropertyOptional({ nullable: true })
  iban!: string | null;

  @ApiPropertyOptional({ nullable: true })
  walletProvider!: string | null;

  @ApiPropertyOptional({ nullable: true })
  walletIdentifier!: string | null;

  @ApiPropertyOptional({ nullable: true })
  otherDetails!: string | null;
}

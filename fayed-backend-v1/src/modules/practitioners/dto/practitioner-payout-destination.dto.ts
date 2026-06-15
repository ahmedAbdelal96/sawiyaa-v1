import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PractitionerPayoutMethodType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class PractitionerPayoutDestinationInputDto {
  @ApiProperty({ enum: PractitionerPayoutMethodType })
  @IsEnum(PractitionerPayoutMethodType)
  methodType!: PractitionerPayoutMethodType;

  @ApiPropertyOptional()
  @ValidateIf((input) => input.methodType !== undefined && input.methodType !== null)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(191)
  accountHolderName?: string | null;

  @ApiPropertyOptional()
  @ValidateIf((input) => input.methodType === PractitionerPayoutMethodType.BANK_ACCOUNT)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(191)
  bankName?: string | null;

  @ApiPropertyOptional()
  @ValidateIf((input) => input.methodType === PractitionerPayoutMethodType.BANK_ACCOUNT)
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(191)
  bankAccountNumber?: string | null;

  @ApiPropertyOptional()
  @ValidateIf((input) => input.methodType === PractitionerPayoutMethodType.IBAN)
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(191)
  iban?: string | null;

  @ApiPropertyOptional()
  @ValidateIf((input) => input.methodType === PractitionerPayoutMethodType.WALLET)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(191)
  walletProvider?: string | null;

  @ApiPropertyOptional()
  @ValidateIf((input) => input.methodType === PractitionerPayoutMethodType.WALLET)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(191)
  walletIdentifier?: string | null;

  @ApiPropertyOptional()
  @ValidateIf((input) => input.methodType === PractitionerPayoutMethodType.OTHER)
  @IsString()
  @IsNotEmpty()
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

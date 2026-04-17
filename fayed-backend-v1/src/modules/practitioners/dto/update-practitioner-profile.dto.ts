import { ApiPropertyOptional } from '@nestjs/swagger';
import { PractitionerGender, PractitionerType } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PractitionerPayoutDestinationInputDto } from './practitioner-payout-destination.dto';

/**
 * Phase 1 practitioner profile update DTO keeps the write surface focused on baseline profile readiness fields.
 */
export class UpdatePractitionerProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  professionalTitle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  bio?: string | null;

  @ApiPropertyOptional({
    description: 'Active country ISO code for practitioner profile linkage',
  })
  @IsOptional()
  @IsString()
  @Length(2, 3)
  @Matches(/^[A-Za-z]{2,3}$/)
  countryCode?: string | null;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 80,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(80)
  yearsOfExperience?: number | null;

  @ApiPropertyOptional({ enum: PractitionerType })
  @IsOptional()
  @IsEnum(PractitionerType)
  practitionerType?: PractitionerType;

  @ApiPropertyOptional({ enum: PractitionerGender })
  @IsOptional()
  @IsEnum(PractitionerGender)
  practitionerGender?: PractitionerGender | null;

  @ApiPropertyOptional({ enum: ['ar', 'en'] })
  @IsOptional()
  @IsString()
  @Matches(/^(ar|en)$/)
  locale?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Lowercase language codes linked to the practitioner profile, such as ar/en.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(10, { each: true })
  languageCodes?: string[];

  @ApiPropertyOptional({
    type: PractitionerPayoutDestinationInputDto,
    description: 'Preferred payout receiving method for future settlements',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PractitionerPayoutDestinationInputDto)
  payoutDestination?: PractitionerPayoutDestinationInputDto | null;
}

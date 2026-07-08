import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AcademyProgramDeliveryMethod } from '@prisma/client';

export class CreateAcademyProgramSessionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(191)
  titleAr!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(191)
  titleEn!: string;

  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsEnum(AcademyProgramDeliveryMethod)
  deliveryMethod!: AcademyProgramDeliveryMethod;

  @IsOptional()
  @IsString()
  internalDeliveryNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  internalDeliveryLink?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

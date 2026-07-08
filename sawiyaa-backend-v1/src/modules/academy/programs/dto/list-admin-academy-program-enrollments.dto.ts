import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsIn, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { AcademyProgramEnrollmentStatus, PaymentStatus, Prisma } from '@prisma/client';

export const ACADEMY_PROGRAM_ENROLLMENT_SORT_FIELDS = [
  'registeredAt',
  'name',
] as const;

export type AcademyProgramEnrollmentSortField =
  (typeof ACADEMY_PROGRAM_ENROLLMENT_SORT_FIELDS)[number];

export class ListAdminAcademyProgramEnrollmentsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 12;

  @IsOptional()
  @IsEnum(AcademyProgramEnrollmentStatus)
  status?: AcademyProgramEnrollmentStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  country?: string;

  @IsOptional()
  @IsIn(ACADEMY_PROGRAM_ENROLLMENT_SORT_FIELDS)
  sortBy?: AcademyProgramEnrollmentSortField;

  @IsOptional()
  @IsEnum(Prisma.SortOrder)
  sortDir?: Prisma.SortOrder;
}

import { ApiProperty } from '@nestjs/swagger';
import {
  PackageSchedulePolicy,
  PractitionerPackageStatus,
  SessionMode,
} from '@prisma/client';

export class PractitionerPackageCountsDto {
  @ApiProperty()
  purchaseCount!: number;

  @ApiProperty()
  linkedSessionCount!: number;
}

export class PractitionerPackageItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  practitionerId!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  sessionCount!: number;

  @ApiProperty()
  sessionDurationMinutes!: number;

  @ApiProperty({ enum: SessionMode })
  sessionMode!: SessionMode;

  @ApiProperty()
  priceEgp!: string;

  @ApiProperty()
  priceUsd!: string;

  @ApiProperty({ enum: PractitionerPackageStatus })
  status!: PractitionerPackageStatus;

  @ApiProperty({ enum: PackageSchedulePolicy })
  schedulePolicy!: PackageSchedulePolicy;

  @ApiProperty()
  version!: number;

  @ApiProperty({ nullable: true })
  activatedAt!: string | null;

  @ApiProperty({ nullable: true })
  pausedAt!: string | null;

  @ApiProperty({ nullable: true })
  disabledAt!: string | null;

  @ApiProperty({ nullable: true })
  archivedAt!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({ type: PractitionerPackageCountsDto })
  counts!: PractitionerPackageCountsDto;
}

export class PractitionerPackageDetailDto extends PractitionerPackageItemDto {}

export class PractitionerPackagePaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PractitionerPackageLimitUsageDto {
  @ApiProperty()
  maxNonArchivedPackages!: number;

  @ApiProperty()
  currentNonArchivedPackages!: number;
}

export class PractitionerPackageListDataDto {
  @ApiProperty({ type: PractitionerPackageItemDto, isArray: true })
  items!: PractitionerPackageItemDto[];

  @ApiProperty({ type: PractitionerPackagePaginationDto })
  pagination!: PractitionerPackagePaginationDto;

  @ApiProperty({ type: PractitionerPackageLimitUsageDto })
  limitUsage!: PractitionerPackageLimitUsageDto;
}

export class PractitionerPackageItemDataDto {
  @ApiProperty({ type: PractitionerPackageDetailDto })
  item!: PractitionerPackageDetailDto;
}

export class PractitionerPackageListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PractitionerPackageListDataDto })
  data!: PractitionerPackageListDataDto;
}

export class PractitionerPackageItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PractitionerPackageItemDataDto })
  data!: PractitionerPackageItemDataDto;
}

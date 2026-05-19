import { ApiProperty } from '@nestjs/swagger';
import {
  PractitionerStatus,
  UserStatus,
  PractitionerPackageStatus,
} from '@prisma/client';
import {
  PractitionerPackageDetailDto,
  PractitionerPackageItemDto,
  PractitionerPackagePaginationDto,
} from './practitioner-package-response.dto';

export class AdminPractitionerPackagePractitionerDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  publicSlug!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ enum: PractitionerStatus })
  status!: PractitionerStatus;

  @ApiProperty({ nullable: true })
  acceptsPackages!: boolean | null;

  @ApiProperty({ enum: UserStatus })
  userStatus!: UserStatus;
}

export class AdminPractitionerPackageItemDto extends PractitionerPackageItemDto {
  @ApiProperty({ type: AdminPractitionerPackagePractitionerDto })
  practitioner!: AdminPractitionerPackagePractitionerDto;

  @ApiProperty({ nullable: true, enum: PractitionerPackageStatus })
  statusBeforeAdminDisable!: PractitionerPackageStatus | null;
}

export class AdminPractitionerPackageDetailDto extends PractitionerPackageDetailDto {
  @ApiProperty({ type: AdminPractitionerPackagePractitionerDto })
  practitioner!: AdminPractitionerPackagePractitionerDto;

  @ApiProperty({ nullable: true, enum: PractitionerPackageStatus })
  statusBeforeAdminDisable!: PractitionerPackageStatus | null;
}

export class AdminPractitionerPackageListDataDto {
  @ApiProperty({ type: AdminPractitionerPackageItemDto, isArray: true })
  items!: AdminPractitionerPackageItemDto[];

  @ApiProperty({ type: PractitionerPackagePaginationDto })
  pagination!: PractitionerPackagePaginationDto;
}

export class AdminPractitionerPackageItemDataDto {
  @ApiProperty({ type: AdminPractitionerPackageDetailDto })
  item!: AdminPractitionerPackageDetailDto;
}

export class AdminPractitionerPackageListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminPractitionerPackageListDataDto })
  data!: AdminPractitionerPackageListDataDto;
}

export class AdminPractitionerPackageItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminPractitionerPackageItemDataDto })
  data!: AdminPractitionerPackageItemDataDto;
}

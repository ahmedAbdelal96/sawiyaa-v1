import { ApiProperty } from '@nestjs/swagger';
import { PractitionerStatus, UserStatus } from '@prisma/client';
import {
  PractitionerPackageDetailDto,
  PractitionerPackageItemDto,
  PractitionerPackagePaginationDto,
} from './practitioner-package-response.dto';

export class PublicPractitionerPackagePractitionerDto {
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

export class PublicPractitionerPackageItemDto extends PractitionerPackageItemDto {}

export class PublicPractitionerPackageDetailDto extends PractitionerPackageDetailDto {}

export class PublicPractitionerPackageListDataDto {
  @ApiProperty({ type: PublicPractitionerPackagePractitionerDto })
  practitioner!: PublicPractitionerPackagePractitionerDto;

  @ApiProperty({ type: PublicPractitionerPackageItemDto, isArray: true })
  items!: PublicPractitionerPackageItemDto[];

  @ApiProperty({ type: PractitionerPackagePaginationDto })
  pagination!: PractitionerPackagePaginationDto;
}

export class PublicPractitionerPackageItemDataDto {
  @ApiProperty({ type: PublicPractitionerPackageDetailDto })
  item!: PublicPractitionerPackageDetailDto;
}

export class PublicPractitionerPackageListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PublicPractitionerPackageListDataDto })
  data!: PublicPractitionerPackageListDataDto;
}

export class PublicPractitionerPackageItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PublicPractitionerPackageItemDataDto })
  data!: PublicPractitionerPackageItemDataDto;
}

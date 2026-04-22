import { ApiProperty } from '@nestjs/swagger';

export class AdminPatientListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ nullable: true })
  primaryEmail!: string | null;

  @ApiProperty({ nullable: true })
  primaryPhone!: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true })
  countryCode!: string | null;

  @ApiProperty({ nullable: true })
  onboardingCompletedAt!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class AdminPatientsListPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;
}

export class AdminPatientsListStatsDto {
  @ApiProperty()
  completedOnboarding!: number;

  @ApiProperty()
  incompleteOnboarding!: number;
}

export class AdminPatientsListSuccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: [AdminPatientListItemDto] })
  items!: AdminPatientListItemDto[];

  @ApiProperty({ type: AdminPatientsListPaginationDto })
  pagination!: AdminPatientsListPaginationDto;

  @ApiProperty({ type: AdminPatientsListStatsDto })
  stats!: AdminPatientsListStatsDto;
}

export class AdminPatientDetailsDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ nullable: true })
  primaryEmail!: string | null;

  @ApiProperty({ nullable: true })
  primaryPhone!: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true })
  countryCode!: string | null;

  @ApiProperty({ nullable: true })
  gender!: string | null;

  @ApiProperty({ nullable: true })
  dateOfBirth!: string | null;

  @ApiProperty({ nullable: true })
  onboardingCompletedAt!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class AdminPatientDetailsSuccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: AdminPatientDetailsDto })
  item!: AdminPatientDetailsDto;
}

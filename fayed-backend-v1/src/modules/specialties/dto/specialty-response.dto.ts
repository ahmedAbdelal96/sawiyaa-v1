import { ApiProperty } from '@nestjs/swagger';

export class SpecialtyCategoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  sortOrder!: number;
}

export class SpecialtyResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  name!: string | null;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({
    type: SpecialtyCategoryResponseDto,
    nullable: true,
    description:
      'Nullable by design in Phase 1. Category domain is not yet modeled in schema, so this field is currently null and reserved for future category support.',
  })
  category!: SpecialtyCategoryResponseDto | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class SpecialtiesListResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: SpecialtyResponseDto, isArray: true })
  specialties!: SpecialtyResponseDto[];
}

export class SpecialtySuccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: SpecialtyResponseDto })
  specialty!: SpecialtyResponseDto;
}

export class SpecialtyCategoriesListResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: SpecialtyCategoryResponseDto, isArray: true })
  categories!: SpecialtyCategoryResponseDto[];
}

export class SpecialtyCategorySuccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: SpecialtyCategoryResponseDto })
  category!: SpecialtyCategoryResponseDto;
}

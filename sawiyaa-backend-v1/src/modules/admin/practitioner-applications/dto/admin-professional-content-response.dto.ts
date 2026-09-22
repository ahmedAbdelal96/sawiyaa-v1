import { ApiProperty } from '@nestjs/swagger';
import { ContentLocale } from '@prisma/client';

export class AdminProfessionalContentLocaleReadinessResponseDto {
  @ApiProperty({ nullable: true })
  professionalTitle!: string | null;

  @ApiProperty({ nullable: true })
  bio!: string | null;

  @ApiProperty()
  titleComplete!: boolean;

  @ApiProperty()
  bioComplete!: boolean;

  @ApiProperty()
  complete!: boolean;
}

export class AdminProfessionalContentReadinessResponseDto {
  @ApiProperty({ enum: ContentLocale, nullable: true })
  primaryContentLocale!: ContentLocale | null;

  @ApiProperty({ type: AdminProfessionalContentLocaleReadinessResponseDto })
  locales!: {
    ar: AdminProfessionalContentLocaleReadinessResponseDto;
    en: AdminProfessionalContentLocaleReadinessResponseDto;
  };

  @ApiProperty()
  bilingualComplete!: boolean;

  @ApiProperty()
  fallbackActive!: boolean;

  @ApiProperty()
  sourceLocaleUnresolved!: boolean;
}

export class AdminProfessionalContentLegacyResponseDto {
  @ApiProperty({ nullable: true })
  professionalTitle!: string | null;

  @ApiProperty({ nullable: true })
  bio!: string | null;
}

export class AdminProfessionalContentReadinessViewResponseDto {
  @ApiProperty({ type: AdminProfessionalContentReadinessResponseDto })
  readiness!: AdminProfessionalContentReadinessResponseDto;

  @ApiProperty({
    type: AdminProfessionalContentLegacyResponseDto,
    nullable: true,
  })
  legacyContent!: AdminProfessionalContentLegacyResponseDto | null;

  @ApiProperty()
  legacySnapshot!: boolean;
}

export class AdminProfessionalContentChangedFieldResponseDto {
  @ApiProperty()
  path!: string;

  @ApiProperty({ enum: ContentLocale, nullable: true })
  locale!: ContentLocale | null;

  @ApiProperty({ enum: ['professionalTitle', 'bio', 'primaryContentLocale'] })
  field!: 'professionalTitle' | 'bio' | 'primaryContentLocale';

  @ApiProperty({ enum: ['ADDED', 'REMOVED', 'MODIFIED'] })
  status!: 'ADDED' | 'REMOVED' | 'MODIFIED';

  @ApiProperty({ nullable: true })
  currentValue!: string | null;

  @ApiProperty({ nullable: true })
  proposedValue!: string | null;
}

export class AdminProfessionalContentReviewResponseDto {
  @ApiProperty({ type: AdminProfessionalContentReadinessViewResponseDto })
  currentApproved!: AdminProfessionalContentReadinessViewResponseDto;

  @ApiProperty({ type: AdminProfessionalContentReadinessViewResponseDto })
  proposed!: AdminProfessionalContentReadinessViewResponseDto;

  @ApiProperty({
    type: AdminProfessionalContentChangedFieldResponseDto,
    isArray: true,
  })
  changedFields!: AdminProfessionalContentChangedFieldResponseDto[];
}

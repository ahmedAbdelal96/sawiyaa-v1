import { ApiProperty } from '@nestjs/swagger';
import { ReviewModerationAction, SessionReviewStatus } from '@prisma/client';
import { PublicArticleListItemDto } from '@modules/articles/dto/article-response.dto';

export class ReviewPractitionerSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;
}

export class ReviewSessionSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  scheduledStartAt!: string | null;
}

export class PatientReviewItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  overallRating!: number;

  @ApiProperty({ nullable: true })
  title!: string | null;

  @ApiProperty({ nullable: true })
  textReview!: string | null;

  @ApiProperty({ enum: SessionReviewStatus })
  status!: SessionReviewStatus;

  @ApiProperty({ nullable: true })
  submittedAt!: string | null;

  @ApiProperty({ nullable: true })
  publishedAt!: string | null;

  @ApiProperty({ nullable: true })
  moderatedAt!: string | null;

  @ApiProperty({ type: ReviewPractitionerSummaryDto })
  practitioner!: ReviewPractitionerSummaryDto;
}

export class AdminReviewItemDto extends PatientReviewItemDto {
  @ApiProperty()
  patientProfileId!: string;

  @ApiProperty()
  practitionerProfileId!: string;

  @ApiProperty({ type: ReviewSessionSummaryDto })
  session!: ReviewSessionSummaryDto;
}

export class PublicReviewItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  overallRating!: number;

  @ApiProperty({ nullable: true })
  textReview!: string | null;

  @ApiProperty({ nullable: true })
  submittedAt!: string | null;

  @ApiProperty({ nullable: true })
  publishedAt!: string | null;
}

export class PractitionerRatingSummaryDto {
  @ApiProperty({ nullable: true })
  averageOverallRating!: number | null;

  @ApiProperty()
  totalPublicReviews!: number;

  @ApiProperty()
  totalPublishedReviews!: number;

  @ApiProperty()
  totalSubmittedReviews!: number;

  @ApiProperty({ nullable: true })
  latestPublishedReviewAt!: string | null;

  @ApiProperty()
  hasEnoughPublicReviews!: boolean;

  @ApiProperty({ enum: ['NONE', 'LOW', 'ESTABLISHED'] })
  volumeLevel!: 'NONE' | 'LOW' | 'ESTABLISHED';

  @ApiProperty({ enum: ['NONE', 'RECENT', 'STALE'] })
  freshness!: 'NONE' | 'RECENT' | 'STALE';

  @ApiProperty({ type: String, isArray: true })
  rationaleCodes!: string[];
}

export class ReviewPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PatientReviewItemDataDto {
  @ApiProperty({ type: PatientReviewItemDto })
  item!: PatientReviewItemDto;
}

export class AdminReviewItemDataDto {
  @ApiProperty({ type: AdminReviewItemDto })
  item!: AdminReviewItemDto;
}

export class PatientReviewsListDataDto {
  @ApiProperty({ type: PatientReviewItemDto, isArray: true })
  items!: PatientReviewItemDto[];

  @ApiProperty({ type: ReviewPaginationDto })
  pagination!: ReviewPaginationDto;
}

export class AdminReviewsListDataDto {
  @ApiProperty({ type: AdminReviewItemDto, isArray: true })
  items!: AdminReviewItemDto[];

  @ApiProperty({ type: ReviewPaginationDto })
  pagination!: ReviewPaginationDto;
}

export class PublicPractitionerReviewsDataDto {
  @ApiProperty({ type: PractitionerRatingSummaryDto })
  summary!: PractitionerRatingSummaryDto;

  @ApiProperty({ type: PublicReviewItemDto, isArray: true })
  items!: PublicReviewItemDto[];

  @ApiProperty({ type: ReviewPaginationDto })
  pagination!: ReviewPaginationDto;
}

export class ReviewModerationDataDto {
  @ApiProperty({ type: AdminReviewItemDto })
  item!: AdminReviewItemDto;

  @ApiProperty({ enum: ReviewModerationAction })
  action!: ReviewModerationAction;
}

export class PatientReviewItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PatientReviewItemDataDto })
  data!: PatientReviewItemDataDto;
}

export class PatientReviewListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PatientReviewsListDataDto })
  data!: PatientReviewsListDataDto;
}

export class AdminReviewItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminReviewItemDataDto })
  data!: AdminReviewItemDataDto;
}

export class AdminReviewListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminReviewsListDataDto })
  data!: AdminReviewsListDataDto;
}

export class PublicPractitionerReviewsSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PublicPractitionerReviewsDataDto })
  data!: PublicPractitionerReviewsDataDto;
}

export class PublicPractitionerTrustSummaryDataDto {
  @ApiProperty({ type: ReviewPractitionerSummaryDto })
  practitioner!: ReviewPractitionerSummaryDto;

  @ApiProperty({ type: PractitionerRatingSummaryDto })
  summary!: PractitionerRatingSummaryDto;
}

export class PublicTrustConversionCompositionMetaDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ type: String, isArray: true })
  reasonCodes!: string[];
}

export class PublicPractitionerTrustBlockDataDto {
  @ApiProperty({ type: ReviewPractitionerSummaryDto })
  practitioner!: ReviewPractitionerSummaryDto;

  @ApiProperty({ type: PractitionerRatingSummaryDto })
  summary!: PractitionerRatingSummaryDto;

  @ApiProperty({ type: PublicReviewItemDto, isArray: true })
  highlightedReviews!: PublicReviewItemDto[];

  @ApiProperty({ type: PublicArticleListItemDto, isArray: true })
  contentSuggestions!: PublicArticleListItemDto[];

  @ApiProperty({ type: PublicTrustConversionCompositionMetaDto })
  compositionMeta!: PublicTrustConversionCompositionMetaDto;
}

export class PublicPractitionerTrustSummarySuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PublicPractitionerTrustSummaryDataDto })
  data!: PublicPractitionerTrustSummaryDataDto;
}

export class PublicPractitionerTrustBlockSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PublicPractitionerTrustBlockDataDto })
  data!: PublicPractitionerTrustBlockDataDto;
}

export class ReviewModerationSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: ReviewModerationDataDto })
  data!: ReviewModerationDataDto;
}

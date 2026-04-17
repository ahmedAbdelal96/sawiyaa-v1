import { ApiProperty } from '@nestjs/swagger';

export const CARE_RECOMMENDATION_TYPE_VALUES = [
  'COMPLETE_PAYMENT',
  'JOIN_UPCOMING_SESSION',
  'VIEW_SUPPORT_TICKET',
  'BOOK_NEXT_SESSION',
  'START_GUIDED_MATCHING',
  'TAKE_ASSESSMENT',
  'PRACTITIONER_MATCH',
] as const;

export type CareRecommendationType = (typeof CARE_RECOMMENDATION_TYPE_VALUES)[number];

export class CareRecommendationActionDto {
  @ApiProperty()
  type!: string;

  @ApiProperty({ nullable: true })
  targetType!: string | null;

  @ApiProperty({ nullable: true })
  targetId!: string | null;
}

export class CareRecommendationEntityRefDto {
  @ApiProperty()
  entityType!: string;

  @ApiProperty()
  entityId!: string;
}

export class CareRecommendationItemDto {
  @ApiProperty({ enum: CARE_RECOMMENDATION_TYPE_VALUES })
  type!: CareRecommendationType;

  @ApiProperty()
  priority!: number;

  @ApiProperty()
  reasonCode!: string;

  @ApiProperty()
  reasonText!: string;

  @ApiProperty({ type: CareRecommendationActionDto })
  action!: CareRecommendationActionDto;

  @ApiProperty({ type: CareRecommendationEntityRefDto, isArray: true })
  entityRefs!: CareRecommendationEntityRefDto[];

  @ApiProperty({ nullable: true })
  expiresAt!: string | null;

  @ApiProperty({ nullable: true })
  label!: string | null;
}

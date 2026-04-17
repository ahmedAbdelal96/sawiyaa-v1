import { ApiProperty } from '@nestjs/swagger';
import {
  MatchingUrgencyPreference,
  PractitionerGenderPreference,
} from '../types/matching.types';
import { CareRecommendationItemDto } from '@modules/care-experience-intelligence/dto/shared-recommendation.dto';

export class MatchingPractitionerCardDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ nullable: true })
  professionalTitle!: string | null;

  @ApiProperty({ isArray: true, type: String })
  languages!: string[];

  @ApiProperty({
    nullable: true,
    description: 'V1 currently has no persisted practitioner gender in schema',
  })
  gender!: string | null;

  @ApiProperty({ nullable: true })
  sessionPrice30!: string | null;

  @ApiProperty({ nullable: true })
  sessionPrice60!: string | null;

  @ApiProperty({ isArray: true, type: String })
  specialties!: string[];
}

export class MatchingRationaleDto {
  @ApiProperty()
  matchedSpecialty!: boolean;

  @ApiProperty()
  matchedLanguage!: boolean;

  @ApiProperty()
  matchedGenderPreference!: boolean;

  @ApiProperty()
  matchedSessionMode!: boolean;

  @ApiProperty()
  matchedBudget!: boolean;

  @ApiProperty()
  matchedUrgency!: boolean;

  @ApiProperty()
  matchedProviderType!: boolean;

  @ApiProperty()
  matchedInstantBooking!: boolean;

  @ApiProperty({ type: 'object', additionalProperties: true })
  scoreBreakdown!: Record<string, unknown>;

  @ApiProperty({ isArray: true, type: String })
  notes!: string[];
}

export class MatchingRecommendationItemDto {
  @ApiProperty({ type: MatchingPractitionerCardDto })
  practitioner!: MatchingPractitionerCardDto;

  @ApiProperty()
  score!: number;

  @ApiProperty()
  rank!: number;

  @ApiProperty({ type: MatchingRationaleDto })
  rationale!: MatchingRationaleDto;
}

export class MatchingAnswersSummaryDto {
  @ApiProperty({ nullable: true })
  primaryConcern!: string | null;

  @ApiProperty({ nullable: true })
  preferredSpecialtySlug!: string | null;

  @ApiProperty({ nullable: true })
  preferredLanguage!: string | null;

  @ApiProperty({ enum: PractitionerGenderPreference })
  preferredPractitionerGender!: PractitionerGenderPreference;

  @ApiProperty({ nullable: true })
  sessionMode!: string | null;

  @ApiProperty({ enum: MatchingUrgencyPreference })
  urgency!: MatchingUrgencyPreference;
}

export class MatchingSessionDataDto {
  @ApiProperty()
  sessionId!: string;

  @ApiProperty({ type: MatchingAnswersSummaryDto })
  answers!: MatchingAnswersSummaryDto;

  @ApiProperty({ type: MatchingRecommendationItemDto, isArray: true })
  items!: MatchingRecommendationItemDto[];

  @ApiProperty({ type: CareRecommendationItemDto, isArray: true })
  recommendations!: CareRecommendationItemDto[];
}

export class MatchingSessionSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: MatchingSessionDataDto })
  data!: MatchingSessionDataDto;
}

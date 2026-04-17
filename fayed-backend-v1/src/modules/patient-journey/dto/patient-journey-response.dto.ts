import { ApiProperty } from '@nestjs/swagger';
import {
  AssessmentResultBand,
  InstantBookingRequestStatus,
  PaymentStatus,
  SessionMode,
  SessionStatus,
  SupportTicketStatus,
  SupportTicketType,
} from '@prisma/client';
import { PATIENT_JOURNEY_NEXT_STEP_VALUES, PatientJourneyNextStepType } from '../types/patient-journey.types';
import {
  CareRecommendationActionDto,
  CareRecommendationEntityRefDto,
} from '@modules/care-experience-intelligence/dto/shared-recommendation.dto';
import { PublicArticleListItemDto } from '@modules/articles/dto/article-response.dto';

export class PatientJourneyPractitionerSummaryDto {
  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;
}

export class PatientJourneyUpcomingSessionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: SessionStatus })
  status!: SessionStatus;

  @ApiProperty({ nullable: true })
  scheduledStartAt!: string | null;

  @ApiProperty({ nullable: true })
  scheduledEndAt!: string | null;

  @ApiProperty({ type: PatientJourneyPractitionerSummaryDto })
  practitioner!: PatientJourneyPractitionerSummaryDto;
}

export class PatientJourneyPendingPaymentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ nullable: true })
  sessionId!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class PatientJourneyUpcomingInstantBookingRequestDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: InstantBookingRequestStatus })
  status!: InstantBookingRequestStatus;

  @ApiProperty()
  requestedAt!: string;

  @ApiProperty()
  expiresAt!: string;

  @ApiProperty()
  durationMinutes!: number;

  @ApiProperty({ enum: SessionMode })
  sessionMode!: SessionMode;

  @ApiProperty({ type: PatientJourneyPractitionerSummaryDto })
  practitioner!: PatientJourneyPractitionerSummaryDto;
}

export class PatientJourneyUpcomingDto {
  @ApiProperty({ type: PatientJourneyUpcomingSessionDto, nullable: true })
  session!: PatientJourneyUpcomingSessionDto | null;

  @ApiProperty({ type: PatientJourneyPendingPaymentDto, nullable: true })
  pendingPayment!: PatientJourneyPendingPaymentDto | null;

  @ApiProperty({
    type: PatientJourneyUpcomingInstantBookingRequestDto,
    nullable: true,
  })
  instantBookingRequest!: PatientJourneyUpcomingInstantBookingRequestDto | null;
}

export class PatientJourneyHistorySessionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: SessionStatus })
  status!: SessionStatus;

  @ApiProperty({ nullable: true })
  scheduledStartAt!: string | null;

  @ApiProperty({ nullable: true })
  scheduledEndAt!: string | null;

  @ApiProperty({ type: PatientJourneyPractitionerSummaryDto })
  practitioner!: PatientJourneyPractitionerSummaryDto;
}

export class PatientJourneyHistoryAssessmentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  assessmentSlug!: string;

  @ApiProperty()
  assessmentTitle!: string;

  @ApiProperty({ nullable: true })
  completedAt!: string | null;

  @ApiProperty({ enum: AssessmentResultBand, nullable: true })
  band!: AssessmentResultBand | null;

  @ApiProperty({ nullable: true })
  score!: number | null;
}

export class PatientJourneyMatchingTopRecommendationDto {
  @ApiProperty()
  practitionerSlug!: string;

  @ApiProperty({ nullable: true })
  practitionerDisplayName!: string | null;

  @ApiProperty()
  score!: number;
}

export class PatientJourneyHistoryMatchingDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  completedAt!: string | null;

  @ApiProperty({
    type: PatientJourneyMatchingTopRecommendationDto,
    nullable: true,
  })
  topRecommendation!: PatientJourneyMatchingTopRecommendationDto | null;
}

export class PatientJourneyHistoryPaymentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ nullable: true })
  sessionId!: string | null;
}

export class PatientJourneyRecentHistoryDto {
  @ApiProperty({ type: PatientJourneyHistorySessionDto, isArray: true })
  sessions!: PatientJourneyHistorySessionDto[];

  @ApiProperty({ type: PatientJourneyHistoryAssessmentDto, isArray: true })
  assessments!: PatientJourneyHistoryAssessmentDto[];

  @ApiProperty({ type: PatientJourneyHistoryMatchingDto, isArray: true })
  matching!: PatientJourneyHistoryMatchingDto[];

  @ApiProperty({ type: PatientJourneyHistoryPaymentDto, isArray: true })
  payments!: PatientJourneyHistoryPaymentDto[];
}

export class PatientJourneySupportTicketSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: SupportTicketType })
  category!: SupportTicketType;

  @ApiProperty({ enum: SupportTicketStatus })
  status!: SupportTicketStatus;

  @ApiProperty()
  updatedAt!: string;
}

export class PatientJourneySupportDto {
  @ApiProperty()
  hasOpenTicket!: boolean;

  @ApiProperty({ type: PatientJourneySupportTicketSummaryDto, nullable: true })
  latestOpenTicket!: PatientJourneySupportTicketSummaryDto | null;
}

export class PatientJourneyNextStepDto {
  @ApiProperty({ enum: PATIENT_JOURNEY_NEXT_STEP_VALUES })
  type!: PatientJourneyNextStepType;

  @ApiProperty()
  label!: string;

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
}

export class PatientJourneyLinkedContentItemDto {
  @ApiProperty({ type: PublicArticleListItemDto })
  article!: PublicArticleListItemDto;

  @ApiProperty()
  priority!: number;

  @ApiProperty()
  reasonCode!: string;

  @ApiProperty()
  reasonText!: string;
}

export class PatientJourneySummaryDto {
  @ApiProperty()
  hasUpcomingSession!: boolean;

  @ApiProperty({ nullable: true })
  nextSessionAt!: string | null;

  @ApiProperty()
  hasPendingPayment!: boolean;

  @ApiProperty()
  hasOpenSupportTicket!: boolean;

  @ApiProperty({ nullable: true })
  lastAssessmentTakenAt!: string | null;

  @ApiProperty({ nullable: true })
  lastMatchingAt!: string | null;

  @ApiProperty({ enum: PATIENT_JOURNEY_NEXT_STEP_VALUES })
  suggestedNextAction!: PatientJourneyNextStepType;
}

export class PatientJourneyResponseDto {
  @ApiProperty({ type: PatientJourneySummaryDto })
  summary!: PatientJourneySummaryDto;

  @ApiProperty({ type: PatientJourneyUpcomingDto })
  upcoming!: PatientJourneyUpcomingDto;

  @ApiProperty({ type: PatientJourneyRecentHistoryDto })
  recentHistory!: PatientJourneyRecentHistoryDto;

  @ApiProperty({ type: PatientJourneySupportDto })
  support!: PatientJourneySupportDto;

  @ApiProperty({ type: PatientJourneyLinkedContentItemDto, isArray: true })
  linkedContent!: PatientJourneyLinkedContentItemDto[];

  @ApiProperty({ type: PatientJourneyNextStepDto, isArray: true })
  nextSteps!: PatientJourneyNextStepDto[];
}

export class PatientJourneyDataResponseDto {
  @ApiProperty({ type: PatientJourneyResponseDto })
  item!: PatientJourneyResponseDto;
}

export class PatientJourneySuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PatientJourneyDataResponseDto })
  data!: PatientJourneyDataResponseDto;
}

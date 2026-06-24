import { Injectable } from '@nestjs/common';
import { CareRecommendationItem } from '@modules/care-experience-intelligence/services/build-assessment-derived-recommendations.service';
import { MatchingAnswerKey } from '@prisma/client';
import { RecommendationPrecedenceService } from '@modules/care-experience-intelligence/services/recommendation-precedence.service';

@Injectable()
export class MatchingPresenter {
  constructor(
    private readonly recommendationPrecedenceService: RecommendationPrecedenceService,
  ) {}

  presentSession(input: {
    sessionId: string;
    answers: Array<{ key: MatchingAnswerKey; valueJson: unknown }>;
    recommendations: Array<{
      score: number;
      rank: number;
      rationaleJson: unknown;
      practitionerProfile: {
        id: string;
        publicSlug: string;
        professionalTitle: string | null;
        sessionPrice30: unknown;
        sessionPrice60: unknown;
        user: { displayName: string | null };
        languages: Array<{ language: { code: string } }>;
        specialties: Array<{
          specialty: {
            translations: Array<{ title: string }>;
          };
        }>;
      };
    }>;
    assessmentRecommendations?: CareRecommendationItem[];
  }) {
    const answerMap = input.answers.reduce<Record<string, unknown>>(
      (accumulator, answer) => {
        accumulator[answer.key] = answer.valueJson;
        return accumulator;
      },
      {},
    );

    const items = input.recommendations.map((recommendation) => ({
      practitioner: {
        id: recommendation.practitionerProfile.id,
        slug: recommendation.practitionerProfile.publicSlug,
        displayName: recommendation.practitionerProfile.user.displayName,
        professionalTitle: recommendation.practitionerProfile.professionalTitle,
        languages: recommendation.practitionerProfile.languages.map(
          (language) => language.language.code,
        ),
        gender: null,
        sessionPrice30:
          recommendation.practitionerProfile.sessionPrice30?.toString() ?? null,
        sessionPrice60:
          recommendation.practitionerProfile.sessionPrice60?.toString() ?? null,
        specialties: recommendation.practitionerProfile.specialties
          .map((specialty) => specialty.specialty.translations[0]?.title)
          .filter((value): value is string => Boolean(value)),
      },
      score: recommendation.score,
      rank: recommendation.rank,
      rationale:
        typeof recommendation.rationaleJson === 'object' &&
        recommendation.rationaleJson !== null
          ? recommendation.rationaleJson
          : {
              matchedSpecialty: false,
              matchedLanguage: false,
              matchedGenderPreference: false,
              matchedSessionMode: false,
              matchedBudget: false,
              matchedUrgency: false,
              matchedProviderType: false,
              matchedInstantBooking: false,
              scoreBreakdown: {
                specialty: { earned: 0, max: 24 },
                language: { earned: 0, max: 16 },
                budget: { earned: 0, max: 18 },
                urgency: { earned: 0, max: 10 },
                providerType: { earned: 0, max: 8 },
                instantBooking: { earned: 0, max: 5 },
                firstTime: { earned: 0, max: 5 },
                sessionMode: { earned: 0, max: 4 },
                experienceDepth: { earned: 0, max: 6 },
                availabilityReadiness: { earned: 0, max: 4 },
                total: 0,
              },
              notes: [],
            },
    }));

    const practitionerRecommendations = items.map((item) => ({
      type: 'PRACTITIONER_MATCH' as const,
      priority: Math.max(1, 100 - item.rank),
      reasonCode: 'MATCH_SCORE',
      reasonText:
        (Array.isArray((item.rationale as { notes?: string[] }).notes)
          ? ((item.rationale as { notes?: string[] }).notes ?? [])[0]
          : null) ?? `Practitioner match score ${item.score}`,
      action: {
        type: 'OPEN_PRACTITIONER_PROFILE',
        targetType: 'PRACTITIONER',
        targetId: item.practitioner.slug,
      },
      entityRefs: [
        {
          entityType: 'PRACTITIONER',
          entityId: item.practitioner.id,
        },
      ],
      expiresAt: null,
      label: item.practitioner.displayName
        ? `View ${item.practitioner.displayName}`
        : 'View practitioner profile',
    }));

    const recommendations = this.recommendationPrecedenceService.apply([
      ...(input.assessmentRecommendations ?? []),
      ...practitionerRecommendations,
    ]);

    return {
      sessionId: input.sessionId,
      answers: {
        primaryConcern:
          (answerMap[MatchingAnswerKey.PRIMARY_CONCERN] as string | null) ??
          null,
        preferredSpecialtySlug:
          (answerMap[MatchingAnswerKey.PREFERRED_SPECIALTY] as string | null) ??
          null,
        preferredLanguage:
          (answerMap[MatchingAnswerKey.PREFERRED_LANGUAGE] as string | null) ??
          null,
        preferredPractitionerGender:
          (answerMap[
            MatchingAnswerKey.PREFERRED_PRACTITIONER_GENDER
          ] as string) ?? 'ANY',
        sessionMode:
          (answerMap[MatchingAnswerKey.SESSION_MODE] as string | null) ?? null,
        urgency: (answerMap[MatchingAnswerKey.URGENCY] as string) ?? 'FLEXIBLE',
      },
      items,
      recommendations,
    };
  }
}

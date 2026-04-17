import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BuildAssessmentDerivedRecommendationsService } from '@modules/care-experience-intelligence/services/build-assessment-derived-recommendations.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { BuildNormalizedCareSignalContextService } from '@modules/care-experience-intelligence/services/build-normalized-care-signal-context.service';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { CreateMatchingSessionDto } from '../dto/create-matching-session.dto';
import { MatchingCandidateRepository } from '../repositories/matching-candidate.repository';
import { MatchingPatientRepository } from '../repositories/matching-patient.repository';
import { MatchingSessionRepository } from '../repositories/matching-session.repository';
import { BuildMatchingRationaleService } from '../services/build-matching-rationale.service';
import { NormalizeMatchingInputService } from '../services/normalize-matching-input.service';
import { ScorePractitionerMatchService } from '../services/score-practitioner-match.service';
import { MatchingPresenter } from '../presenters/matching.presenter';

@Injectable()
export class CreateMatchingSessionUseCase {
  private readonly logger = new Logger(CreateMatchingSessionUseCase.name);

  constructor(
    private readonly matchingPatientRepository: MatchingPatientRepository,
    private readonly matchingSessionRepository: MatchingSessionRepository,
    private readonly matchingCandidateRepository: MatchingCandidateRepository,
    private readonly normalizeMatchingInputService: NormalizeMatchingInputService,
    private readonly buildNormalizedCareSignalContextService: BuildNormalizedCareSignalContextService,
    private readonly buildAssessmentDerivedRecommendationsService: BuildAssessmentDerivedRecommendationsService,
    private readonly scorePractitionerMatchService: ScorePractitionerMatchService,
    private readonly buildMatchingRationaleService: BuildMatchingRationaleService,
    private readonly matchingPresenter: MatchingPresenter,
    private readonly publicPractitionerVisibilityPolicy: PublicPractitionerVisibilityPolicy,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    payload: CreateMatchingSessionDto;
  }) {
    const patientProfile = await this.matchingPatientRepository.findByUserId(
      input.userId,
    );
    if (!patientProfile) {
      throw new NotFoundException({
        messageKey: 'matching.errors.patientProfileNotFound',
        error: 'MATCHING_PATIENT_PROFILE_NOT_FOUND',
      });
    }

    const normalizedSignalContext =
      await this.buildNormalizedCareSignalContextService.buildFromRepository({
        patientProfileId: patientProfile.id,
        userId: input.userId,
      });

    const { normalized, answers } =
      this.normalizeMatchingInputService.normalize(input.payload, {
        countryCode: normalizedSignalContext.profile.countryCode,
        timezone: normalizedSignalContext.profile.timezone,
      });
    const assessmentRecommendations =
      this.buildAssessmentDerivedRecommendationsService.build({
        interpretation: normalizedSignalContext.assessments.interpretation,
        patientProfileId: patientProfile.id,
      });

    this.logger.log(
      `Guided matching session started for patient ${patientProfile.id} (specialty=${normalized.preferredSpecialtySlug ?? 'none'}, urgency=${normalized.urgency})`,
    );

    const focusedCandidates =
      await this.matchingCandidateRepository.listPublicCandidates({
        locale: input.locale,
        preferredSpecialtySlug: normalized.preferredSpecialtySlug,
        take: 120,
      });

    const candidates =
      focusedCandidates.length > 0 || !normalized.preferredSpecialtySlug
        ? focusedCandidates
        : await this.matchingCandidateRepository.listPublicCandidates({
            locale: input.locale,
            preferredSpecialtySlug: null,
            take: 120,
          });

    const scored = candidates
      .filter(
        (candidate) =>
          this.publicPractitionerVisibilityPolicy.evaluate({
            practitionerStatus: candidate.status,
            userStatus: candidate.user.status,
            isPublicProfilePublished: candidate.isPublicProfilePublished,
            hasPublicSlug: Boolean(candidate.publicSlug?.trim()),
            hasDisplayName: Boolean(candidate.user.displayName?.trim()),
            hasProfessionalTitle: Boolean(candidate.professionalTitle?.trim()),
            hasBio: Boolean(candidate.bio?.trim()),
            hasAtLeastOneActiveSpecialty: candidate.specialties.length > 0,
          }).isVisible,
      )
      .map((candidate) => {
        const specialtySlugs = candidate.specialties.flatMap((specialty) => [
          specialty.specialty.slug,
          ...specialty.specialty.translations.map(
            (translation) => translation.slug,
          ),
        ]);

        const scoring = this.scorePractitionerMatchService.score({
          candidate: {
            practitionerType: candidate.practitionerType,
            sessionPrice30: candidate.sessionPrice30,
            sessionPrice60: candidate.sessionPrice60,
            languages: candidate.languages.map((language) =>
              language.language.code.toLowerCase(),
            ),
            specialtySlugs: specialtySlugs.map((slug) => slug.toLowerCase()),
            hasAnyAvailability: candidate.availabilitySlots.length > 0,
            presenceStatus: candidate.presence?.status ?? null,
            isInstantBookingEnabled:
              candidate.presence?.isInstantBookingEnabled ?? false,
            yearsOfExperience: candidate.yearsOfExperience ?? null,
          },
          preferences: normalized,
        });

        const rationale = this.buildMatchingRationaleService.build({
          signals: scoring.signals,
          breakdown: scoring.breakdown,
          preferredLanguage: normalized.preferredLanguage,
          preferredSpecialtySlug: normalized.preferredSpecialtySlug,
          prefersInstantBooking: normalized.preferInstantBooking,
        });

        return {
          candidate,
          score: scoring.score,
          rationale,
        };
      })
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }
        if (
          (right.candidate.yearsOfExperience ?? 0) !==
          (left.candidate.yearsOfExperience ?? 0)
        ) {
          return (
            (right.candidate.yearsOfExperience ?? 0) -
            (left.candidate.yearsOfExperience ?? 0)
          );
        }
        return (
          left.candidate.createdAt.getTime() -
          right.candidate.createdAt.getTime()
        );
      })
      .slice(0, 10);

    const recommendations = scored.map((item, index) => ({
      practitionerProfileId: item.candidate.id,
      score: item.score,
      rank: index + 1,
      rationaleJson: item.rationale,
    }));

    const session = await this.matchingSessionRepository.createCompletedSession(
      {
        patientProfileId: patientProfile.id,
        answers,
        recommendations,
      },
    );

    this.logger.log(
      `Guided matching recommendations generated (session=${session.id}, count=${recommendations.length})`,
    );

    return this.matchingPresenter.presentSession({
      sessionId: session.id,
      answers: session.answers,
      recommendations: session.recommendations,
      assessmentRecommendations,
    });
  }
}

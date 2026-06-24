import { Injectable } from '@nestjs/common';
import { AssessmentResultBand, Prisma } from '@prisma/client';
import {
  AssessmentBandThreshold,
  AssessmentScoringConfig,
} from '../types/assessment.types';

@Injectable()
export class MapAssessmentResultBandService {
  map(input: {
    totalScore: number;
    maxScore: number;
    scoringConfigJson: Prisma.JsonValue | null;
  }): AssessmentResultBand {
    const customThresholds = this.readCustomThresholds(input.scoringConfigJson);
    if (customThresholds.length > 0) {
      const customMatch = customThresholds.find(
        (threshold) =>
          input.totalScore >= threshold.minInclusive &&
          input.totalScore <= threshold.maxInclusive,
      );

      if (customMatch) {
        return customMatch.band;
      }
    }

    if (input.maxScore <= 0) {
      return AssessmentResultBand.LOW;
    }

    const ratio = input.totalScore / input.maxScore;
    if (ratio <= 0.25) {
      return AssessmentResultBand.LOW;
    }
    if (ratio <= 0.5) {
      return AssessmentResultBand.MILD;
    }
    if (ratio <= 0.75) {
      return AssessmentResultBand.MODERATE;
    }
    return AssessmentResultBand.HIGH;
  }

  private readCustomThresholds(
    scoringConfigJson: Prisma.JsonValue | null,
  ): AssessmentBandThreshold[] {
    if (
      !scoringConfigJson ||
      typeof scoringConfigJson !== 'object' ||
      Array.isArray(scoringConfigJson)
    ) {
      return [];
    }

    const config = scoringConfigJson as unknown as AssessmentScoringConfig;
    if (!Array.isArray(config.thresholds)) {
      return [];
    }

    return config.thresholds.filter((threshold) => {
      return (
        threshold != null &&
        typeof threshold.band === 'string' &&
        typeof threshold.minInclusive === 'number' &&
        typeof threshold.maxInclusive === 'number'
      );
    });
  }
}

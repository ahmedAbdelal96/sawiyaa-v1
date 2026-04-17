import { BadRequestException, Injectable } from '@nestjs/common';
import { AssessmentResultBand, Prisma } from '@prisma/client';
import { UpsertAssessmentBandThresholdDto } from '../dto/admin-assessment-authoring.dto';

@Injectable()
export class AdminAssessmentScoringConfigValidatorService {
  validateAndBuildThresholdsJson(
    thresholds: UpsertAssessmentBandThresholdDto[],
  ): Prisma.InputJsonValue {
    const sorted = [...thresholds].sort(
      (a, b) => a.minInclusive - b.minInclusive,
    );

    const seenBands = new Set<AssessmentResultBand>();
    for (let index = 0; index < sorted.length; index += 1) {
      const item = sorted[index];
      if (seenBands.has(item.band)) {
        throw new BadRequestException({
          message: `Duplicate threshold band: ${item.band}`,
          error: 'ADMIN_ASSESSMENT_SCORING_DUPLICATE_BAND',
        });
      }
      seenBands.add(item.band);

      if (item.minInclusive > item.maxInclusive) {
        throw new BadRequestException({
          message: `Threshold ${item.band} has invalid range.`,
          error: 'ADMIN_ASSESSMENT_SCORING_INVALID_RANGE',
        });
      }

      if (index > 0) {
        const previous = sorted[index - 1];
        if (item.minInclusive <= previous.maxInclusive) {
          throw new BadRequestException({
            message: `Threshold ${item.band} overlaps with ${previous.band}.`,
            error: 'ADMIN_ASSESSMENT_SCORING_OVERLAPPING_RANGE',
          });
        }
      }
    }

    return {
      thresholds: sorted.map((item) => ({
        band: item.band,
        minInclusive: item.minInclusive,
        maxInclusive: item.maxInclusive,
      })),
    } satisfies Prisma.InputJsonValue;
  }
}

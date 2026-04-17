import { AssessmentResultBand } from '@prisma/client';
import { MapAssessmentResultBandService } from './map-assessment-result-band.service';

describe('MapAssessmentResultBandService', () => {
  let service: MapAssessmentResultBandService;

  beforeEach(() => {
    service = new MapAssessmentResultBandService();
  });

  it('maps by ratio thresholds when custom config is absent', () => {
    expect(
      service.map({
        totalScore: 1,
        maxScore: 16,
        scoringConfigJson: null,
      }),
    ).toBe(AssessmentResultBand.LOW);
    expect(
      service.map({
        totalScore: 7,
        maxScore: 16,
        scoringConfigJson: null,
      }),
    ).toBe(AssessmentResultBand.MILD);
    expect(
      service.map({
        totalScore: 10,
        maxScore: 16,
        scoringConfigJson: null,
      }),
    ).toBe(AssessmentResultBand.MODERATE);
    expect(
      service.map({
        totalScore: 15,
        maxScore: 16,
        scoringConfigJson: null,
      }),
    ).toBe(AssessmentResultBand.HIGH);
  });

  it('uses custom score thresholds when provided', () => {
    const band = service.map({
      totalScore: 5,
      maxScore: 20,
      scoringConfigJson: {
        thresholds: [
          { band: AssessmentResultBand.LOW, minInclusive: 0, maxInclusive: 3 },
          { band: AssessmentResultBand.MODERATE, minInclusive: 4, maxInclusive: 10 },
        ],
      },
    });

    expect(band).toBe(AssessmentResultBand.MODERATE);
  });
});

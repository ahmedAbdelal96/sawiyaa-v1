import { AssessmentResultBand } from '@prisma/client';
import { BuildAssessmentResultSummaryService } from './build-assessment-result-summary.service';

describe('BuildAssessmentResultSummaryService', () => {
  let service: BuildAssessmentResultSummaryService;

  beforeEach(() => {
    service = new BuildAssessmentResultSummaryService();
  });

  it('returns safe non-diagnostic english summary', () => {
    const summary = service.build({
      assessmentTitle: 'Anxiety Check',
      band: AssessmentResultBand.MODERATE,
      locale: 'en',
    });

    expect(summary.toLowerCase()).toContain('moderate');
    expect(summary.toLowerCase()).not.toContain('diagnosis');
  });

  it('returns arabic summary when locale is ar', () => {
    const summary = service.build({
      assessmentTitle: 'Anxiety Check',
      band: AssessmentResultBand.HIGH,
      locale: 'ar',
    });

    expect(summary).toContain('مستوى');
  });
});

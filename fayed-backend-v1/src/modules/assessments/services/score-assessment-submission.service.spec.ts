import { ScoreAssessmentSubmissionService } from './score-assessment-submission.service';

describe('ScoreAssessmentSubmissionService', () => {
  let service: ScoreAssessmentSubmissionService;

  beforeEach(() => {
    service = new ScoreAssessmentSubmissionService();
  });

  it('calculates total score deterministically', () => {
    const total = service.calculateTotalScore([
      { scoreValue: 1 },
      { scoreValue: 3 },
      { scoreValue: 2 },
    ]);

    expect(total).toBe(6);
  });

  it('calculates max score from each question options', () => {
    const maxScore = service.calculateMaxScore([
      {
        options: [{ scoreValue: 0 }, { scoreValue: 2 }, { scoreValue: 3 }],
      },
      {
        options: [{ scoreValue: 0 }, { scoreValue: 1 }],
      },
    ]);

    expect(maxScore).toBe(4);
  });
});

import { Injectable } from '@nestjs/common';

@Injectable()
export class ScoreAssessmentSubmissionService {
  calculateTotalScore(answers: Array<{ scoreValue: number }>): number {
    return answers.reduce((sum, answer) => sum + answer.scoreValue, 0);
  }

  calculateMaxScore(questions: Array<{ options: Array<{ scoreValue: number }> }>): number {
    return questions.reduce((sum, question) => {
      const maxOptionScore = question.options.reduce((max, option) => {
        return Math.max(max, option.scoreValue);
      }, 0);

      return sum + maxOptionScore;
    }, 0);
  }
}

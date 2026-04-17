import { BadRequestException, Injectable } from '@nestjs/common';
import { SubmitAssessmentAnswerDto } from '../dto/submit-assessment.dto';

@Injectable()
export class ValidateAssessmentSubmissionService {
  assertValidAnswerSet(input: {
    answers: SubmitAssessmentAnswerDto[];
    requiredQuestionKeys: string[];
    allowedQuestionKeys: string[];
    allowedOptionKeysByQuestion: Record<string, Set<string>>;
  }) {
    if (input.answers.length === 0) {
      throw new BadRequestException({
        messageKey: 'assessments.errors.answersRequired',
        error: 'ASSESSMENT_ANSWERS_REQUIRED',
      });
    }

    const seenQuestionKeys = new Set<string>();
    for (const answer of input.answers) {
      const normalizedQuestionKey = answer.questionKey.trim().toLowerCase();
      const normalizedOptionKey = answer.selectedOptionKey.trim().toLowerCase();

      if (seenQuestionKeys.has(normalizedQuestionKey)) {
        throw new BadRequestException({
          messageKey: 'assessments.errors.duplicateQuestionAnswer',
          error: 'ASSESSMENT_DUPLICATE_QUESTION_ANSWER',
        });
      }
      seenQuestionKeys.add(normalizedQuestionKey);

      if (!input.allowedQuestionKeys.includes(normalizedQuestionKey)) {
        throw new BadRequestException({
          messageKey: 'assessments.errors.invalidQuestionKey',
          error: 'ASSESSMENT_INVALID_QUESTION_KEY',
        });
      }

      const allowedOptions =
        input.allowedOptionKeysByQuestion[normalizedQuestionKey] ?? new Set<string>();
      if (!allowedOptions.has(normalizedOptionKey)) {
        throw new BadRequestException({
          messageKey: 'assessments.errors.invalidOptionKey',
          error: 'ASSESSMENT_INVALID_OPTION_KEY',
        });
      }
    }

    for (const requiredQuestionKey of input.requiredQuestionKeys) {
      if (!seenQuestionKeys.has(requiredQuestionKey)) {
        throw new BadRequestException({
          messageKey: 'assessments.errors.requiredQuestionsMissing',
          error: 'ASSESSMENT_REQUIRED_QUESTIONS_MISSING',
        });
      }
    }
  }
}

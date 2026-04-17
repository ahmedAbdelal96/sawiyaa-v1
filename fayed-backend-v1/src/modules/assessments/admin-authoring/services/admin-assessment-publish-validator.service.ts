import { BadRequestException, Injectable } from '@nestjs/common';
import { AssessmentDefinition, AssessmentQuestion } from '@prisma/client';

@Injectable()
export class AdminAssessmentPublishValidatorService {
  validate(input: {
    definition: AssessmentDefinition;
    questions: Array<
      AssessmentQuestion & {
        options: Array<{
          id: string;
          key: string;
          label: string;
          scoreValue: number;
          order: number;
        }>;
      }
    >;
  }) {
    const { definition, questions } = input;
    this.assertMetadata(definition);
    this.assertQuestions(questions);
  }

  private assertMetadata(definition: AssessmentDefinition) {
    if (!definition.slug || !definition.title || !definition.category) {
      throw new BadRequestException({
        message: 'Assessment metadata is incomplete.',
        error: 'ADMIN_ASSESSMENT_PUBLISH_METADATA_INCOMPLETE',
      });
    }
  }

  private assertQuestions(
    questions: Array<
      AssessmentQuestion & {
        options: Array<{
          id: string;
          key: string;
          label: string;
          scoreValue: number;
          order: number;
        }>;
      }
    >,
  ) {
    if (questions.length === 0) {
      throw new BadRequestException({
        message: 'At least one question is required before publish.',
        error: 'ADMIN_ASSESSMENT_PUBLISH_NO_QUESTIONS',
      });
    }

    const questionKeys = new Set<string>();
    const questionOrders = new Set<number>();

    for (const question of questions) {
      if (questionKeys.has(question.key.toLowerCase())) {
        throw new BadRequestException({
          message: 'Question keys must be unique within one assessment.',
          error: 'ADMIN_ASSESSMENT_PUBLISH_DUPLICATE_QUESTION_KEY',
        });
      }
      questionKeys.add(question.key.toLowerCase());

      if (questionOrders.has(question.order)) {
        throw new BadRequestException({
          message: 'Question order values must be unique.',
          error: 'ADMIN_ASSESSMENT_PUBLISH_DUPLICATE_QUESTION_ORDER',
        });
      }
      questionOrders.add(question.order);

      if (question.options.length === 0) {
        throw new BadRequestException({
          message: `Question "${question.key}" has no options.`,
          error: 'ADMIN_ASSESSMENT_PUBLISH_EMPTY_OPTIONS',
        });
      }

      const optionKeys = new Set<string>();
      const optionOrders = new Set<number>();
      for (const option of question.options) {
        if (optionKeys.has(option.key.toLowerCase())) {
          throw new BadRequestException({
            message: `Duplicate option key in question "${question.key}".`,
            error: 'ADMIN_ASSESSMENT_PUBLISH_DUPLICATE_OPTION_KEY',
          });
        }
        optionKeys.add(option.key.toLowerCase());

        if (optionOrders.has(option.order)) {
          throw new BadRequestException({
            message: `Duplicate option order in question "${question.key}".`,
            error: 'ADMIN_ASSESSMENT_PUBLISH_DUPLICATE_OPTION_ORDER',
          });
        }
        optionOrders.add(option.order);
      }
    }
  }
}

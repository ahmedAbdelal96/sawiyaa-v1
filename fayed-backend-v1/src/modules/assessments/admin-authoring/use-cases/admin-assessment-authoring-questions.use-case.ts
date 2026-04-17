import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssessmentQuestionInputType } from '@prisma/client';
import { AdminAssessmentAuthoringRepository } from '../repositories/admin-assessment-authoring.repository';
import { AdminAssessmentLifecyclePolicy } from '../services/admin-assessment-lifecycle.policy';

@Injectable()
export class AdminAssessmentAuthoringQuestionsUseCase {
  constructor(
    private readonly repository: AdminAssessmentAuthoringRepository,
    private readonly lifecyclePolicy: AdminAssessmentLifecyclePolicy,
  ) {}

  async createQuestion(
    assessmentId: string,
    input: {
      key: string;
      prompt: string;
      description?: string;
      inputType?: AssessmentQuestionInputType;
      isRequired?: boolean;
      order?: number;
    },
  ) {
    const definition = await this.repository.findById(assessmentId);
    if (!definition) {
      throw new NotFoundException({
        message: 'Assessment definition not found.',
        error: 'ADMIN_ASSESSMENT_NOT_FOUND',
      });
    }
    this.lifecyclePolicy.assertDraftEditable(definition);

    const normalizedKey = input.key.trim().toLowerCase();
    const hasDuplicate = definition.questions.some(
      (question) => question.key.toLowerCase() === normalizedKey,
    );
    if (hasDuplicate) {
      throw new ConflictException({
        message: 'Question key must be unique within this assessment.',
        error: 'ADMIN_ASSESSMENT_QUESTION_KEY_EXISTS',
      });
    }

    const requestedOrder = input.order ?? definition.questions.length + 1;
    if (
      requestedOrder < 1 ||
      requestedOrder > definition.questions.length + 1
    ) {
      throw new BadRequestException({
        message: 'Question order is out of range.',
        error: 'ADMIN_ASSESSMENT_INVALID_QUESTION_ORDER',
      });
    }

    const created = await this.repository.createQuestion({
      assessmentDefinitionId: assessmentId,
      key: normalizedKey,
      prompt: input.prompt.trim(),
      description: input.description?.trim() || null,
      inputType: input.inputType ?? AssessmentQuestionInputType.SINGLE_CHOICE,
      isRequired: input.isRequired ?? true,
      order: definition.questions.length + 1,
    });

    if (requestedOrder !== definition.questions.length + 1) {
      const currentOrder = [...definition.questions]
        .sort((a, b) => a.order - b.order)
        .map((question) => question.id);
      currentOrder.splice(requestedOrder - 1, 0, created.id);
      await this.repository.reorderQuestions(assessmentId, currentOrder);
    }

    return {
      success: true as const,
      data: {
        item: created,
      },
    };
  }

  async updateQuestion(
    assessmentId: string,
    questionId: string,
    input: {
      key?: string;
      prompt?: string;
      description?: string | null;
      inputType?: AssessmentQuestionInputType;
      isRequired?: boolean;
    },
  ) {
    const definition = await this.repository.findById(assessmentId);
    if (!definition) {
      throw new NotFoundException({
        message: 'Assessment definition not found.',
        error: 'ADMIN_ASSESSMENT_NOT_FOUND',
      });
    }
    this.lifecyclePolicy.assertDraftEditable(definition);

    const question = definition.questions.find(
      (item) => item.id === questionId,
    );
    if (!question) {
      throw new NotFoundException({
        message: 'Assessment question not found.',
        error: 'ADMIN_ASSESSMENT_QUESTION_NOT_FOUND',
      });
    }

    if (input.key) {
      const normalizedKey = input.key.trim().toLowerCase();
      const hasDuplicate = definition.questions.some(
        (item) =>
          item.id !== questionId && item.key.toLowerCase() === normalizedKey,
      );
      if (hasDuplicate) {
        throw new ConflictException({
          message: 'Question key must be unique within this assessment.',
          error: 'ADMIN_ASSESSMENT_QUESTION_KEY_EXISTS',
        });
      }
    }

    const updated = await this.repository.updateQuestion(questionId, {
      ...(input.key ? { key: input.key.trim().toLowerCase() } : {}),
      ...(typeof input.prompt === 'string'
        ? { prompt: input.prompt.trim() }
        : {}),
      ...(typeof input.description !== 'undefined'
        ? { description: input.description?.trim() || null }
        : {}),
      ...(input.inputType ? { inputType: input.inputType } : {}),
      ...(typeof input.isRequired === 'boolean'
        ? { isRequired: input.isRequired }
        : {}),
    });

    return {
      success: true as const,
      data: { item: updated },
    };
  }

  async deleteQuestion(assessmentId: string, questionId: string) {
    const definition = await this.repository.findById(assessmentId);
    if (!definition) {
      throw new NotFoundException({
        message: 'Assessment definition not found.',
        error: 'ADMIN_ASSESSMENT_NOT_FOUND',
      });
    }
    this.lifecyclePolicy.assertDraftEditable(definition);

    const question = definition.questions.find(
      (item) => item.id === questionId,
    );
    if (!question) {
      throw new NotFoundException({
        message: 'Assessment question not found.',
        error: 'ADMIN_ASSESSMENT_QUESTION_NOT_FOUND',
      });
    }

    await this.repository.deleteQuestion(questionId);
    const updated = await this.repository.findById(assessmentId);
    if (updated) {
      await this.repository.reorderQuestions(
        assessmentId,
        [...updated.questions]
          .sort((a, b) => a.order - b.order)
          .map((item) => item.id),
      );
    }

    return {
      success: true as const,
      data: { deleted: true },
    };
  }

  async reorderQuestions(assessmentId: string, questionIds: string[]) {
    const definition = await this.repository.findById(assessmentId);
    if (!definition) {
      throw new NotFoundException({
        message: 'Assessment definition not found.',
        error: 'ADMIN_ASSESSMENT_NOT_FOUND',
      });
    }
    this.lifecyclePolicy.assertDraftEditable(definition);

    const existingIds = new Set(definition.questions.map((item) => item.id));
    if (
      questionIds.length !== definition.questions.length ||
      questionIds.some((id) => !existingIds.has(id))
    ) {
      throw new BadRequestException({
        message:
          'Question reorder payload must include all current question ids exactly once.',
        error: 'ADMIN_ASSESSMENT_INVALID_QUESTION_REORDER_PAYLOAD',
      });
    }

    await this.repository.reorderQuestions(assessmentId, questionIds);
    return {
      success: true as const,
      data: { reordered: true },
    };
  }

  async createOption(
    assessmentId: string,
    questionId: string,
    input: {
      key: string;
      label: string;
      scoreValue: number;
      order?: number;
    },
  ) {
    const definition = await this.repository.findById(assessmentId);
    if (!definition) {
      throw new NotFoundException({
        message: 'Assessment definition not found.',
        error: 'ADMIN_ASSESSMENT_NOT_FOUND',
      });
    }
    this.lifecyclePolicy.assertDraftEditable(definition);

    const question = definition.questions.find(
      (item) => item.id === questionId,
    );
    if (!question) {
      throw new NotFoundException({
        message: 'Assessment question not found.',
        error: 'ADMIN_ASSESSMENT_QUESTION_NOT_FOUND',
      });
    }

    const normalizedKey = input.key.trim().toLowerCase();
    const hasDuplicate = question.options.some(
      (option) => option.key.toLowerCase() === normalizedKey,
    );
    if (hasDuplicate) {
      throw new ConflictException({
        message: 'Option key must be unique within this question.',
        error: 'ADMIN_ASSESSMENT_OPTION_KEY_EXISTS',
      });
    }

    const requestedOrder = input.order ?? question.options.length + 1;
    if (requestedOrder < 1 || requestedOrder > question.options.length + 1) {
      throw new BadRequestException({
        message: 'Option order is out of range.',
        error: 'ADMIN_ASSESSMENT_INVALID_OPTION_ORDER',
      });
    }

    const created = await this.repository.createOption({
      assessmentQuestionId: questionId,
      key: normalizedKey,
      label: input.label.trim(),
      scoreValue: input.scoreValue,
      order: question.options.length + 1,
    });

    if (requestedOrder !== question.options.length + 1) {
      const currentOrder = [...question.options]
        .sort((a, b) => a.order - b.order)
        .map((item) => item.id);
      currentOrder.splice(requestedOrder - 1, 0, created.id);
      await this.repository.reorderOptions(questionId, currentOrder);
    }

    return {
      success: true as const,
      data: { item: created },
    };
  }

  async updateOption(
    assessmentId: string,
    questionId: string,
    optionId: string,
    input: {
      key?: string;
      label?: string;
      scoreValue?: number;
    },
  ) {
    const definition = await this.repository.findById(assessmentId);
    if (!definition) {
      throw new NotFoundException({
        message: 'Assessment definition not found.',
        error: 'ADMIN_ASSESSMENT_NOT_FOUND',
      });
    }
    this.lifecyclePolicy.assertDraftEditable(definition);

    const question = definition.questions.find(
      (item) => item.id === questionId,
    );
    if (!question) {
      throw new NotFoundException({
        message: 'Assessment question not found.',
        error: 'ADMIN_ASSESSMENT_QUESTION_NOT_FOUND',
      });
    }

    const option = question.options.find((item) => item.id === optionId);
    if (!option) {
      throw new NotFoundException({
        message: 'Assessment option not found.',
        error: 'ADMIN_ASSESSMENT_OPTION_NOT_FOUND',
      });
    }

    if (input.key) {
      const normalizedKey = input.key.trim().toLowerCase();
      const hasDuplicate = question.options.some(
        (item) =>
          item.id !== optionId && item.key.toLowerCase() === normalizedKey,
      );
      if (hasDuplicate) {
        throw new ConflictException({
          message: 'Option key must be unique within this question.',
          error: 'ADMIN_ASSESSMENT_OPTION_KEY_EXISTS',
        });
      }
    }

    const updated = await this.repository.updateOption(optionId, {
      ...(input.key ? { key: input.key.trim().toLowerCase() } : {}),
      ...(typeof input.label === 'string' ? { label: input.label.trim() } : {}),
      ...(typeof input.scoreValue === 'number'
        ? { scoreValue: input.scoreValue }
        : {}),
    });

    return {
      success: true as const,
      data: { item: updated },
    };
  }

  async deleteOption(
    assessmentId: string,
    questionId: string,
    optionId: string,
  ) {
    const definition = await this.repository.findById(assessmentId);
    if (!definition) {
      throw new NotFoundException({
        message: 'Assessment definition not found.',
        error: 'ADMIN_ASSESSMENT_NOT_FOUND',
      });
    }
    this.lifecyclePolicy.assertDraftEditable(definition);

    const question = definition.questions.find(
      (item) => item.id === questionId,
    );
    if (!question) {
      throw new NotFoundException({
        message: 'Assessment question not found.',
        error: 'ADMIN_ASSESSMENT_QUESTION_NOT_FOUND',
      });
    }

    const option = question.options.find((item) => item.id === optionId);
    if (!option) {
      throw new NotFoundException({
        message: 'Assessment option not found.',
        error: 'ADMIN_ASSESSMENT_OPTION_NOT_FOUND',
      });
    }

    await this.repository.deleteOption(optionId);
    const updated = await this.repository.findById(assessmentId);
    const updatedQuestion = updated?.questions.find(
      (item) => item.id === questionId,
    );
    if (updatedQuestion) {
      await this.repository.reorderOptions(
        questionId,
        [...updatedQuestion.options]
          .sort((a, b) => a.order - b.order)
          .map((item) => item.id),
      );
    }

    return {
      success: true as const,
      data: { deleted: true },
    };
  }

  async reorderOptions(
    assessmentId: string,
    questionId: string,
    optionIds: string[],
  ) {
    const definition = await this.repository.findById(assessmentId);
    if (!definition) {
      throw new NotFoundException({
        message: 'Assessment definition not found.',
        error: 'ADMIN_ASSESSMENT_NOT_FOUND',
      });
    }
    this.lifecyclePolicy.assertDraftEditable(definition);

    const question = definition.questions.find(
      (item) => item.id === questionId,
    );
    if (!question) {
      throw new NotFoundException({
        message: 'Assessment question not found.',
        error: 'ADMIN_ASSESSMENT_QUESTION_NOT_FOUND',
      });
    }

    const existingIds = new Set(question.options.map((item) => item.id));
    if (
      optionIds.length !== question.options.length ||
      optionIds.some((id) => !existingIds.has(id))
    ) {
      throw new BadRequestException({
        message:
          'Option reorder payload must include all current option ids exactly once.',
        error: 'ADMIN_ASSESSMENT_INVALID_OPTION_REORDER_PAYLOAD',
      });
    }

    await this.repository.reorderOptions(questionId, optionIds);
    return {
      success: true as const,
      data: { reordered: true },
    };
  }
}

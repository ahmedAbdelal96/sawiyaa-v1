import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssessmentResultBand } from '@prisma/client';
import { AssessmentDefinitionStatus } from '@prisma/client';
import { AdminAssessmentAuthoringRepository } from '../repositories/admin-assessment-authoring.repository';
import { AdminAssessmentLifecyclePolicy } from '../services/admin-assessment-lifecycle.policy';
import { AdminAssessmentScoringConfigValidatorService } from '../services/admin-assessment-scoring-config-validator.service';

@Injectable()
export class AdminAssessmentAuthoringDefinitionsUseCase {
  constructor(
    private readonly repository: AdminAssessmentAuthoringRepository,
    private readonly lifecyclePolicy: AdminAssessmentLifecyclePolicy,
    private readonly scoringConfigValidator: AdminAssessmentScoringConfigValidatorService,
  ) {}

  async list(input: {
    page: number;
    limit: number;
    status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
    isPublished?: boolean;
    search?: string;
    slug?: string;
  }) {
    const [items, totalItems] = await this.repository.list({
      page: input.page,
      limit: input.limit,
      status: input.status as AssessmentDefinitionStatus | undefined,
      isPublished: input.isPublished,
      search: input.search?.trim() || undefined,
      slug: input.slug?.trim().toLowerCase() || undefined,
    });

    return {
      success: true as const,
      data: {
        items,
        pagination: {
          page: input.page,
          limit: input.limit,
          totalItems,
          totalPages: Math.max(1, Math.ceil(totalItems / input.limit)),
        },
      },
    };
  }

  async details(id: string) {
    const definition = await this.repository.findById(id);
    if (!definition) {
      throw new NotFoundException({
        message: 'Assessment definition not found.',
        error: 'ADMIN_ASSESSMENT_NOT_FOUND',
      });
    }

    return {
      success: true as const,
      data: {
        item: definition,
      },
    };
  }

  async create(input: {
    slug: string;
    title: string;
    description?: string;
    category: string;
    introText?: string;
    outroText?: string;
    estimatedDurationMinutes?: number;
    scoringConfig?: {
      thresholds: Array<{
        band: AssessmentResultBand;
        minInclusive: number;
        maxInclusive: number;
      }>;
    };
  }) {
    const normalizedSlug = this.lifecyclePolicy.normalizeCanonicalSlug(
      input.slug,
    );
    const existingBySlug = await this.repository.findBySlug(normalizedSlug);
    if (existingBySlug) {
      throw new ConflictException({
        message: 'Assessment slug already exists.',
        error: 'ADMIN_ASSESSMENT_SLUG_ALREADY_EXISTS',
      });
    }

    const scoringConfigJson = input.scoringConfig
      ? this.scoringConfigValidator.validateAndBuildThresholdsJson(
          input.scoringConfig.thresholds,
        )
      : null;

    const created = await this.repository.createDraft({
      slug: normalizedSlug,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: input.category.trim(),
      introText: input.introText?.trim() || null,
      outroText: input.outroText?.trim() || null,
      estimatedDurationMinutes: input.estimatedDurationMinutes ?? null,
      scoringConfigJson,
    });

    return {
      success: true as const,
      data: {
        item: created,
      },
    };
  }

  async updateMetadata(
    id: string,
    input: {
      slug?: string;
      title?: string;
      description?: string;
      category?: string;
      introText?: string;
      outroText?: string;
      estimatedDurationMinutes?: number | null;
    },
  ) {
    const definition = await this.repository.findById(id);
    if (!definition) {
      throw new NotFoundException({
        message: 'Assessment definition not found.',
        error: 'ADMIN_ASSESSMENT_NOT_FOUND',
      });
    }
    this.lifecyclePolicy.assertDraftEditable(definition);

    let nextSlug: string | undefined;
    if (input.slug) {
      nextSlug = this.lifecyclePolicy.normalizeCanonicalSlug(input.slug);
      if (nextSlug !== definition.slug) {
        const existing = await this.repository.findBySlug(nextSlug);
        if (existing) {
          throw new ConflictException({
            message: 'Assessment slug already exists.',
            error: 'ADMIN_ASSESSMENT_SLUG_ALREADY_EXISTS',
          });
        }
      }
    }

    const updated = await this.repository.updateDefinition(id, {
      ...(nextSlug ? { slug: nextSlug } : {}),
      ...(typeof input.title === 'string' ? { title: input.title.trim() } : {}),
      ...(typeof input.description === 'string'
        ? { description: input.description.trim() }
        : {}),
      ...(typeof input.category === 'string'
        ? { category: input.category.trim() }
        : {}),
      ...(typeof input.introText === 'string'
        ? { introText: input.introText.trim() }
        : {}),
      ...(typeof input.outroText === 'string'
        ? { outroText: input.outroText.trim() }
        : {}),
      ...(typeof input.estimatedDurationMinutes !== 'undefined'
        ? { estimatedDurationMinutes: input.estimatedDurationMinutes }
        : {}),
    });

    return {
      success: true as const,
      data: {
        item: updated,
      },
    };
  }

  async forkDraft(id: string) {
    const source = await this.repository.findById(id);
    if (!source) {
      throw new NotFoundException({
        message: 'Assessment definition not found.',
        error: 'ADMIN_ASSESSMENT_NOT_FOUND',
      });
    }
    this.lifecyclePolicy.assertCanForkDraft(source);

    const canonicalSlug = this.lifecyclePolicy.normalizeCanonicalSlug(
      source.slug,
    );
    const nextVersion = source.version + 1;
    const forkSlug = this.lifecyclePolicy.buildDraftSlug(
      canonicalSlug,
      nextVersion,
    );
    const existingFork = await this.repository.findBySlug(forkSlug);
    if (existingFork) {
      throw new ConflictException({
        message: 'A draft fork for this version already exists.',
        error: 'ADMIN_ASSESSMENT_DRAFT_FORK_ALREADY_EXISTS',
      });
    }

    const created = await this.repository.createDraft({
      slug: forkSlug,
      title: source.title,
      description: source.description,
      category: source.category,
      introText: source.introText,
      outroText: source.outroText,
      estimatedDurationMinutes: source.estimatedDurationMinutes,
      scoringConfigJson: source.scoringConfigJson,
    });

    await this.repository.updateDefinition(created.id, {
      version: nextVersion,
    });

    // Clone question/option graph into the new draft version.
    for (const sourceQuestion of source.questions) {
      const createdQuestion = await this.repository.createQuestion({
        assessmentDefinitionId: created.id,
        key: sourceQuestion.key,
        prompt: sourceQuestion.prompt,
        description: sourceQuestion.description,
        inputType: sourceQuestion.inputType,
        isRequired: sourceQuestion.isRequired,
        order: sourceQuestion.order,
      });

      for (const sourceOption of sourceQuestion.options) {
        await this.repository.createOption({
          assessmentQuestionId: createdQuestion.id,
          key: sourceOption.key,
          label: sourceOption.label,
          scoreValue: sourceOption.scoreValue,
          order: sourceOption.order,
        });
      }
    }

    const fork = await this.repository.findById(created.id);
    return {
      success: true as const,
      data: {
        item: fork,
      },
    };
  }
}

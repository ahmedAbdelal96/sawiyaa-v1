import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import {
  AssessmentDefinition,
  AssessmentDefinitionStatus,
} from '@prisma/client';

@Injectable()
export class AdminAssessmentLifecyclePolicy {
  assertDraftEditable(definition: AssessmentDefinition) {
    if (definition.status !== AssessmentDefinitionStatus.DRAFT) {
      throw new ConflictException({
        message: 'Only draft assessments can be edited directly.',
        error: 'ADMIN_ASSESSMENT_NOT_DRAFT',
      });
    }
  }

  assertCanForkDraft(definition: AssessmentDefinition) {
    if (
      definition.status !== AssessmentDefinitionStatus.ACTIVE ||
      !definition.isPublished
    ) {
      throw new ConflictException({
        message:
          'Only active published assessments can be forked into a new draft version.',
        error: 'ADMIN_ASSESSMENT_FORK_REQUIRES_PUBLISHED_ACTIVE',
      });
    }
  }

  assertCanPublish(definition: AssessmentDefinition) {
    if (definition.status !== AssessmentDefinitionStatus.DRAFT) {
      throw new ConflictException({
        message: 'Only draft assessments can be published.',
        error: 'ADMIN_ASSESSMENT_PUBLISH_REQUIRES_DRAFT',
      });
    }
  }

  assertCanUnpublish(definition: AssessmentDefinition) {
    if (
      definition.status !== AssessmentDefinitionStatus.ACTIVE ||
      !definition.isPublished
    ) {
      throw new ConflictException({
        message: 'Only active published assessments can be unpublished.',
        error: 'ADMIN_ASSESSMENT_UNPUBLISH_REQUIRES_ACTIVE',
      });
    }
  }

  assertPublishedWithSubmissionsImmutable(
    definition: AssessmentDefinition,
    submissionsCount: number,
  ) {
    if (
      definition.status === AssessmentDefinitionStatus.ACTIVE &&
      definition.isPublished &&
      submissionsCount > 0
    ) {
      throw new ConflictException({
        message:
          'Published assessments with submissions are immutable. Use fork-draft.',
        error: 'ADMIN_ASSESSMENT_IMMUTABLE_PUBLISHED_VERSION',
      });
    }
  }

  normalizeCanonicalSlug(slug: string): string {
    return slug
      .trim()
      .toLowerCase()
      .replace(/--draft-v\d+$/i, '')
      .replace(/-v\d+$/i, '');
  }

  buildDraftSlug(canonicalSlug: string, version: number): string {
    if (version <= 1) {
      throw new BadRequestException({
        message: 'Draft version must be greater than 1.',
        error: 'ADMIN_ASSESSMENT_INVALID_DRAFT_VERSION',
      });
    }

    return `${canonicalSlug}--draft-v${version}`;
  }
}

import { Injectable } from '@nestjs/common';
import { CareRecommendationType } from '../dto/shared-recommendation.dto';

type RecommendationItem = {
  type: CareRecommendationType;
  priority: number;
  reasonCode: string;
  reasonText: string;
  action: {
    type: string;
    targetType: string | null;
    targetId: string | null;
  };
  entityRefs: Array<{
    entityType: string;
    entityId: string;
  }>;
  expiresAt: string | null;
  label?: string | null;
};

@Injectable()
export class RecommendationPrecedenceService {
  private readonly typeFallbackPriority: Record<
    CareRecommendationType,
    number
  > = {
    COMPLETE_PAYMENT: 100,
    JOIN_UPCOMING_SESSION: 90,
    VIEW_SUPPORT_TICKET: 80,
    BOOK_NEXT_SESSION: 70,
    START_GUIDED_MATCHING: 60,
    TAKE_ASSESSMENT: 50,
    PRACTITIONER_MATCH: 65,
  };

  apply<T extends RecommendationItem>(items: T[]): T[] {
    return [...items].sort((left, right) => {
      const leftPriority = this.resolvePriority(left);
      const rightPriority = this.resolvePriority(right);

      if (rightPriority !== leftPriority) {
        return rightPriority - leftPriority;
      }
      if (left.type !== right.type) {
        return left.type.localeCompare(right.type);
      }
      if (left.reasonCode !== right.reasonCode) {
        return left.reasonCode.localeCompare(right.reasonCode);
      }
      if (left.action.type !== right.action.type) {
        return left.action.type.localeCompare(right.action.type);
      }

      const leftTarget = `${left.action.targetType ?? ''}:${left.action.targetId ?? ''}`;
      const rightTarget = `${right.action.targetType ?? ''}:${right.action.targetId ?? ''}`;
      if (leftTarget !== rightTarget) {
        return leftTarget.localeCompare(rightTarget);
      }

      const leftRefs = left.entityRefs
        .map((ref) => `${ref.entityType}:${ref.entityId}`)
        .sort()
        .join('|');
      const rightRefs = right.entityRefs
        .map((ref) => `${ref.entityType}:${ref.entityId}`)
        .sort()
        .join('|');
      return leftRefs.localeCompare(rightRefs);
    });
  }

  private resolvePriority(item: RecommendationItem): number {
    return Number.isFinite(item.priority)
      ? item.priority
      : this.typeFallbackPriority[item.type];
  }
}

import { Injectable } from '@nestjs/common';
import { ListPublicArticlesUseCase } from '@modules/articles/use-cases/list-public-articles.use-case';
import { ARTICLE_DEFAULT_LOCALE } from '@modules/articles/types/articles.types';
import { ContentLocale } from '@prisma/client';
import { NormalizedCareSignalContext } from '@modules/care-experience-intelligence/types/care-signal-context.types';
import { PatientJourneyNextStepType } from '../types/patient-journey.types';

type ContentLinkRule = {
  key: string;
  priority: number;
  query: string;
  reasonCode: string;
  reasonText: string;
};

@Injectable()
export class BuildPatientJourneyLinkedContentService {
  private readonly maxSuggestions = 3;

  constructor(
    private readonly listPublicArticlesUseCase: ListPublicArticlesUseCase,
  ) {}

  async build(input: {
    normalizedContext: NormalizedCareSignalContext;
    suggestedNextAction: PatientJourneyNextStepType;
    locale?: ContentLocale;
  }) {
    const rules = this.buildRules(input);
    const locale = input.locale ?? ARTICLE_DEFAULT_LOCALE;

    const linked: Array<{
      article: {
        id: string;
        title: string;
        slug: string;
        excerpt: string | null;
        coverImageUrl: string | null;
        publishedAt: string | null;
        category: {
          id: string;
          slugRoot: string;
          slug: string;
          title: string;
        } | null;
        trust: {
          freshnessBand: 'NEW' | 'RECENT' | 'ESTABLISHED' | 'UNPUBLISHED';
          isFreshContent: boolean;
          authorDisplayName: string | null;
          reasonCodes: string[];
        };
      };
      priority: number;
      reasonCode: string;
      reasonText: string;
    }> = [];

    const seenArticleIds = new Set<string>();

    for (const rule of rules) {
      if (linked.length >= this.maxSuggestions) {
        break;
      }

      const result = await this.listPublicArticlesUseCase.execute({
        page: 1,
        limit: this.maxSuggestions,
        locale,
        q: rule.query,
      });

      for (const item of result.items) {
        if (linked.length >= this.maxSuggestions) {
          break;
        }
        if (seenArticleIds.has(item.id)) {
          continue;
        }

        linked.push({
          article: {
            ...item,
          },
          priority: rule.priority,
          reasonCode: rule.reasonCode,
          reasonText: rule.reasonText,
        });
        seenArticleIds.add(item.id);
      }
    }

    return linked.sort((a, b) => b.priority - a.priority);
  }

  private buildRules(input: {
    normalizedContext: NormalizedCareSignalContext;
    suggestedNextAction: PatientJourneyNextStepType;
  }): ContentLinkRule[] {
    const rules: ContentLinkRule[] = [];
    const stage = input.normalizedContext.continuity.stage;
    const actionCategory =
      input.normalizedContext.assessments.interpretation.actionCategory;

    switch (input.suggestedNextAction) {
      case 'COMPLETE_PAYMENT':
        rules.push({
          key: 'payment',
          priority: 100,
          query: 'payment',
          reasonCode: 'CONTENT_PAYMENT_BLOCKED',
          reasonText:
            'Selected because your current next step is resolving a pending payment.',
        });
        break;
      case 'JOIN_UPCOMING_SESSION':
        rules.push({
          key: 'upcoming-session',
          priority: 90,
          query: 'session',
          reasonCode: 'CONTENT_UPCOMING_SESSION',
          reasonText:
            'Selected to support your upcoming session continuity step.',
        });
        break;
      case 'BOOK_NEXT_SESSION':
        rules.push({
          key: 'book-next',
          priority: 80,
          query: 'consultation',
          reasonCode: 'CONTENT_BOOKING_CONTINUITY',
          reasonText:
            'Selected because booking continuity is currently recommended.',
        });
        break;
      case 'TAKE_ASSESSMENT':
        rules.push({
          key: 'assessment',
          priority: 70,
          query: 'assessment',
          reasonCode: 'CONTENT_ASSESSMENT_GUIDANCE',
          reasonText:
            'Selected because completing an assessment is your current next step.',
        });
        break;
      case 'START_GUIDED_MATCHING':
        rules.push({
          key: 'matching',
          priority: 75,
          query: 'matching',
          reasonCode: 'CONTENT_MATCHING_GUIDANCE',
          reasonText:
            'Selected because guided matching is currently recommended for your journey.',
        });
        break;
      case 'VIEW_SUPPORT_TICKET':
        rules.push({
          key: 'support',
          priority: 85,
          query: 'support',
          reasonCode: 'CONTENT_SUPPORT_FOLLOW_UP',
          reasonText:
            'Selected because you have an open support flow requiring follow-up.',
        });
        break;
      default:
        break;
    }

    if (stage === 'ACTIVE_CARE' || input.normalizedContext.training.hasActiveEnrollment) {
      rules.push({
        key: 'active-care',
        priority: 65,
        query: 'training',
        reasonCode: 'CONTENT_ACTIVE_CARE_CONTINUITY',
        reasonText:
          'Selected to support continuity while you are in an active care/training stage.',
      });
    }

    if (actionCategory === 'BOOK_PRIORITY_CONSULTATION') {
      rules.push({
        key: 'priority-booking',
        priority: 78,
        query: 'priority',
        reasonCode: 'CONTENT_PRIORITY_BOOKING',
        reasonText:
          'Selected because your interpreted care intent suggests prioritized consultation.',
      });
    }

    rules.push({
      key: 'baseline',
      priority: 40,
      query: 'therapy',
      reasonCode: 'CONTENT_BASELINE_GUIDANCE',
      reasonText:
        'Selected as a baseline guidance fallback when primary intent content is limited.',
    });

    const seenKeys = new Set<string>();
    return rules.filter((rule) => {
      if (seenKeys.has(rule.key)) {
        return false;
      }
      seenKeys.add(rule.key);
      return true;
    });
  }
}

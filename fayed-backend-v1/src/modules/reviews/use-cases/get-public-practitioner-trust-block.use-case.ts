import { Injectable } from '@nestjs/common';
import { ListPublicArticlesUseCase } from '@modules/articles/use-cases/list-public-articles.use-case';
import { GetPublicPractitionerTrustBlockDto } from '../dto/get-public-practitioner-trust-block.dto';
import { ListPublicPractitionerReviewsUseCase } from './list-public-practitioner-reviews.use-case';
import { GetPublicPractitionerTrustSummaryUseCase } from './get-public-practitioner-trust-summary.use-case';
import { BuildPublicTrustConversionContentQueryService } from '../services/build-public-trust-conversion-content-query.service';

@Injectable()
export class GetPublicPractitionerTrustBlockUseCase {
  constructor(
    private readonly getPublicPractitionerTrustSummaryUseCase: GetPublicPractitionerTrustSummaryUseCase,
    private readonly listPublicPractitionerReviewsUseCase: ListPublicPractitionerReviewsUseCase,
    private readonly listPublicArticlesUseCase: ListPublicArticlesUseCase,
    private readonly buildPublicTrustConversionContentQueryService: BuildPublicTrustConversionContentQueryService,
  ) {}

  async execute(input: { slug: string; query: GetPublicPractitionerTrustBlockDto }) {
    const trustSummary = await this.getPublicPractitionerTrustSummaryUseCase.execute({
      slug: input.slug,
    });
    const reviews = await this.listPublicPractitionerReviewsUseCase.execute({
      slug: input.slug,
      query: {
        page: 1,
        limit: input.query.reviewLimit,
      },
    });

    const contentQueryPlan =
      this.buildPublicTrustConversionContentQueryService.build({
        totalPublicReviews: trustSummary.summary.totalPublicReviews,
        freshness: trustSummary.summary.freshness,
        hasEnoughPublicReviews: trustSummary.summary.hasEnoughPublicReviews,
      });

    const primarySuggestions = await this.listPublicArticlesUseCase.execute({
      page: 1,
      limit: input.query.contentLimit,
      locale: input.query.locale,
      q: contentQueryPlan.primaryQuery,
    });

    const suggestions = [...primarySuggestions.items];
    if (suggestions.length < input.query.contentLimit) {
      const fallbackSuggestions = await this.listPublicArticlesUseCase.execute({
        page: 1,
        limit: input.query.contentLimit,
        locale: input.query.locale,
        q: contentQueryPlan.fallbackQuery,
      });

      for (const item of fallbackSuggestions.items) {
        if (suggestions.length >= input.query.contentLimit) {
          break;
        }
        if (suggestions.some((existing) => existing.id === item.id)) {
          continue;
        }
        suggestions.push(item);
      }
    }

    return {
      practitioner: trustSummary.practitioner,
      summary: trustSummary.summary,
      highlightedReviews: reviews.items.slice(0, input.query.reviewLimit),
      contentSuggestions: suggestions.slice(0, input.query.contentLimit),
      compositionMeta: {
        generatedAt: new Date().toISOString(),
        reasonCodes: [
          'TRUST_BLOCK_COMPOSED_FROM_SAFE_READ_LAYERS',
          ...contentQueryPlan.reasonCodes,
        ],
      },
    };
  }
}

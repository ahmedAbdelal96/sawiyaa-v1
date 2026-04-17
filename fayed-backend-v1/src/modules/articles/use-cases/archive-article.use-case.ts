import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ArticleStatus, ContentLocale } from '@prisma/client';
import { ArticlePresenter } from '../presenters/article.presenter';
import { ArticleRepository } from '../repositories/article.repository';
import { ValidateArticleStatusTransitionService } from '../services/validate-article-status-transition.service';
import { ARTICLE_DEFAULT_LOCALE } from '../types/articles.types';

@Injectable()
export class ArchiveArticleUseCase {
  private readonly logger = new Logger(ArchiveArticleUseCase.name);

  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly validateArticleStatusTransitionService: ValidateArticleStatusTransitionService,
    private readonly articlePresenter: ArticlePresenter,
  ) {}

  async execute(input: { articleId: string; locale?: ContentLocale }) {
    const existing = await this.articleRepository.findArticleById(input.articleId);
    if (!existing) {
      throw new NotFoundException({
        messageKey: 'articles.errors.articleNotFound',
        error: 'ARTICLE_NOT_FOUND',
      });
    }

    this.validateArticleStatusTransitionService.assertCanArchive(existing.status);

    const updated = await this.articleRepository.updateArticle(input.articleId, {
      status: ArticleStatus.ARCHIVED,
      archivedAt: new Date(),
    });

    this.logger.log(`Article archived (id=${input.articleId})`);

    return {
      item: this.articlePresenter.presentAdminArticleItem(
        updated,
        input.locale ?? existing.translations[0]?.locale ?? ARTICLE_DEFAULT_LOCALE,
      ),
    };
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { ArticleStatus } from '@prisma/client';

@Injectable()
export class ValidateArticleStatusTransitionService {
  assertCanPublish(currentStatus: ArticleStatus): void {
    if (currentStatus === ArticleStatus.PUBLISHED) {
      return;
    }

    if (currentStatus !== ArticleStatus.DRAFT) {
      throw new BadRequestException({
        messageKey: 'articles.errors.invalidPublishTransition',
        error: 'ARTICLE_INVALID_PUBLISH_TRANSITION',
      });
    }
  }

  assertCanArchive(currentStatus: ArticleStatus): void {
    if (
      currentStatus !== ArticleStatus.DRAFT &&
      currentStatus !== ArticleStatus.PUBLISHED
    ) {
      throw new BadRequestException({
        messageKey: 'articles.errors.invalidArchiveTransition',
        error: 'ARTICLE_INVALID_ARCHIVE_TRANSITION',
      });
    }
  }
}

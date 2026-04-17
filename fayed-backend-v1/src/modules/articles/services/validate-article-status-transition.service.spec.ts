import { BadRequestException } from '@nestjs/common';
import { ArticleStatus } from '@prisma/client';
import { ValidateArticleStatusTransitionService } from './validate-article-status-transition.service';

describe('ValidateArticleStatusTransitionService', () => {
  const service = new ValidateArticleStatusTransitionService();

  it('allows publish from draft and already-published', () => {
    expect(() => service.assertCanPublish(ArticleStatus.DRAFT)).not.toThrow();
    expect(() => service.assertCanPublish(ArticleStatus.PUBLISHED)).not.toThrow();
  });

  it('rejects publish from archived', () => {
    expect(() => service.assertCanPublish(ArticleStatus.ARCHIVED)).toThrow(
      BadRequestException,
    );
  });

  it('allows archive from draft/published and rejects unsupported transitions', () => {
    expect(() => service.assertCanArchive(ArticleStatus.DRAFT)).not.toThrow();
    expect(() => service.assertCanArchive(ArticleStatus.PUBLISHED)).not.toThrow();
    expect(() => service.assertCanArchive(ArticleStatus.APPROVED)).toThrow(
      BadRequestException,
    );
  });
});

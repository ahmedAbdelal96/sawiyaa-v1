import { ApiProperty } from '@nestjs/swagger';
import { ArticleStatus, ContentLocale } from '@prisma/client';

export class ArticleCategoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slugRoot!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true })
  metaTitle!: string | null;

  @ApiProperty({ nullable: true })
  metaDescription!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  sortOrder!: number;
}

export class ArticleSeoDto {
  @ApiProperty({ nullable: true })
  metaTitle!: string | null;

  @ApiProperty({ nullable: true })
  metaDescription!: string | null;
}

export enum PublicArticleFreshnessBandDto {
  NEW = 'NEW',
  RECENT = 'RECENT',
  ESTABLISHED = 'ESTABLISHED',
  UNPUBLISHED = 'UNPUBLISHED',
}

export enum PublicArticleTrustReasonCodeDto {
  PUBLISHED_DATE_VERIFIED = 'PUBLISHED_DATE_VERIFIED',
  RECENTLY_PUBLISHED = 'RECENTLY_PUBLISHED',
  ESTABLISHED_CONTENT = 'ESTABLISHED_CONTENT',
  AUTHOR_ATTRIBUTED = 'AUTHOR_ATTRIBUTED',
  AUTHOR_UNATTRIBUTED = 'AUTHOR_UNATTRIBUTED',
}

export class PublicArticleTrustMetadataDto {
  @ApiProperty({ enum: PublicArticleFreshnessBandDto })
  freshnessBand!: PublicArticleFreshnessBandDto;

  @ApiProperty()
  isFreshContent!: boolean;

  @ApiProperty({ nullable: true })
  authorDisplayName!: string | null;

  @ApiProperty({ enum: PublicArticleTrustReasonCodeDto, isArray: true })
  reasonCodes!: PublicArticleTrustReasonCodeDto[];
}

export class PublicArticleListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true })
  excerpt!: string | null;

  @ApiProperty({ nullable: true })
  coverImageUrl!: string | null;

  @ApiProperty({ nullable: true })
  publishedAt!: string | null;

  @ApiProperty({ type: ArticleCategoryDto, nullable: true })
  category!: ArticleCategoryDto | null;

  @ApiProperty({ type: PublicArticleTrustMetadataDto })
  trust!: PublicArticleTrustMetadataDto;
}

export class PublicArticleDetailsDto extends PublicArticleListItemDto {
  @ApiProperty()
  content!: string;

  @ApiProperty({ type: ArticleSeoDto })
  seo!: ArticleSeoDto;

  @ApiProperty({ enum: ContentLocale })
  locale!: ContentLocale;
}

export class AdminArticleItemDto extends PublicArticleDetailsDto {
  @ApiProperty({ enum: ArticleStatus })
  status!: ArticleStatus;

  @ApiProperty({ nullable: true })
  archivedAt!: string | null;

  @ApiProperty()
  authorUserId!: string;

  @ApiProperty({ nullable: true })
  updatedAt!: string | null;

  @ApiProperty({ nullable: true })
  createdAt!: string | null;
}

export class ArticlesPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PublicArticleListDataDto {
  @ApiProperty({ type: PublicArticleListItemDto, isArray: true })
  items!: PublicArticleListItemDto[];

  @ApiProperty({ type: ArticlesPaginationDto })
  pagination!: ArticlesPaginationDto;
}

export class PublicArticleItemDataDto {
  @ApiProperty({ type: PublicArticleDetailsDto })
  item!: PublicArticleDetailsDto;
}

export class PublicArticleCategoryListDataDto {
  @ApiProperty({ type: ArticleCategoryDto, isArray: true })
  items!: ArticleCategoryDto[];

  @ApiProperty({ type: ArticlesPaginationDto })
  pagination!: ArticlesPaginationDto;
}

export class AdminArticleListDataDto {
  @ApiProperty({ type: AdminArticleItemDto, isArray: true })
  items!: AdminArticleItemDto[];

  @ApiProperty({ type: ArticlesPaginationDto })
  pagination!: ArticlesPaginationDto;
}

export class AdminArticleItemDataDto {
  @ApiProperty({ type: AdminArticleItemDto })
  item!: AdminArticleItemDto;
}

export class AdminArticleCategoryItemDataDto {
  @ApiProperty({ type: ArticleCategoryDto })
  item!: ArticleCategoryDto;
}

export class AdminArticleCategoryListDataDto {
  @ApiProperty({ type: ArticleCategoryDto, isArray: true })
  items!: ArticleCategoryDto[];

  @ApiProperty({ type: ArticlesPaginationDto })
  pagination!: ArticlesPaginationDto;
}

export class PublicArticleListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PublicArticleListDataDto })
  data!: PublicArticleListDataDto;
}

export class PublicArticleItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PublicArticleItemDataDto })
  data!: PublicArticleItemDataDto;
}

export class PublicArticleCategoryListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PublicArticleCategoryListDataDto })
  data!: PublicArticleCategoryListDataDto;
}

export class AdminArticleListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminArticleListDataDto })
  data!: AdminArticleListDataDto;
}

export class AdminArticleItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminArticleItemDataDto })
  data!: AdminArticleItemDataDto;
}

export class AdminArticleCategoryListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminArticleCategoryListDataDto })
  data!: AdminArticleCategoryListDataDto;
}

export class AdminArticleCategoryItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminArticleCategoryItemDataDto })
  data!: AdminArticleCategoryItemDataDto;
}

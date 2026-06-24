import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HelpCategory, HelpQuestion } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  HelpCategoriesResponseDto,
  HelpCategoryDto,
  HelpQuestionsResponseDto,
  HelpQuestionDto,
  PublicHelpResponseDto,
  ReorderHelpCategoriesDto,
  ReorderHelpQuestionsDto,
  UpsertHelpCategoryDto,
  UpsertHelpQuestionDto,
} from '../dto/help.dto';

type CategoryWithQuestions = HelpCategory & {
  questions?: HelpQuestion[];
};

type QuestionWithCategory = HelpQuestion & {
  category?: Pick<
    HelpCategory,
    'id' | 'slug' | 'titleAr' | 'titleEn' | 'isActive'
  > | null;
};

function isPrismaUniqueError(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toCategoryDto(category: HelpCategory): HelpCategoryDto {
  return {
    id: category.id,
    slug: category.slug,
    titleAr: category.titleAr,
    titleEn: category.titleEn,
    descriptionAr: category.descriptionAr ?? null,
    descriptionEn: category.descriptionEn ?? null,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

function toQuestionDto(question: QuestionWithCategory): HelpQuestionDto {
  return {
    id: question.id,
    categoryId: question.categoryId ?? null,
    categorySlug: question.category?.slug ?? null,
    categoryTitleAr: question.category?.titleAr ?? null,
    categoryTitleEn: question.category?.titleEn ?? null,
    questionAr: question.questionAr,
    questionEn: question.questionEn,
    answerAr: question.answerAr,
    answerEn: question.answerEn,
    sortOrder: question.sortOrder,
    isActive: question.isActive,
    createdAt: question.createdAt.toISOString(),
    updatedAt: question.updatedAt.toISOString(),
  };
}

@Injectable()
export class HelpService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextCategorySortOrder(): Promise<number> {
    const last = await this.prisma.helpCategory.findFirst({
      orderBy: [{ sortOrder: 'desc' }, { createdAt: 'desc' }],
      select: { sortOrder: true },
    });
    return (last?.sortOrder ?? 0) + 1;
  }

  private async nextQuestionSortOrder(): Promise<number> {
    const last = await this.prisma.helpQuestion.findFirst({
      orderBy: [{ sortOrder: 'desc' }, { createdAt: 'desc' }],
      select: { sortOrder: true },
    });
    return (last?.sortOrder ?? 0) + 1;
  }

  private async ensureCategoryExists(categoryId: string | null | undefined) {
    if (!categoryId) return null;
    const category = await this.prisma.helpCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new NotFoundException({
        messageKey: 'help.errors.categoryNotFound',
        error: 'HELP_CATEGORY_NOT_FOUND',
      });
    }
    return category.id;
  }

  private async listCategoriesInternal(
    includeInactive = true,
  ): Promise<CategoryWithQuestions[]> {
    return this.prisma.helpCategory.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        questions: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
  }

  private async listQuestionsInternal(includeInactive = true) {
    return this.prisma.helpQuestion.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        category: {
          select: {
            id: true,
            slug: true,
            titleAr: true,
            titleEn: true,
            isActive: true,
          },
        },
      },
    });
  }

  async listAdminCategories(): Promise<HelpCategoriesResponseDto> {
    const categories = await this.listCategoriesInternal(true);
    return {
      items: categories.map((category) => toCategoryDto(category)),
    };
  }

  async listAdminQuestions(): Promise<HelpQuestionsResponseDto> {
    const questions = await this.listQuestionsInternal(true);
    return {
      items: questions.map((question) => toQuestionDto(question)),
    };
  }

  async createCategory(
    body: UpsertHelpCategoryDto,
  ): Promise<HelpCategoriesResponseDto> {
    try {
      await this.prisma.helpCategory.create({
        data: {
          slug: body.slug.trim().toLowerCase(),
          titleAr: body.titleAr.trim(),
          titleEn: body.titleEn.trim(),
          descriptionAr: normalizeOptionalText(body.descriptionAr),
          descriptionEn: normalizeOptionalText(body.descriptionEn),
          sortOrder: body.sortOrder ?? (await this.nextCategorySortOrder()),
          isActive: body.isActive ?? true,
        },
      });
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new ConflictException({
          messageKey: 'help.errors.categorySlugExists',
          error: 'HELP_CATEGORY_SLUG_EXISTS',
        });
      }
      throw error;
    }

    return this.listAdminCategories();
  }

  async updateCategory(
    id: string,
    body: UpsertHelpCategoryDto,
  ): Promise<HelpCategoriesResponseDto> {
    await this.ensureCategoryExists(id);

    try {
      await this.prisma.helpCategory.update({
        where: { id },
        data: {
          slug: body.slug.trim().toLowerCase(),
          titleAr: body.titleAr.trim(),
          titleEn: body.titleEn.trim(),
          descriptionAr: normalizeOptionalText(body.descriptionAr),
          descriptionEn: normalizeOptionalText(body.descriptionEn),
          sortOrder: body.sortOrder,
          isActive: body.isActive,
        },
      });
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new ConflictException({
          messageKey: 'help.errors.categorySlugExists',
          error: 'HELP_CATEGORY_SLUG_EXISTS',
        });
      }
      throw error;
    }

    return this.listAdminCategories();
  }

  async deleteCategory(id: string): Promise<HelpCategoriesResponseDto> {
    await this.ensureCategoryExists(id);
    await this.prisma.helpCategory.delete({ where: { id } });
    return this.listAdminCategories();
  }

  async reorderCategories(
    body: ReorderHelpCategoriesDto,
  ): Promise<HelpCategoriesResponseDto> {
    const existing = await this.prisma.helpCategory.findMany({
      select: { id: true },
    });
    const existingIds = new Set(existing.map((item) => item.id));
    const invalid = body.items.find((item) => !existingIds.has(item.id));
    if (invalid) {
      throw new NotFoundException({
        messageKey: 'help.errors.categoryNotFound',
        error: 'HELP_CATEGORY_NOT_FOUND',
      });
    }

    await this.prisma.$transaction(
      body.items.map((item) =>
        this.prisma.helpCategory.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    return this.listAdminCategories();
  }

  async createQuestion(
    body: UpsertHelpQuestionDto,
  ): Promise<HelpQuestionsResponseDto> {
    const categoryId = await this.ensureCategoryExists(body.categoryId ?? null);

    await this.prisma.helpQuestion.create({
      data: {
        categoryId,
        questionAr: body.questionAr.trim(),
        questionEn: body.questionEn.trim(),
        answerAr: body.answerAr.trim(),
        answerEn: body.answerEn.trim(),
        sortOrder: body.sortOrder ?? (await this.nextQuestionSortOrder()),
        isActive: body.isActive ?? true,
      },
    });

    return this.listAdminQuestions();
  }

  async updateQuestion(
    id: string,
    body: UpsertHelpQuestionDto,
  ): Promise<HelpQuestionsResponseDto> {
    const existing = await this.prisma.helpQuestion.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException({
        messageKey: 'help.errors.questionNotFound',
        error: 'HELP_QUESTION_NOT_FOUND',
      });
    }

    const categoryId = await this.ensureCategoryExists(body.categoryId ?? null);

    await this.prisma.helpQuestion.update({
      where: { id },
      data: {
        categoryId,
        questionAr: body.questionAr.trim(),
        questionEn: body.questionEn.trim(),
        answerAr: body.answerAr.trim(),
        answerEn: body.answerEn.trim(),
        sortOrder: body.sortOrder,
        isActive: body.isActive,
      },
    });

    return this.listAdminQuestions();
  }

  async deleteQuestion(id: string): Promise<HelpQuestionsResponseDto> {
    const existing = await this.prisma.helpQuestion.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException({
        messageKey: 'help.errors.questionNotFound',
        error: 'HELP_QUESTION_NOT_FOUND',
      });
    }

    await this.prisma.helpQuestion.delete({ where: { id } });
    return this.listAdminQuestions();
  }

  async reorderQuestions(
    body: ReorderHelpQuestionsDto,
  ): Promise<HelpQuestionsResponseDto> {
    const existing = await this.prisma.helpQuestion.findMany({
      select: { id: true },
    });
    const existingIds = new Set(existing.map((item) => item.id));
    const invalid = body.items.find((item) => !existingIds.has(item.id));
    if (invalid) {
      throw new NotFoundException({
        messageKey: 'help.errors.questionNotFound',
        error: 'HELP_QUESTION_NOT_FOUND',
      });
    }

    await this.prisma.$transaction(
      body.items.map((item) =>
        this.prisma.helpQuestion.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    return this.listAdminQuestions();
  }

  async getPublicHelp(): Promise<PublicHelpResponseDto> {
    const categories = await this.prisma.helpCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const activeCategoryIds = categories.map((category) => category.id);
    const questions = await this.prisma.helpQuestion.findMany({
      where: {
        isActive: true,
        OR: [{ categoryId: null }, { categoryId: { in: activeCategoryIds } }],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        category: {
          select: {
            id: true,
            slug: true,
            titleAr: true,
            titleEn: true,
            isActive: true,
          },
        },
      },
    });

    return {
      categories: categories.map((category) => toCategoryDto(category)),
      questions: questions.map((question) => toQuestionDto(question)),
    };
  }

  async getPublicCategories(): Promise<HelpCategoriesResponseDto> {
    const help = await this.getPublicHelp();
    return { items: help.categories };
  }

  async getPublicQuestions(): Promise<HelpQuestionsResponseDto> {
    const help = await this.getPublicHelp();
    return { items: help.questions };
  }

  async searchPublicHelp(query: string): Promise<PublicHelpResponseDto> {
    const trimmed = query.trim();
    if (!trimmed) {
      return this.getPublicHelp();
    }

    const activeCategories = await this.prisma.helpCategory.findMany({
      where: {
        isActive: true,
        OR: [
          { titleAr: { contains: trimmed, mode: 'insensitive' } },
          { titleEn: { contains: trimmed, mode: 'insensitive' } },
          { descriptionAr: { contains: trimmed, mode: 'insensitive' } },
          { descriptionEn: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const activeCategoryIds = activeCategories.map((category) => category.id);

    const questions = await this.prisma.helpQuestion.findMany({
      where: {
        isActive: true,
        OR: [{ categoryId: null }, { categoryId: { in: activeCategoryIds } }],
        AND: [
          {
            OR: [
              { questionAr: { contains: trimmed, mode: 'insensitive' } },
              { questionEn: { contains: trimmed, mode: 'insensitive' } },
              { answerAr: { contains: trimmed, mode: 'insensitive' } },
              { answerEn: { contains: trimmed, mode: 'insensitive' } },
            ],
          },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        category: {
          select: {
            id: true,
            slug: true,
            titleAr: true,
            titleEn: true,
            isActive: true,
          },
        },
      },
    });

    const matchedCategoryIds = new Set(
      questions
        .map((question) => question.categoryId)
        .filter((value): value is string => Boolean(value)),
    );
    const trimmedLower = trimmed.toLowerCase();
    for (const question of questions) {
      if (question.category) {
        matchedCategoryIds.add(question.category.id);
      }
    }

    const categories = activeCategories.filter((category) => {
      const titleAr = category.titleAr.toLowerCase();
      const titleEn = category.titleEn.toLowerCase();
      const descriptionAr = (category.descriptionAr ?? '').toLowerCase();
      const descriptionEn = (category.descriptionEn ?? '').toLowerCase();
      return (
        matchedCategoryIds.has(category.id) ||
        titleAr.includes(trimmedLower) ||
        titleEn.includes(trimmedLower) ||
        descriptionAr.includes(trimmedLower) ||
        descriptionEn.includes(trimmedLower)
      );
    });

    return {
      categories: categories.map((category) => toCategoryDto(category)),
      questions: questions.map((question) => toQuestionDto(question)),
    };
  }
}

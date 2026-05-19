import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { HelpService } from './help.service';

describe('HelpService', () => {
  const prisma = {
    helpCategory: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    helpQuestion: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  } as unknown as PrismaService;

  const service = new HelpService(prisma);

  const categories = [
    {
      id: 'cat_1',
      slug: 'account-and-sign-in',
      titleAr: 'الحساب والدخول',
      titleEn: 'Account and sign-in',
      descriptionAr: 'وصف عربي',
      descriptionEn: 'English description',
      sortOrder: 1,
      isActive: true,
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
      updatedAt: new Date('2026-05-02T10:00:00.000Z'),
      questions: [],
    },
    {
      id: 'cat_2',
      slug: 'payments-and-refunds',
      titleAr: 'المدفوعات والاسترجاع',
      titleEn: 'Payments and refunds',
      descriptionAr: null,
      descriptionEn: null,
      sortOrder: 2,
      isActive: false,
      createdAt: new Date('2026-05-01T11:00:00.000Z'),
      updatedAt: new Date('2026-05-02T11:00:00.000Z'),
      questions: [],
    },
  ];

  const questions = [
    {
      id: 'q_1',
      categoryId: 'cat_1',
      categorySlug: 'account-and-sign-in',
      categoryTitleAr: 'الحساب والدخول',
      categoryTitleEn: 'Account and sign-in',
      questionAr: 'كيف أنشئ حسابًا جديدًا؟',
      questionEn: 'How do I create a new account?',
      answerAr: 'يمكنك إنشاء حساب جديد بسهولة.',
      answerEn: 'You can create a new account easily.',
      sortOrder: 1,
      isActive: true,
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
      updatedAt: new Date('2026-05-02T10:00:00.000Z'),
    },
    {
      id: 'q_2',
      categoryId: null,
      categorySlug: null,
      categoryTitleAr: null,
      categoryTitleEn: null,
      questionAr: 'متى يتم خصم المبلغ؟',
      questionEn: 'When is the amount charged?',
      answerAr: 'يتم الخصم بعد تأكيد الدفع.',
      answerEn: 'The amount is charged after payment confirmation.',
      sortOrder: 2,
      isActive: true,
      createdAt: new Date('2026-05-01T11:00:00.000Z'),
      updatedAt: new Date('2026-05-02T11:00:00.000Z'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.helpCategory.findFirst as jest.Mock).mockResolvedValue({
      sortOrder: 2,
    });
    (prisma.helpCategory.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.helpCategory.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.helpCategory.create as jest.Mock).mockImplementation(
      async ({ data }) => ({
        id: `cat_${data.slug}`,
        ...data,
        createdAt: new Date('2026-05-03T10:00:00.000Z'),
        updatedAt: new Date('2026-05-03T10:00:00.000Z'),
        questions: [],
      }),
    );
    (prisma.helpCategory.update as jest.Mock).mockImplementation(
      async ({ where, data }) => ({
        id: where.id,
        slug: data.slug ?? 'updated',
        titleAr: data.titleAr ?? 'updated',
        titleEn: data.titleEn ?? 'updated',
        descriptionAr: data.descriptionAr ?? null,
        descriptionEn: data.descriptionEn ?? null,
        sortOrder: data.sortOrder ?? 1,
        isActive: data.isActive ?? true,
        createdAt: new Date('2026-05-03T10:00:00.000Z'),
        updatedAt: new Date('2026-05-03T10:00:00.000Z'),
        questions: [],
      }),
    );
    (prisma.helpQuestion.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.helpQuestion.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.helpQuestion.create as jest.Mock).mockImplementation(
      async ({ data }) => ({
        id: `q_${data.sortOrder}`,
        ...data,
        categorySlug: null,
        categoryTitleAr: null,
        categoryTitleEn: null,
        createdAt: new Date('2026-05-03T10:00:00.000Z'),
        updatedAt: new Date('2026-05-03T10:00:00.000Z'),
      }),
    );
    (prisma.helpQuestion.update as jest.Mock).mockImplementation(
      async ({ where, data }) => ({
        id: where.id,
        ...data,
        categoryId: data.categoryId ?? null,
        categorySlug: null,
        categoryTitleAr: null,
        categoryTitleEn: null,
        createdAt: new Date('2026-05-03T10:00:00.000Z'),
        updatedAt: new Date('2026-05-03T10:00:00.000Z'),
      }),
    );
  });

  it('creates categories with normalized slugs', async () => {
    (prisma.helpCategory.findMany as jest.Mock).mockResolvedValue([
      categories[0],
    ]);

    await service.createCategory({
      slug: 'HELP-CENTER',
      titleAr: 'مساعدة',
      titleEn: 'Help',
      descriptionAr: 'وصف',
      descriptionEn: 'Description',
      sortOrder: 3,
      isActive: true,
    });

    expect(prisma.helpCategory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: 'help-center',
          titleAr: 'مساعدة',
          titleEn: 'Help',
        }),
      }),
    );
  });

  it('updates categories and keeps list shape', async () => {
    (prisma.helpCategory.findUnique as jest.Mock).mockResolvedValue({
      id: 'cat_1',
    });
    (prisma.helpCategory.findMany as jest.Mock).mockResolvedValue([
      categories[0],
    ]);

    await service.updateCategory('cat_1', {
      slug: 'account-and-sign-in',
      titleAr: 'الحساب والدخول',
      titleEn: 'Account and sign-in',
      descriptionAr: null,
      descriptionEn: null,
      sortOrder: 1,
      isActive: true,
    });

    expect(prisma.helpCategory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cat_1' },
      }),
    );
  });

  it('deletes categories and returns refreshed list', async () => {
    (prisma.helpCategory.findUnique as jest.Mock).mockResolvedValue({
      id: 'cat_1',
    });
    (prisma.helpCategory.findMany as jest.Mock).mockResolvedValue([
      categories[0],
    ]);

    await service.deleteCategory('cat_1');

    expect(prisma.helpCategory.delete).toHaveBeenCalledWith({
      where: { id: 'cat_1' },
    });
  });

  it('reorders categories with batch updates', async () => {
    (prisma.helpCategory.findMany as jest.Mock).mockResolvedValue(categories);

    await service.reorderCategories({
      items: [
        { id: 'cat_2', sortOrder: 1 },
        { id: 'cat_1', sortOrder: 2 },
      ],
    });

    expect(prisma.helpCategory.update).toHaveBeenCalledTimes(2);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('creates questions with optional category lookup', async () => {
    (prisma.helpCategory.findUnique as jest.Mock).mockResolvedValue({
      id: 'cat_1',
    });
    (prisma.helpQuestion.findMany as jest.Mock).mockResolvedValue([
      questions[0],
    ]);

    await service.createQuestion({
      categoryId: 'cat_1',
      questionAr: 'سؤال',
      questionEn: 'Question',
      answerAr: 'إجابة',
      answerEn: 'Answer',
      sortOrder: 4,
      isActive: true,
    });

    expect(prisma.helpQuestion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          categoryId: 'cat_1',
          questionAr: 'سؤال',
          questionEn: 'Question',
        }),
      }),
    );
  });

  it('updates questions and keeps categories optional', async () => {
    (prisma.helpQuestion.findUnique as jest.Mock).mockResolvedValue({
      id: 'q_1',
    });
    (prisma.helpCategory.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.helpQuestion.findMany as jest.Mock).mockResolvedValue([
      questions[0],
    ]);

    await service.updateQuestion('q_1', {
      categoryId: null,
      questionAr: 'سؤال محدث',
      questionEn: 'Updated question',
      answerAr: 'إجابة محدثة',
      answerEn: 'Updated answer',
      sortOrder: 3,
      isActive: false,
    });

    expect(prisma.helpQuestion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'q_1' },
        data: expect.objectContaining({
          categoryId: null,
          questionAr: 'سؤال محدث',
          isActive: false,
        }),
      }),
    );
  });

  it('reorders questions with batch updates', async () => {
    (prisma.helpQuestion.findMany as jest.Mock).mockResolvedValue(questions);

    await service.reorderQuestions({
      items: [
        { id: 'q_2', sortOrder: 1 },
        { id: 'q_1', sortOrder: 2 },
      ],
    });

    expect(prisma.helpQuestion.update).toHaveBeenCalledTimes(2);
  });

  it('returns only active ordered items publicly', async () => {
    (prisma.helpCategory.findMany as jest.Mock).mockResolvedValue([
      categories[0],
    ]);
    (prisma.helpQuestion.findMany as jest.Mock).mockResolvedValue(questions);

    const result = await service.getPublicHelp();

    expect(result.categories).toEqual([
      expect.objectContaining({ id: 'cat_1' }),
    ]);
    expect(result.questions).toEqual([
      expect.objectContaining({ id: 'q_1' }),
      expect.objectContaining({ id: 'q_2' }),
    ]);
  });

  it('searches across Arabic and English text', async () => {
    (prisma.helpCategory.findMany as jest.Mock)
      .mockResolvedValueOnce([categories[0]])
      .mockResolvedValueOnce([categories[0]]);
    (prisma.helpQuestion.findMany as jest.Mock).mockResolvedValue([
      questions[0],
    ]);

    const result = await service.searchPublicHelp('account');

    expect(prisma.helpCategory.findMany).toHaveBeenCalled();
    expect(prisma.helpQuestion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                { questionEn: { contains: 'account', mode: 'insensitive' } },
              ]),
            }),
          ]),
        }),
      }),
    );
    expect(result.questions).toEqual([expect.objectContaining({ id: 'q_1' })]);
  });

  it('maps duplicate category slug conflicts', async () => {
    (prisma.helpCategory.create as jest.Mock).mockRejectedValue({
      code: 'P2002',
    });

    await expect(
      service.createCategory({
        slug: 'account-and-sign-in',
        titleAr: 'الحساب والدخول',
        titleEn: 'Account and sign-in',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws not found when deleting unknown question', async () => {
    (prisma.helpQuestion.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.deleteQuestion('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

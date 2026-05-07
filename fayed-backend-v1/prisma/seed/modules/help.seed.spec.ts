import { PrismaClient } from '@prisma/client';
import { helpSeedModule } from './help.seed';

type HelpCategoryRecord = {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type HelpQuestionRecord = {
  id: string;
  categoryId: string;
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function createMockPrisma() {
  const categories = new Map<string, HelpCategoryRecord>();
  const questions = new Map<string, HelpQuestionRecord[]>();
  let categorySeq = 0;
  let questionSeq = 0;

  const prisma = {
    helpCategory: {
      findUnique: jest.fn(async ({ where }: { where: { slug: string } }) => {
        const category = Array.from(categories.values()).find((item) => item.slug === where.slug);
        if (!category) return null;
        return {
          ...category,
          questions: questions.get(category.id) ?? [],
        };
      }),
      create: jest.fn(async ({ data }: { data: Omit<HelpCategoryRecord, 'id' | 'createdAt' | 'updatedAt'> }) => {
        categorySeq += 1;
        const record: HelpCategoryRecord = {
          id: `category_${categorySeq}`,
          ...data,
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
          updatedAt: new Date('2026-05-01T00:00:00.000Z'),
        };
        categories.set(record.id, record);
        questions.set(record.id, []);
        return record;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Partial<HelpCategoryRecord> }) => {
        const record = categories.get(where.id);
        if (!record) throw new Error('Missing category');
        const next = { ...record, ...data, updatedAt: new Date('2026-05-02T00:00:00.000Z') };
        categories.set(where.id, next);
        return next;
      }),
      findMany: jest.fn(async () => Array.from(categories.values()).sort((a, b) => a.sortOrder - b.sortOrder)),
    },
    helpQuestion: {
      createMany: jest.fn(async ({ data }: { data: Array<Omit<HelpQuestionRecord, 'id' | 'createdAt' | 'updatedAt'>> }) => {
        for (const item of data) {
          questionSeq += 1;
          const record: HelpQuestionRecord = {
            id: `question_${questionSeq}`,
            ...item,
            createdAt: new Date('2026-05-01T00:00:00.000Z'),
            updatedAt: new Date('2026-05-01T00:00:00.000Z'),
          };
          const existing = questions.get(item.categoryId) ?? [];
          existing.push(record);
          questions.set(item.categoryId, existing);
        }
      }),
    },
  } as unknown as PrismaClient;

  return { prisma, categories, questions };
}

describe('helpSeedModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates bilingual seed data and stays idempotent', async () => {
    const { prisma, categories, questions } = createMockPrisma();

    await helpSeedModule.run(prisma);
    const firstCategoryCount = categories.size;
    const firstQuestionCount = Array.from(questions.values()).reduce((total, items) => total + items.length, 0);

    await helpSeedModule.run(prisma);
    const secondCategoryCount = categories.size;
    const secondQuestionCount = Array.from(questions.values()).reduce((total, items) => total + items.length, 0);

    expect(firstCategoryCount).toBe(5);
    expect(firstQuestionCount).toBe(10);
    expect(secondCategoryCount).toBe(5);
    expect(secondQuestionCount).toBe(10);

    const session = Array.from(categories.values()).find((category) => category.slug === 'account-and-sign-in');
    expect(session?.titleAr).toBe('الحساب والدخول');
    expect(session?.titleEn).toBe('Account and sign-in');

    const paymentQuestions = questions.get(session!.id) ?? [];
    expect(paymentQuestions[0]?.questionAr).toContain('كيف');
    expect(paymentQuestions[0]?.questionEn).toContain('How');
  });

  it('does not overwrite admin-edited categories', async () => {
    const { prisma, categories, questions } = createMockPrisma();
    categories.set('category_custom', {
      id: 'category_custom',
      slug: 'payments-and-refunds',
      titleAr: 'عنوان مخصص',
      titleEn: 'Custom title',
      descriptionAr: 'وصف مخصص',
      descriptionEn: 'Custom description',
      sortOrder: 99,
      isActive: false,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    });
    questions.set('category_custom', [
      {
        id: 'question_custom',
        categoryId: 'category_custom',
        questionAr: 'سؤال مخصص',
        questionEn: 'Custom question',
        answerAr: 'إجابة مخصصة',
        answerEn: 'Custom answer',
        sortOrder: 1,
        isActive: true,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      },
    ]);

    await helpSeedModule.run(prisma);

    const editedCategory = Array.from(categories.values()).find((category) => category.slug === 'payments-and-refunds');
    expect(editedCategory?.titleAr).toBe('عنوان مخصص');
    expect((prisma.helpCategory.update as jest.Mock).mock.calls).toHaveLength(0);
    expect((prisma.helpQuestion.createMany as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    expect(questions.get('category_custom')).toHaveLength(1);
  });
});

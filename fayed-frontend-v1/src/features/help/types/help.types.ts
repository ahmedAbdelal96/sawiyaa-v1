export type HelpCategory = {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HelpQuestion = {
  id: string;
  categoryId: string | null;
  categorySlug: string | null;
  categoryTitleAr: string | null;
  categoryTitleEn: string | null;
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HelpCategoriesResponseData = {
  items: HelpCategory[];
};

export type HelpQuestionsResponseData = {
  items: HelpQuestion[];
};

export type PublicHelpResponseData = {
  categories: HelpCategory[];
  questions: HelpQuestion[];
};

export type UpsertHelpCategoryInput = {
  slug: string;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpsertHelpQuestionInput = {
  categoryId?: string | null;
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type ReorderHelpCategoriesInput = {
  items: Array<{ id: string; sortOrder: number }>;
};

export type ReorderHelpQuestionsInput = {
  items: Array<{ id: string; sortOrder: number }>;
};

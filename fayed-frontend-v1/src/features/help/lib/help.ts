import type { HelpCategory, HelpQuestion } from "../types/help.types";

export function normalizeHelpSlug(value: string) {
  return value.trim().toLowerCase();
}

export function buildHelpSlug(value: string) {
  return normalizeHelpSlug(
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9\u0600-\u06ff]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, ""),
  );
}

export function formatHelpDate(value: string | null, locale: string) {
  if (!value) return "-";

  const date = new Date(value);
  const localeCode = locale.startsWith("ar") ? "ar-SA" : "en-US";
  return date.toLocaleDateString(localeCode, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getHelpCategoryTitle(category: HelpCategory, locale: string) {
  return locale.startsWith("ar")
    ? category.titleAr || category.titleEn
    : category.titleEn || category.titleAr;
}

export function getHelpQuestionTitle(question: HelpQuestion, locale: string) {
  return locale.startsWith("ar")
    ? question.questionAr || question.questionEn
    : question.questionEn || question.questionAr;
}

export function getHelpQuestionBody(question: HelpQuestion, locale: string) {
  return locale.startsWith("ar")
    ? question.answerAr || question.answerEn
    : question.answerEn || question.answerAr;
}

export function getLocalizedHelpCategoryTitle(category: HelpCategory, locale: string) {
  return locale.startsWith("ar") ? category.titleAr : category.titleEn;
}

export function getLocalizedHelpCategoryDescription(category: HelpCategory, locale: string) {
  return locale.startsWith("ar") ? category.descriptionAr : category.descriptionEn;
}

export function getLocalizedHelpQuestionTitle(question: HelpQuestion, locale: string) {
  return locale.startsWith("ar") ? question.questionAr : question.questionEn;
}

export function getLocalizedHelpQuestionBody(question: HelpQuestion, locale: string) {
  return locale.startsWith("ar") ? question.answerAr : question.answerEn;
}

export function normalizeHelpSearchText(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

export function countQuestionsByCategory(
  questions: HelpQuestion[],
  categoryId: string,
) {
  return questions.filter((question) => question.categoryId === categoryId).length;
}

export function sortByHelpOrder<T extends { sortOrder: number; createdAt: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }
    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  });
}

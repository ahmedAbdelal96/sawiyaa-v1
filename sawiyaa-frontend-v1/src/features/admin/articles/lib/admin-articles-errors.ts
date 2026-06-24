import { toAppError } from "@/lib/api/errors";

const ERROR_KEYS: Record<string, string> = {
  ARTICLE_NOT_FOUND: "errors.articleNotFound",
  ARTICLE_CATEGORY_NOT_FOUND: "errors.categoryNotFound",
  ARTICLE_SLUG_ALREADY_EXISTS: "errors.slugExists",
  ARTICLE_LOCALE_REQUIRED_FOR_TRANSLATION_UPDATE: "errors.localeRequired",
  ARTICLE_INVALID_PUBLISH_TRANSITION: "errors.invalidPublishTransition",
  ARTICLE_INVALID_ARCHIVE_TRANSITION: "errors.invalidArchiveTransition",
};

export function getAdminArticleErrorKey(error: unknown): string {
  const appError = toAppError(error);
  if (appError.code && ERROR_KEYS[appError.code]) {
    return ERROR_KEYS[appError.code];
  }

  if (appError.statusCode === 404) {
    return ERROR_KEYS.ARTICLE_NOT_FOUND;
  }

  return "errors.generic";
}

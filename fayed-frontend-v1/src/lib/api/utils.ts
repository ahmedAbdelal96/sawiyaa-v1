/**
 * API Utilities
 * أدوات مساعدة للتعامل مع الـ API
 */

import type { ApiError, PaginatedResponse } from "./types";

// Meta type extracted from PaginatedResponse
type PaginationMeta = PaginatedResponse<unknown>["meta"];

// ==================== Error Handling ====================

/**
 * استخراج رسالة الخطأ من أي نوع من الأخطاء
 */
export function getErrorMessage(error: unknown): string {
  // ApiError من الـ backend
  if (isApiError(error)) {
    return error.message;
  }

  // Error عادي
  if (error instanceof Error) {
    return error.message;
  }

  // Object مع message
  if (typeof error === "object" && error !== null) {
    const err = error as { message?: string; error?: string };
    if (err.message) return err.message;
    if (err.error) return err.error;
  }

  return "حدث خطأ غير متوقع";
}

/**
 * التحقق من أن الخطأ هو ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    "message" in error
  );
}

/**
 * التحقق من خطأ المصادقة (401)
 */
export function isAuthenticationError(error: unknown): boolean {
  if (isApiError(error)) {
    return error.statusCode === 401;
  }
  if (typeof error === "object" && error !== null) {
    const err = error as { status?: number; statusCode?: number };
    return err.status === 401 || err.statusCode === 401;
  }
  return false;
}

/**
 * التحقق من خطأ الصلاحيات (403)
 */
export function isAuthorizationError(error: unknown): boolean {
  if (isApiError(error)) {
    return error.statusCode === 403;
  }
  if (typeof error === "object" && error !== null) {
    const err = error as { status?: number; statusCode?: number };
    return err.status === 403 || err.statusCode === 403;
  }
  return false;
}

/**
 * التحقق من خطأ غير موجود (404)
 */
export function isNotFoundError(error: unknown): boolean {
  if (isApiError(error)) {
    return error.statusCode === 404;
  }
  if (typeof error === "object" && error !== null) {
    const err = error as { status?: number; statusCode?: number };
    return err.status === 404 || err.statusCode === 404;
  }
  return false;
}

/**
 * التحقق من خطأ التحقق (422)
 */
export function isValidationError(error: unknown): boolean {
  if (isApiError(error)) {
    return error.statusCode === 422 || error.statusCode === 400;
  }
  if (typeof error === "object" && error !== null) {
    const err = error as { status?: number; statusCode?: number };
    return err.status === 422 || err.status === 400 || err.statusCode === 422 || err.statusCode === 400;
  }
  return false;
}

/**
 * التحقق من خطأ الشبكة
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message === "Network Error" || error.message.includes("network");
  }
  return false;
}

/**
 * استخراج أخطاء الحقول من خطأ التحقق
 */
export function getValidationErrors(error: unknown): Record<string, string[]> {
  if (isApiError(error) && error.details) {
    // If details contains validation errors as an object
    if (typeof error.details === "object") {
      const result: Record<string, string[]> = {};
      for (const [key, value] of Object.entries(error.details)) {
        if (Array.isArray(value)) {
          result[key] = value.map(String);
        } else if (typeof value === "string") {
          result[key] = [value];
        }
      }
      return result;
    }
  }
  return {};
}

// ==================== Pagination Utilities ====================

/**
 * حساب عدد الصفحات
 */
export function calculateTotalPages(total: number, limit: number): number {
  return Math.ceil(total / limit);
}

/**
 * التحقق من وجود صفحة تالية
 */
export function hasNextPage(meta: PaginationMeta): boolean {
  return meta.page < meta.totalPages;
}

/**
 * التحقق من وجود صفحة سابقة
 */
export function hasPreviousPage(meta: PaginationMeta): boolean {
  return meta.page > 1;
}

/**
 * جلب أرقام الصفحات للعرض
 */
export function getPageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 5
): (number | "...")[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [];
  const halfVisible = Math.floor(maxVisible / 2);

  // دائماً نعرض الصفحة الأولى
  pages.push(1);

  // حساب النطاق
  let start = Math.max(2, currentPage - halfVisible);
  let end = Math.min(totalPages - 1, currentPage + halfVisible);

  // تعديل النطاق إذا كان قريب من البداية أو النهاية
  if (currentPage <= halfVisible + 1) {
    end = Math.min(maxVisible - 1, totalPages - 1);
  } else if (currentPage >= totalPages - halfVisible) {
    start = Math.max(2, totalPages - maxVisible + 2);
  }

  // إضافة ... قبل النطاق إذا لزم الأمر
  if (start > 2) {
    pages.push("...");
  }

  // إضافة الصفحات في النطاق
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  // إضافة ... بعد النطاق إذا لزم الأمر
  if (end < totalPages - 1) {
    pages.push("...");
  }

  // دائماً نعرض الصفحة الأخيرة (إذا كان هناك أكثر من صفحة)
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

/**
 * تحويل الـ infinite query data إلى array مسطحة
 */
export function flattenInfiniteData<T>(
  data: { pages: PaginatedResponse<T>[] } | undefined
): T[] {
  if (!data?.pages) return [];
  return data.pages.flatMap((page) => page.data);
}

/**
 * جلب الـ meta من آخر صفحة في الـ infinite query
 */
export function getInfiniteDataMeta(
  data: { pages: PaginatedResponse<unknown>[] } | undefined
): PaginationMeta | null {
  if (!data?.pages?.length) return null;
  return data.pages[data.pages.length - 1].meta;
}

// ==================== Data Transformation ====================

/**
 * تحويل التاريخ للعرض
 */
export function formatDate(date: string | Date, locale: string = "ar-SA"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * تحويل الوقت للعرض
 */
export function formatTime(date: string | Date, locale: string = "ar-SA"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * تحويل التاريخ والوقت للعرض
 */
export function formatDateTime(date: string | Date, locale: string = "ar-SA"): string {
  return `${formatDate(date, locale)} ${formatTime(date, locale)}`;
}

/**
 * تحويل المبلغ للعرض
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale: string = "ar-SA"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * تحويل النسبة المئوية للعرض
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * تحويل المدة للعرض (بالدقائق)
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} دقيقة`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} ساعة`;
  }
  return `${hours} ساعة و ${remainingMinutes} دقيقة`;
}

// ==================== Query String Utilities ====================

/**
 * تحويل الـ filters إلى query string
 */
export function buildQueryString(
  params: Record<string, unknown>,
  options?: { skipEmpty?: boolean }
): string {
  const { skipEmpty = true } = options ?? {};
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (skipEmpty && value === "") return;

    if (Array.isArray(value)) {
      value.forEach((v) => searchParams.append(key, String(v)));
    } else {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

/**
 * تحليل الـ query string إلى object
 */
export function parseQueryString<T extends Record<string, unknown>>(
  queryString: string
): Partial<T> {
  const params = new URLSearchParams(queryString.replace(/^\?/, ""));
  const result: Record<string, unknown> = {};

  params.forEach((value, key) => {
    if (result[key]) {
      // تحويل إلى array إذا كان هناك قيم متعددة
      if (Array.isArray(result[key])) {
        (result[key] as string[]).push(value);
      } else {
        result[key] = [result[key] as string, value];
      }
    } else {
      result[key] = value;
    }
  });

  return result as Partial<T>;
}

// ==================== Debounce & Throttle ====================

/**
 * Debounce function للبحث
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

/**
 * Throttle function للأحداث المتكررة
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

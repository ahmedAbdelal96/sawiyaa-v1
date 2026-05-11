import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes
 * دمج كلاسات Tailwind بشكل صحيح
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in Arabic
 * تنسيق العملة بالعربي
 */
export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

/**
 * Format date in Arabic
 * تنسيق التاريخ بالعربي
 */
export function formatDate(date: Date | string, format: "short" | "long" = "short"): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  if (format === "long") {
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(dateObj);
  }
  
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dateObj);
}

/**
 * Format time in Arabic
 * تنسيق الوقت بالعربي
 */
export function formatTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  return new Intl.DateTimeFormat("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateObj);
}

/**
 * Sleep function for async delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

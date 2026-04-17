import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";

const CHART_SKELETON_BAR_HEIGHTS = ["58%", "72%", "64%", "85%", "69%", "92%", "76%"] as const;

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const t = useTranslations("common.loading");
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
    xl: "h-16 w-16 border-4",
  };

  return (
    <div
      className={cn("animate-spin rounded-full border-primary border-t-transparent", sizeClasses[size], className)}
      role="status"
      aria-label={t("label")}
    >
      <span className="sr-only">{t("message")}</span>
    </div>
  );
}

interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message }: PageLoaderProps) {
  const t = useTranslations("common.loading");
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center">
      <LoadingSpinner size="xl" />
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{message || t("message")}</p>
    </div>
  );
}

export function FullPageLoader({ message }: PageLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
      <div className="flex flex-col items-center">
        <LoadingSpinner size="xl" />
        {message && <p className="mt-4 text-sm font-medium text-gray-900 dark:text-white">{message}</p>}
      </div>
    </div>
  );
}

interface ButtonLoadingProps {
  isLoading?: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
  disabled?: boolean;
  [key: string]: any;
}

export function ButtonLoading({ isLoading, children, loadingText, className, disabled, ...props }: ButtonLoadingProps) {
  return (
    <button
      disabled={isLoading || disabled}
      className={cn("inline-flex items-center justify-center gap-2", isLoading && "opacity-70 cursor-not-allowed", className)}
      {...props}
    >
      {isLoading && <LoadingSpinner size="sm" />}
      {isLoading && loadingText ? loadingText : children}
    </button>
  );
}

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  style?: CSSProperties;
}

export function Skeleton({ className, variant = "rectangular", style }: SkeletonProps) {
  const variantClasses = {
    text: "h-4 w-full rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  };

  return (
    <div
      className={cn("animate-pulse bg-gray-200 dark:bg-gray-700", variantClasses[variant], className)}
      style={style}
      aria-hidden="true"
    />
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
      <Skeleton className="mb-4 h-6 w-3/4" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="mb-2 h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
    </div>
  );
}

interface ListSkeletonProps {
  items?: number;
}

export function ListSkeleton({ items = 5 }: ListSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton variant="circular" className="h-12 w-12" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
      <Skeleton className="h-11 w-32" />
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton variant="circular" className="h-12 w-12" />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
      <Skeleton className="mb-6 h-6 w-48" />
      <div className="flex h-64 items-end gap-2">
        {CHART_SKELETON_BAR_HEIGHTS.map((height, index) => (
          <Skeleton key={index} className="flex-1" style={{ height }} />
        ))}
      </div>
    </div>
  );
}

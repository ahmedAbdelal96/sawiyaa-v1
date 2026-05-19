/**
 * DataTable Pagination Component
 *
 * Reusable pagination controls for the DataTable.
 * Supports RTL/LTR, page info, and navigation.
 */

'use client';

import Pagination from "@/components/tables/Pagination";
import { useLocale } from "next-intl";
import type { PaginationConfig } from "./types";

interface DataTablePaginationProps {
  pagination: PaginationConfig;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export function DataTablePagination({
  pagination,
  onPageChange,
  loading = false,
}: DataTablePaginationProps) {
  const locale = useLocale();
  const { page, totalPages } = pagination;
  if (totalPages <= 1) return null;

  const total = pagination.totalItems ?? pagination.total ?? 0;
  const start = total === 0 ? 0 : (page - 1) * pagination.limit + 1;
  const end = total === 0 ? 0 : Math.min(page * pagination.limit, total);
  const summary = locale === "ar"
    ? `عرض ${start} إلى ${end} من ${total}`
    : `Showing ${start} to ${end} of ${total}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-light px-4 py-4 sm:px-6">
      <p className="text-sm text-text-secondary">{summary}</p>
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(nextPage) => {
          if (loading) return;
          if (nextPage < 1 || nextPage > totalPages) return;
          onPageChange(nextPage);
        }}
      />
    </div>
  );
}

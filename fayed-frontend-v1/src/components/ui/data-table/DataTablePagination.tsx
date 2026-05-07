/**
 * DataTable Pagination Component
 *
 * Reusable pagination controls for the DataTable.
 * Supports RTL/LTR, page info, and navigation.
 */

'use client';

import Pagination from "@/components/tables/Pagination";
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
  const { page, totalPages } = pagination;
  if (totalPages <= 1) return null;

  return (
    <div className="border-t border-border-light px-4 py-4 sm:px-6">
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
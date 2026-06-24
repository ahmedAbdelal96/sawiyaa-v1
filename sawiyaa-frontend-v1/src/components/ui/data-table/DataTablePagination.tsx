import { useTranslations } from "next-intl";
import type { PaginationConfig } from "./types";
import { getPaginationPages } from "./utils";

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
  const t = useTranslations("common");
  const { page, totalPages } = pagination;
  if (totalPages <= 1) return null;

  const total = pagination.totalItems ?? pagination.total ?? 0;
  const start = total === 0 ? 0 : (page - 1) * pagination.limit + 1;
  const end = total === 0 ? 0 : Math.min(page * pagination.limit, total);
  
  const summary = t("dataTable.showing", { start, end, total });
  const nextLabel = t("dataTable.next");
  const prevLabel = t("dataTable.previous");

  const pages = getPaginationPages(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-light/80 px-4 py-3 sm:px-6">
      <p className="text-[13px] font-semibold text-text-secondary">{summary}</p>
      
      <div className="flex flex-wrap items-center gap-1.5" role="navigation" aria-label="Pagination">
        <button
          onClick={() => !loading && page > 1 && onPageChange(page - 1)}
          disabled={loading || page === 1}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-border-light bg-surface-secondary px-3 text-xs font-semibold text-text-secondary shadow-theme-xs transition hover:bg-surface-tertiary hover:text-text-primary disabled:bg-surface-tertiary/60 disabled:text-text-muted disabled:border-border-light disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {prevLabel}
        </button>
        
        <div className="flex items-center gap-1">
          {pages.map((item, index) => {
            if (item === '...') {
              return (
                <span key={`dots-${index}`} className="px-1.5 text-xs text-text-muted">
                  ...
                </span>
              );
            }
            
            const isCurrent = item === page;
            return (
              <button
                key={item}
                onClick={() => !loading && onPageChange(item as number)}
                disabled={loading}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-xs font-semibold transition ${
                  isCurrent
                    ? "bg-primary text-white border border-primary shadow-theme-sm"
                    : "text-text-secondary hover:bg-surface-tertiary hover:text-text-primary"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => !loading && page < totalPages && onPageChange(page + 1)}
          disabled={loading || page === totalPages}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-border-light bg-surface-secondary px-3 text-xs font-semibold text-text-secondary shadow-theme-xs transition hover:bg-surface-tertiary hover:text-text-primary disabled:bg-surface-tertiary/60 disabled:text-text-muted disabled:border-border-light disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}

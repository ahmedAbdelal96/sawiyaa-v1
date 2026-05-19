type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const pagesAroundCurrent = Array.from(
    { length: Math.min(3, totalPages) },
    (_, i) => i + Math.max(currentPage - 1, 1)
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="inline-flex h-10 items-center justify-center rounded-2xl border border-border-light bg-white px-3.5 py-2.5 text-sm text-text-primary shadow-theme-xs transition hover:border-primary/25 hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50 dark:border-border-light dark:bg-surface-secondary dark:hover:bg-surface-tertiary"
      >
        Previous
      </button>
      <div className="flex items-center gap-2">
        {currentPage > 3 && <span className="px-2">...</span>}
        {pagesAroundCurrent.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-4 py-2 rounded ${
              currentPage === page
                ? "bg-primary text-white shadow-[0_12px_24px_-18px_rgba(68,161,148,0.38)]"
                : "text-text-secondary dark:text-text-secondary"
            } inline-flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-medium transition hover:bg-primary-light hover:text-text-brand`}
          >
            {page}
          </button>
        ))}
        {currentPage < totalPages - 2 && <span className="px-2">...</span>}
      </div>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="inline-flex h-10 items-center justify-center rounded-2xl border border-border-light bg-white px-3.5 py-2.5 text-sm text-text-primary shadow-theme-xs transition hover:border-primary/25 hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50 dark:border-border-light dark:bg-surface-secondary dark:hover:bg-surface-tertiary"
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;

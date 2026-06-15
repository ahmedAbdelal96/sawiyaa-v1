type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  prevLabel?: string;
  nextLabel?: string;
};

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  prevLabel,
  nextLabel,
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
        className="inline-flex h-10 items-center justify-center rounded-2xl border border-border-light bg-surface-secondary px-3.5 py-2.5 text-sm text-text-secondary shadow-theme-xs transition hover:bg-surface-tertiary hover:text-text-primary disabled:bg-surface-tertiary/60 disabled:text-text-muted disabled:border-border-light disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {prevLabel || "Previous"}
      </button>
      <div className="flex items-center gap-2">
        {currentPage > 3 && <span className="px-2">...</span>}
        {pagesAroundCurrent.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-4 py-2 rounded ${
              currentPage === page
                ? "bg-primary text-white border border-primary"
                : "text-text-secondary hover:bg-surface-tertiary hover:text-text-primary"
            } inline-flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-medium transition`}
          >
            {page}
          </button>
        ))}
        {currentPage < totalPages - 2 && <span className="px-2">...</span>}
      </div>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="inline-flex h-10 items-center justify-center rounded-2xl border border-border-light bg-surface-secondary px-3.5 py-2.5 text-sm text-text-secondary shadow-theme-xs transition hover:bg-surface-tertiary hover:text-text-primary disabled:bg-surface-tertiary/60 disabled:text-text-muted disabled:border-border-light disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {nextLabel || "Next"}
      </button>
    </div>
  );
};

export default Pagination;

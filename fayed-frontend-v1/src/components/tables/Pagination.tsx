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
    <div className="flex items-center ">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="mr-2.5 flex h-10 items-center justify-center rounded-lg border border-border-light bg-surface-secondary px-3.5 py-2.5 text-sm text-text-primary shadow-theme-xs hover:bg-primary-light disabled:opacity-50 dark:border-border-light dark:bg-surface-secondary dark:text-text-primary dark:hover:bg-surface-tertiary"
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
                ? "bg-primary text-white"
                : "text-text-secondary dark:text-text-secondary"
            } flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium hover:bg-primary-light hover:text-text-brand`}
          >
            {page}
          </button>
        ))}
        {currentPage < totalPages - 2 && <span className="px-2">...</span>}
      </div>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="ml-2.5 flex h-10 items-center justify-center rounded-lg border border-border-light bg-surface-secondary px-3.5 py-2.5 text-sm text-text-primary shadow-theme-xs hover:bg-primary-light disabled:opacity-50 dark:border-border-light dark:bg-surface-secondary dark:text-text-primary dark:hover:bg-surface-tertiary"
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
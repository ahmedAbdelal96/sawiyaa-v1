import type { ReactNode } from "react";
import { EmptyState } from "./EmptyStates";
import { PageLoader } from "./LoadingStates";

type QueryStateProps = {
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  loadingMessage?: string;
  children: ReactNode;
};

/**
 * Shared async state renderer for list/detail pages.
 * This keeps loading/error/empty UX consistent across modules.
 */
export function QueryState({
  isLoading,
  isError,
  errorMessage,
  isEmpty,
  emptyTitle = "لا توجد بيانات",
  emptyDescription,
  emptyAction,
  loadingMessage,
  children,
}: QueryStateProps) {
  if (isLoading) {
    return <PageLoader message={loadingMessage} />;
  }

  if (isError) {
    return (
      <EmptyState
        title="تعذر تحميل البيانات"
        description={errorMessage || "حدث خطأ أثناء جلب البيانات. حاول مرة أخرى."}
      />
    );
  }

  if (isEmpty) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return <>{children}</>;
}

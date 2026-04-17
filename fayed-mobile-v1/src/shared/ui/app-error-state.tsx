import { useTranslation } from "react-i18next";

import { AppEmptyState } from "@/shared/ui/app-empty-state";

type AppErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function AppErrorState({ title, description, onRetry }: AppErrorStateProps) {
  const { t } = useTranslation();

  return (
    <AppEmptyState
      title={title || t("errorTitle")}
      description={description || t("errorDescription")}
      actionLabel={onRetry ? t("retry") : undefined}
      onActionPress={onRetry}
    />
  );
}

import type { ReactNode } from "react";

import { useAuthBootstrap } from "@/auth/hooks/use-auth-bootstrap";
import { i18n } from "@/core/i18n";
import { AppLoader } from "@/shared/ui";
import { AppScreen } from "@/shared/ui/app-screen";

type AppBootstrapProps = {
  children: ReactNode;
};

export function AppBootstrap({ children }: AppBootstrapProps) {
  const ready = useAuthBootstrap();
  const loadingLabel = i18n.isInitialized ? i18n.t("loading") : "Loading...";

  if (!ready) {
    return (
      <AppScreen>
        <AppLoader label={loadingLabel} />
      </AppScreen>
    );
  }

  return <>{children}</>;
}

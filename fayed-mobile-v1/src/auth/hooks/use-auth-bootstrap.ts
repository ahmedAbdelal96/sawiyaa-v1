import { useEffect, useState } from "react";

import { authSessionService } from "@/auth/application/auth-session.service";
import { initializeI18n } from "@/core/i18n";
import { logger } from "@/core/logger";

export function useAuthBootstrap() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        await initializeI18n();
        await authSessionService.bootstrap();
      } catch (error) {
        logger.error("App bootstrap failed", error);
      } finally {
        if (mounted) {
          setReady(true);
        }
      }
    }

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  return ready;
}


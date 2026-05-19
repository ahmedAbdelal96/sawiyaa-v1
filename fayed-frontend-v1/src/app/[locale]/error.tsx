"use client";

import { useEffect } from "react";
import AppErrorFallback from "@/components/shared/AppErrorFallback";

export default function LocaleErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[app] route error boundary:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
  }, [error]);

  return <AppErrorFallback error={error} reset={reset} />;
}

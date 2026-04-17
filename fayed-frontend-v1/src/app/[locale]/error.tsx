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
    console.error("[app] route error boundary:", error);
  }, [error]);

  return <AppErrorFallback error={error} reset={reset} />;
}

"use client";

import { useEffect } from "react";
import AppErrorFallback from "@/components/shared/AppErrorFallback";

export default function PractitionersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[practitioners] unhandled error:", error);
  }, [error]);

  return <AppErrorFallback error={error} reset={reset} homeHref="/practitioners" />;
}

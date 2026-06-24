"use client";

import type { ReactNode } from "react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type FullHeightMessagesPageProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  height?: string;
};

// Shared layout helper for full-page chat screens.
// Ensures the page itself doesn't scroll; only the thread area scrolls internally.
export default function FullHeightMessagesPage({
  children,
  className,
  style,
  height,
}: FullHeightMessagesPageProps) {
  return (
    <div
      className={cn("h-[calc(100dvh-6rem)] min-h-0 overflow-hidden", className)}
      style={height ? { ...style, height } : style}
    >
      {children}
    </div>
  );
}

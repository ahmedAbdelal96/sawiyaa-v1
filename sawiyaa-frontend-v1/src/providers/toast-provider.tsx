"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      dir="rtl"
      toastOptions={{
        style: {
          fontFamily: "Cairo, sans-serif",
        },
        classNames: {
          toast: "rtl",
          title: "font-semibold",
          description: "text-sm",
        },
      }}
      richColors
      closeButton
    />
  );
}

export { toast } from "sonner";

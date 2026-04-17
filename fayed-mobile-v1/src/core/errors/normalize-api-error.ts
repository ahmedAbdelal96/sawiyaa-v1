import axios from "axios";

import { AppError } from "@/core/errors/app-error";

type EnvelopeMessage = {
  message?: string;
  error?: string;
};

export function normalizeApiError(error: unknown): AppError {
  if (!axios.isAxiosError(error)) {
    return new AppError("UNKNOWN_ERROR", "حدث خطأ غير متوقع.");
  }

  if (!error.response) {
    return new AppError("NETWORK_ERROR", "تعذر الوصول إلى الخادم. حاول مرة أخرى.");
  }

  const status = error.response.status;
  const payload = error.response.data as EnvelopeMessage | undefined;
  const message =
    payload?.message || payload?.error || "حدث خطأ أثناء تنفيذ الطلب. حاول مرة أخرى.";

  if (status === 401) {
    return new AppError("UNAUTHORIZED", message, status, error.response.data);
  }

  if (status === 403) {
    return new AppError("FORBIDDEN", message, status, error.response.data);
  }

  if (status === 400 || status === 422) {
    return new AppError("VALIDATION_ERROR", message, status, error.response.data);
  }

  if (status >= 500) {
    return new AppError("SERVER_ERROR", message, status, error.response.data);
  }

  return new AppError("UNKNOWN_ERROR", message, status, error.response.data);
}


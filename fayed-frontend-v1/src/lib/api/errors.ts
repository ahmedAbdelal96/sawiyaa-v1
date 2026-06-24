import { AxiosError } from "axios";

export type AppErrorType =
  | "SERVICE_UNAVAILABLE"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "UNKNOWN_SERVER_ERROR";

type ErrorShape = {
  message?: string | string[];
  error?: string;
  errorCode?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
};

type AppErrorContext = {
  requestPath?: string;
  diagnostics?: Record<string, unknown>;
  referenceId?: string;
};

function createReferenceId(): string {
  return `ERR-${Date.now().toString(36).toUpperCase()}`;
}

function normalizeMessage(message: string | string[] | undefined, fallback: string): string {
  if (Array.isArray(message)) {
    return message.join(", ");
  }

  return message?.trim() || fallback;
}

function resolveErrorType(params: {
  statusCode?: number;
  axiosCode?: string;
  message?: string;
  hasResponse: boolean;
}): AppErrorType {
  const { statusCode, axiosCode, message, hasResponse } = params;
  const normalizedMessage = message?.toLowerCase() ?? "";

  if (statusCode === 401) return "UNAUTHORIZED";
  if (statusCode === 403) return "FORBIDDEN";
  if (statusCode === 404) return "NOT_FOUND";

  if (
    axiosCode === "ECONNABORTED" ||
    normalizedMessage.includes("timeout") ||
    statusCode === 408
  ) {
    return "TIMEOUT";
  }

  if (!hasResponse && axiosCode === "ECONNREFUSED") {
    return "SERVICE_UNAVAILABLE";
  }

  if (!hasResponse && (axiosCode === "ERR_NETWORK" || axiosCode === "ENOTFOUND")) {
    return "NETWORK_ERROR";
  }

  if (typeof statusCode === "number" && statusCode >= 500) {
    return "SERVICE_UNAVAILABLE";
  }

  if (!hasResponse) {
    return "NETWORK_ERROR";
  }

  return "UNKNOWN_SERVER_ERROR";
}

export class AppError extends Error {
  statusCode: number;
  status: number;
  code?: string;
  details?: Record<string, unknown>;
  diagnostics?: Record<string, unknown>;
  errorType: AppErrorType;
  requestPath?: string;
  referenceId: string;
  isOperational: boolean;

  constructor(params: {
    message: string;
    statusCode?: number;
    code?: string;
    details?: Record<string, unknown>;
    diagnostics?: Record<string, unknown>;
    errorType?: AppErrorType;
    requestPath?: string;
    referenceId?: string;
    isOperational?: boolean;
  }) {
    super(params.message);
    this.name = "AppError";
    this.statusCode = params.statusCode ?? 500;
    this.status = this.statusCode;
    this.code = params.code;
    this.details = params.details;
    this.diagnostics = params.diagnostics;
    this.errorType =
      params.errorType ??
      resolveErrorType({
        statusCode: this.statusCode,
        axiosCode: params.code,
        message: params.message,
        hasResponse: true,
      });
    this.requestPath = params.requestPath;
    this.referenceId = params.referenceId ?? createReferenceId();
    this.isOperational = params.isOperational ?? true;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toAppError(error: unknown, context: AppErrorContext = {}): AppError {
  if (error instanceof AppError) {
    if (context.requestPath && !error.requestPath) {
      error.requestPath = context.requestPath;
    }

    if (context.diagnostics) {
      error.diagnostics = {
        ...(error.diagnostics ?? {}),
        ...context.diagnostics,
      };
    }

    if (context.referenceId && !error.referenceId) {
      error.referenceId = context.referenceId;
    }

    return error;
  }

  if (error instanceof AxiosError) {
    const responseData = error.response?.data as ErrorShape | undefined;
    const statusCode = responseData?.statusCode ?? error.response?.status ?? 500;
    const message = normalizeMessage(
      responseData?.message,
      error.message || "Unexpected API error",
    );

    return new AppError({
      message,
      statusCode,
      code: responseData?.errorCode ?? responseData?.error ?? error.code,
      details: responseData?.details,
      diagnostics: {
        axiosCode: error.code,
        hasResponse: Boolean(error.response),
        ...(context.diagnostics ?? {}),
      },
      errorType: resolveErrorType({
        statusCode,
        axiosCode: error.code,
        message,
        hasResponse: Boolean(error.response),
      }),
      requestPath: context.requestPath,
      referenceId: context.referenceId,
    });
  }

  if (error instanceof Error) {
    const errorWithCode = error as Error & { code?: string };
    const errorType = resolveErrorType({
      statusCode: 500,
      axiosCode: errorWithCode.code,
      message: error.message,
      hasResponse: false,
    });

    return new AppError({
      message: error.message || "Unexpected error",
      statusCode: errorType === "TIMEOUT" ? 408 : 500,
      code: errorWithCode.code,
      diagnostics: context.diagnostics,
      errorType,
      requestPath: context.requestPath,
      referenceId: context.referenceId,
      isOperational: false,
    });
  }

  return new AppError({
    message: "Unexpected error",
    statusCode: 500,
    diagnostics: context.diagnostics,
    errorType: "UNKNOWN_SERVER_ERROR",
    requestPath: context.requestPath,
    referenceId: context.referenceId,
  });
}

export function isUnauthorizedError(error: unknown): boolean {
  return toAppError(error).statusCode === 401;
}

export function isForbiddenError(error: unknown): boolean {
  return toAppError(error).statusCode === 403;
}

export function isStepUpRequiredError(error: unknown): boolean {
  const appError = toAppError(error);
  return appError.statusCode === 403 && appError.code === "STEP_UP_REQUIRED";
}

import { useCallback } from "react";
import { toast } from "sonner";
import { toAppError } from "@/lib/api/errors";

/**
 * Unified error handler for API + form layers.
 * Keeps user-facing feedback consistent across modules.
 */
export function useErrorHandler() {
  const handleApiError = useCallback(
    (error: unknown, fallbackMessage = "حدث خطأ غير متوقع") => {
      const appError = toAppError(error);
      if (process.env.NODE_ENV === "development") {
        console.error("API Error:", {
          statusCode: appError.statusCode,
          errorType: appError.errorType,
          requestPath: appError.requestPath,
          referenceId: appError.referenceId,
        });
      }

      const messages = appError.message
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (messages.length > 0) {
        messages.forEach((msg) => toast.error(getArabicErrorMessage(msg)));
        return;
      }

      const statusMessage = getErrorMessageByStatus(appError.statusCode);
      if (statusMessage) {
        toast.error(statusMessage);
        return;
      }

      toast.error(fallbackMessage);
    },
    []
  );

  const handleValidationError = useCallback((message: string) => {
    toast.error(message);
  }, []);

  const showSuccess = useCallback((message: string) => {
    toast.success(message);
  }, []);

  const showWarning = useCallback((message: string) => {
    toast.warning(message);
  }, []);

  const showInfo = useCallback((message: string) => {
    toast.info(message);
  }, []);

  return {
    handleApiError,
    handleValidationError,
    showSuccess,
    showWarning,
    showInfo,
  };
}

function getArabicErrorMessage(message: string): string {
  const translations: Record<string, string> = {
    "Invalid credentials": "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    "User not found": "المستخدم غير موجود",
    "Email already exists": "البريد الإلكتروني مسجل مسبقًا",
    Unauthorized: "غير مصرح لك بالدخول",
    "Token expired": "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى",
    "Invalid token": "رمز المصادقة غير صحيح",

    "Email is required": "البريد الإلكتروني مطلوب",
    "Password is required": "كلمة المرور مطلوبة",
    "Name is required": "الاسم مطلوب",
    "Phone is required": "رقم الهاتف مطلوب",

    "Resource not found": "العنصر المطلوب غير موجود",
    "Booking not found": "الحجز غير موجود",
    "Client not found": "العميل غير موجود",
    "Service not found": "الخدمة غير موجودة",
    "Staff not found": "الموظف غير موجود",

    Forbidden: "ليس لديك صلاحية للقيام بهذا الإجراء",
    "Access denied": "تم رفض الوصول",

    "Time slot already booked": "هذا الوقت محجوز بالفعل",
    "Duplicate entry": "البيانات موجودة مسبقًا",

    "Internal server error": "خطأ في الخادم، يرجى المحاولة لاحقًا",
    "Service unavailable": "الخدمة غير متاحة حاليًا",
    "Network error": "خطأ في الاتصال بالإنترنت",
  };

  for (const [english, arabic] of Object.entries(translations)) {
    if (message.toLowerCase().includes(english.toLowerCase())) {
      return arabic;
    }
  }

  return message;
}

function getErrorMessageByStatus(status?: number): string | null {
  const messages: Record<number, string> = {
    400: "البيانات المدخلة غير صحيحة",
    401: "يرجى تسجيل الدخول أولاً",
    403: "ليس لديك صلاحية للقيام بهذا الإجراء",
    404: "العنصر المطلوب غير موجود",
    409: "البيانات موجودة مسبقًا",
    422: "البيانات المدخلة غير صحيحة",
    429: "تم تجاوز عدد المحاولات، يرجى المحاولة لاحقًا",
    500: "خطأ في الخادم، يرجى المحاولة لاحقًا",
    502: "الخادم غير متاح حاليًا",
    503: "الخدمة قيد الصيانة",
  };

  return status ? messages[status] || null : null;
}

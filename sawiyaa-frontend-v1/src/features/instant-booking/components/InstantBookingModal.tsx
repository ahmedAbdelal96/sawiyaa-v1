"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Video,
  X,
  XCircle,
} from "lucide-react";
import { MoneyText } from "@/components/money/MoneyText";
import { mapPractitionerDurationMoney } from "@/features/practitioners-discovery/lib/practitioner-price";
import { ConfirmModal } from "@/components/ui/modal";
import { toAppError } from "@/lib/api/errors";
import {
  useCancelPatientInstantBookingRequest,
  useCreatePatientInstantBookingRequest,
  usePatientInstantBookingRequest,
} from "../hooks/use-instant-booking";
import type {
  InstantBookingDiscoveryDuration,
  InstantBookingRequest,
} from "../types/instant-booking.types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  practitioner: {
    slug: string;
    displayName: string;
    currencyCode?: string | null;
    instantBookingPrice30Egp?: number | null;
    instantBookingPrice30Usd?: number | null;
    instantBookingPrice60Egp?: number | null;
    instantBookingPrice60Usd?: number | null;
  };
  activeRequest?: InstantBookingRequest | null;
  onScrollToAvailability?: () => void;
  onAvailabilityChanged?: () => Promise<void>;
  availableDurations: { 30: boolean; 60: boolean };
};

function formatCountdown(secondsLeft: number): string {
  if (secondsLeft <= 0) return "00:00";
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function InstantBookingModal({
  isOpen,
  onClose,
  practitioner,
  activeRequest: initialActiveRequest,
  onScrollToAvailability,
  onAvailabilityChanged,
  availableDurations,
}: Props) {
  const t = useTranslations("instant-booking-modal");
  const locale = useLocale();
  const router = useRouter();
  const isArabic = locale === "ar";

  const [selectedDuration, setSelectedDuration] =
    useState<InstantBookingDiscoveryDuration>(30);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(
    initialActiveRequest?.id ?? null,
  );
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [apiError, setApiError] = useState<string | null>(null);

  // Preserve idempotency key across retries of the SAME submission
  const idempotencyKeyRef = useRef<string>(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `ib-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  const createMutation = useCreatePatientInstantBookingRequest();
  const cancelMutation = useCancelPatientInstantBookingRequest();

  // Watch active request updates
  const { data: polledRequest } = usePatientInstantBookingRequest(activeRequestId);

  const currentRequest = polledRequest ?? initialActiveRequest ?? null;

  // Sync initialActiveRequest if prop changes
  useEffect(() => {
    if (!availableDurations[selectedDuration]) {
      const nextDuration = availableDurations[30] ? 30 : availableDurations[60] ? 60 : 30;
      setSelectedDuration(nextDuration);
    }
  }, [availableDurations, selectedDuration]);

  useEffect(() => {
    if (initialActiveRequest?.id) {
      setActiveRequestId(initialActiveRequest.id);
    }
  }, [initialActiveRequest?.id]);

  // Handle countdown timer based on backend expiresAt
  useEffect(() => {
    if (!currentRequest?.expiresAt) {
      setSecondsLeft(0);
      return;
    }

    const targetTime = new Date(currentRequest.expiresAt).getTime();

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentRequest?.expiresAt]);

  if (!isOpen) return null;

  // Resolve prices for 30m and 60m duration options
  const price30Money = mapPractitionerDurationMoney({
    amount:
      practitioner.currencyCode === "EGP"
        ? practitioner.instantBookingPrice30Egp
        : practitioner.instantBookingPrice30Usd,
    currencyCode: practitioner.currencyCode,
  });

  const price60Money = mapPractitionerDurationMoney({
    amount:
      practitioner.currencyCode === "EGP"
        ? practitioner.instantBookingPrice60Egp
        : practitioner.instantBookingPrice60Usd,
    currencyCode: practitioner.currencyCode,
  });

  const activeMoney = selectedDuration === 30 ? price30Money : price60Money;

  const handleSubmit = async () => {
    setApiError(null);
    try {
      const created = await createMutation.mutateAsync({
        practitionerSlug: practitioner.slug,
        durationMinutes: selectedDuration,
      });
      setActiveRequestId(created.id);
    } catch (err: unknown) {
      const appError = toAppError(err);
      const errorCode = appError.code;
      const messageKey = appError.messageKey;

      if (
        errorCode === "PRACTITIONER_OFFLINE" ||
        errorCode === "PRACTITIONER_NOT_ONLINE" ||
        messageKey === "instantBooking.errors.practitionerNotOnline"
      ) {
        setApiError(
          isArabic
            ? "المختص غير متصل بالمنصة حالياً (تأكد من فتح صفحة المختص وإرسال إشارة الاتصال)."
            : "Practitioner is currently offline.",
        );
      } else if (
        errorCode === "INSTANT_BOOKING_DISABLED" ||
        messageKey === "instantBooking.errors.instantBookingDisabled"
      ) {
        setApiError(isArabic ? "المختص لا يستقبل طلبات جلسات فورية حالياً." : "Practitioner is not accepting instant booking requests.");
      } else if (
        errorCode === "INSTANT_BOOKING_PENDING_REQUEST_ALREADY_EXISTS" ||
        messageKey === "instantBooking.errors.pendingRequestAlreadyExists"
      ) {
        setApiError(
          isArabic
            ? "لديك طلب حجز فوري معلق بالفعل مع هذا المختص في انتظار رده."
            : "You already have a pending instant booking request with this practitioner.",
        );
      } else if (
        errorCode === "INSTANT_BOOKING_PRACTITIONER_BUSY" ||
        messageKey === "instantBooking.errors.practitionerBusy" ||
        errorCode === "SESSION_CONFLICT" ||
        errorCode === "SESSION_PRACTITIONER_TIME_CONFLICT" ||
        messageKey === "sessions.errors.practitionerTimeConflict" ||
        errorCode === "SLOT_UNAVAILABLE"
      ) {
        setApiError(isArabic ? "المختص مشغول حالياً أو لديه تعارض في المواعيد." : "Practitioner is currently busy or has a session conflict.");
        await onAvailabilityChanged?.();
      } else {
        setApiError(
          appError.message ||
            (isArabic ? "تعذر إرسال الطلب. يرجى المحاولة مرة أخرى." : "Failed to send request. Please try again."),
        );
      }
    }
  };

  const handleCancelRequest = async () => {
    if (!activeRequestId) return;
    try {
      await cancelMutation.mutateAsync({
        requestId: activeRequestId,
        reason: "Patient cancelled from modal",
      });
      setConfirmCancel(false);
    } catch {
      // Error handled by mutation state
    }
  };

  const handleGoToPayment = () => {
    if (currentRequest?.createdSessionId) {
      router.push(`/patient/sessions/${currentRequest.createdSessionId}/pay`);
      onClose();
    }
  };

  const status = currentRequest?.status;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs transition-opacity sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="instant-modal-title"
      >
        <div className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-border-light bg-white shadow-2xl transition-all dark:bg-surface-secondary">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-light/60 px-6 py-4 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
                <Clock size={16} />
              </span>
              <h2 id="instant-modal-title" className="text-base font-bold text-text-primary dark:text-white">
                {isArabic ? "طلب جلسة فورية" : "Request Instant Session"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-text-muted transition hover:bg-surface-tertiary hover:text-text-primary dark:hover:bg-white/10"
              aria-label={isArabic ? "إغلاق" : "Close"}
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6">
            {/* ----------------------------------------------------------------- */}
            {/* 1. INITIAL FORM STATE (No Request Created Yet) */}
            {/* ----------------------------------------------------------------- */}
            {!currentRequest || status === "CANCELLED" ? (
              <div className="space-y-5">
                {/* Notice Box */}
                <div className="rounded-2xl border border-primary/20 bg-primary-light/40 p-4 text-xs text-text-secondary dark:bg-primary/10 dark:text-text-secondary">
                  <p className="font-semibold text-text-primary dark:text-white">
                    {isArabic ? "اطلب جلسة فيديو الآن" : "Request a video session now"}
                  </p>
                  <p className="mt-1 leading-relaxed">
                    {isArabic
                      ? "سيتم إرسال طلب للمختص، وسيكون أمامه دقيقتان لقبول الطلب. لن يتم الدفع إلا بعد موافقته."
                      : "A request will be sent to the practitioner with 2 minutes to respond. Payment occurs only after acceptance."}
                  </p>
                </div>

                {apiError ? (
                  <div className="flex items-center gap-2 rounded-xl border border-error-200 bg-error-50 p-3 text-xs text-error-700 dark:border-error-800 dark:bg-error-950/40 dark:text-error-300">
                    <AlertCircle size={16} className="shrink-0 text-error-500" />
                    <span>{apiError}</span>
                  </div>
                ) : null}

                {/* Duration Radio Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted">
                    {isArabic ? "مدة الجلسة" : "Session Duration"}
                  </label>

                  <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={isArabic ? "اختر مدة الجلسة" : "Select session duration"}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selectedDuration === 30}
                      onClick={() => setSelectedDuration(30)}
                      disabled={!availableDurations[30]}
                      className={`relative flex flex-col justify-between rounded-2xl border p-4 text-start transition-all cursor-pointer ${
                        selectedDuration === 30
                          ? "border-primary bg-primary-light/30 ring-2 ring-primary/20 dark:border-primary dark:bg-primary/15"
                          : "border-border-light bg-white hover:border-primary/40 dark:border-white/10 dark:bg-surface-secondary"
                      }`}
                    >
                      <span className="text-xs font-semibold text-text-secondary">
                        {isArabic ? "30 دقيقة" : "30 Minutes"}
                      </span>
                      <span className="mt-2 text-base font-bold text-text-primary dark:text-white">
                        {price30Money ? <MoneyText money={price30Money} /> : "-"}
                      </span>
                    </button>

                    <button
                      type="button"
                      role="radio"
                      aria-checked={selectedDuration === 60}
                      onClick={() => setSelectedDuration(60)}
                      disabled={!availableDurations[60]}
                      className={`relative flex flex-col justify-between rounded-2xl border p-4 text-start transition-all cursor-pointer ${
                        selectedDuration === 60
                          ? "border-primary bg-primary-light/30 ring-2 ring-primary/20 dark:border-primary dark:bg-primary/15"
                          : "border-border-light bg-white hover:border-primary/40 dark:border-white/10 dark:bg-surface-secondary"
                      }`}
                    >
                      <span className="text-xs font-semibold text-text-secondary">
                        {isArabic ? "60 دقيقة" : "60 Minutes"}
                      </span>
                      <span className="mt-2 text-base font-bold text-text-primary dark:text-white">
                        {price60Money ? <MoneyText money={price60Money} /> : "-"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Request Summary Card */}
                <div className="rounded-2xl border border-border-light/60 bg-surface-tertiary/60 p-4 text-xs space-y-2 dark:bg-white/5">
                  <div className="flex justify-between">
                    <span className="text-text-muted">{isArabic ? "المختص" : "Practitioner"}</span>
                    <span className="font-semibold text-text-primary dark:text-white">{practitioner.displayName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">{isArabic ? "نوع الجلسة" : "Session Type"}</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-text-brand">
                      <Video size={12} />
                      {isArabic ? "جلسة فيديو" : "Video Session"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">{isArabic ? "السعر المحدد" : "Instant Price"}</span>
                    <span className="font-bold text-text-primary dark:text-white">
                      {activeMoney ? <MoneyText money={activeMoney} /> : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border-light/40 pt-2 dark:border-white/10">
                    <span className="text-text-muted">{isArabic ? "مهلة الرد" : "Response Window"}</span>
                    <span className="font-semibold text-amber-700 dark:text-amber-400">{isArabic ? "دقيقتان" : "2 minutes"}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={createMutation.isPending}
                    onClick={handleSubmit}
                    className="sawiyaa-btn-press inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-hover disabled:opacity-60 shadow-theme-xs cursor-pointer"
                  >
                    {createMutation.isPending ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        {isArabic ? "جاري الإرسال..." : "Sending..."}
                      </span>
                    ) : (
                      <>
                        {isArabic ? "إرسال طلب الجلسة" : "Send session request"}
                        <ArrowRight size={16} className="rtl:rotate-180" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : null}

            {/* ----------------------------------------------------------------- */}
            {/* 2. PENDING STATE */}
            {/* ----------------------------------------------------------------- */}
            {currentRequest && status === "PENDING" ? (
              <div className="py-4 text-center space-y-5">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                  <Clock size={32} className="animate-pulse" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-text-primary dark:text-white">
                    {isArabic ? "تم إرسال طلبك" : "Request sent"}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {isArabic
                      ? `في انتظار رد د. ${practitioner.displayName}...`
                      : `Waiting for Dr. ${practitioner.displayName} to respond...`}
                  </p>
                </div>

                {/* Timer Display */}
                <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-50 px-5 py-2 text-xl font-mono font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  <Clock size={18} />
                  <span>{formatCountdown(secondsLeft)}</span>
                </div>

                <p className="text-xs text-text-muted">
                  {isArabic ? "سنبلغك فور رد المختص." : "We will notify you as soon as the practitioner responds."}
                </p>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmCancel(true)}
                    className="flex-1 rounded-xl border border-border-light bg-surface-secondary py-2.5 text-xs font-semibold text-text-secondary transition hover:bg-surface-tertiary dark:border-white/10 dark:bg-white/5 cursor-pointer"
                  >
                    {isArabic ? "إلغاء الطلب" : "Cancel Request"}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-xl border border-primary/20 bg-primary-light/40 py-2.5 text-xs font-semibold text-text-brand transition hover:bg-primary-light/70 dark:bg-primary/10 cursor-pointer"
                  >
                    {isArabic ? "إغلاق" : "Close Window"}
                  </button>
                </div>
              </div>
            ) : null}

            {/* ----------------------------------------------------------------- */}
            {/* 3. ACCEPTED STATE */}
            {/* ----------------------------------------------------------------- */}
            {currentRequest && status === "ACCEPTED" ? (
              <div className="py-4 text-center space-y-5">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <CheckCircle2 size={36} />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                    {isArabic ? "وافق المختص على طلبك!" : "Practitioner accepted your request!"}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {isArabic
                      ? "تم حجز الجلسة مؤقتاً في انتظار الدفع."
                      : "Session temporarily reserved pending payment."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGoToPayment}
                  className="sawiyaa-btn-press inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-white transition-all hover:bg-primary-hover shadow-md cursor-pointer"
                >
                  <ShieldCheck size={18} />
                  <span>{isArabic ? "إكمال الدفع الآن" : "Complete Payment Now"}</span>
                </button>
              </div>
            ) : null}

            {/* ----------------------------------------------------------------- */}
            {/* 4. REJECTED STATE */}
            {/* ----------------------------------------------------------------- */}
            {currentRequest && status === "REJECTED" ? (
              <div className="py-4 text-center space-y-5">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <XCircle size={32} />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-text-primary dark:text-white">
                    {isArabic ? "تعذر قبول الطلب" : "Request could not be accepted"}
                  </h3>
                  <p className="text-xs leading-relaxed text-text-secondary">
                    {isArabic
                      ? "لم يتمكن المختص من قبول الجلسة الفورية هذه المرة. يمكنك حجز موعد لاحق أو اختيار مختص آخر."
                      : "The practitioner could not accept this instant request. You can schedule a later appointment or select another practitioner."}
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  {onScrollToAvailability ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onScrollToAvailability();
                      }}
                      className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-primary-hover cursor-pointer"
                    >
                      {isArabic ? "حجز موعد لاحق" : "Schedule appointment"}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push("/practitioners");
                    }}
                    className="rounded-xl border border-border-light bg-surface-secondary px-4 py-2.5 text-xs font-semibold text-text-secondary transition hover:bg-surface-tertiary dark:border-white/10 dark:bg-white/5 cursor-pointer"
                  >
                    {isArabic ? "عرض المختصين" : "View Practitioners"}
                  </button>
                </div>
              </div>
            ) : null}

            {/* ----------------------------------------------------------------- */}
            {/* 5. EXPIRED STATE */}
            {/* ----------------------------------------------------------------- */}
            {currentRequest && status === "EXPIRED" ? (
              <div className="py-4 text-center space-y-5">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                  <Clock size={32} />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-text-primary dark:text-white">
                    {isArabic ? "انتهت مهلة الطلب" : "Request Expired"}
                  </h3>
                  <p className="text-xs leading-relaxed text-text-secondary">
                    {isArabic
                      ? "لم يتم قبول الطلب خلال الوقت المحدد."
                      : "The request was not accepted within the allocated time."}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRequestId(null);
                    }}
                    className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-semibold text-white transition hover:bg-primary-hover cursor-pointer"
                  >
                    {isArabic ? "إرسال طلب جديد" : "Send new request"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push("/practitioners");
                    }}
                    className="flex-1 rounded-xl border border-border-light bg-surface-secondary py-2.5 text-xs font-semibold text-text-secondary transition hover:bg-surface-tertiary dark:border-white/10 dark:bg-white/5 cursor-pointer"
                  >
                    {isArabic ? "عرض المختصين" : "View Practitioners"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Cancellation */}
      <ConfirmModal
        isOpen={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title={isArabic ? "إلغاء الطلب" : "Cancel Request"}
        description={
          isArabic
            ? "هل تريد إلغاء طلب الجلسة الفورية؟"
            : "Are you sure you want to cancel your instant session request?"
        }
        confirmLabel={cancelMutation.isPending ? (isArabic ? "جاري الإلغاء..." : "Cancelling...") : (isArabic ? "نعم، إلغاء الطلب" : "Yes, cancel request")}
        cancelLabel={isArabic ? "التراجع" : "Go Back"}
        loading={cancelMutation.isPending}
        onConfirm={handleCancelRequest}
      />
    </>
  );
}

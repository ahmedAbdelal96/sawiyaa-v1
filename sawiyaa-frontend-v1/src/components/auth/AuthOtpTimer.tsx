"use client";

import React, { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { Clock } from "lucide-react";

interface AuthOtpTimerProps {
  expiresAt: string | Date;
  onExpire?: () => void;
}

export default function AuthOtpTimer({ expiresAt, onExpire }: AuthOtpTimerProps) {
  const locale = useLocale();
  const isRtl = locale.startsWith("ar");
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(expiresAt).getTime() - Date.now();
      return Math.max(0, Math.floor(difference / 1000));
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const seconds = calculateTimeLeft();
      setTimeLeft(seconds);
      if (seconds <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  if (timeLeft <= 0) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-status-danger/20 bg-status-danger/5 px-4 py-3.5 text-xs font-semibold text-status-danger">
        <Clock className="h-4 w-4 shrink-0" />
        <span>
          {isRtl ? "انتهت صلاحية رمز التحقق." : "The verification code has expired."}
        </span>
      </div>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl border border-border-light bg-surface-tertiary/60 px-4 py-3.5 text-xs leading-5 text-text-secondary dark:border-white/5 dark:bg-surface-tertiary/70 select-none">
      <Clock className="h-4 w-4 text-primary shrink-0 animate-pulse" />
      <span>
        {isRtl ? "ينتهي الرمز خلال:" : "Code expires in:"}{" "}
        <span className="font-mono font-bold text-text-primary dark:text-white">{formattedTime}</span>
      </span>
    </div>
  );
}

export function formatInstantBookingMoney(
  amount: string | null | undefined,
  currencyCode: string | null | undefined,
  locale: string,
) {
  if (!amount || !currencyCode) {
    return "-";
  }

  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) {
    return `${amount} ${currencyCode.toUpperCase()}`;
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(numeric);
}

export function formatInstantBookingDateTime(
  value: string | null | undefined,
  locale: string,
) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  }).format(new Date(value));
}

export function formatInstantBookingTime(
  value: string | null | undefined,
  locale: string,
) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  }).format(new Date(value));
}

export function formatInstantBookingExpiry(
  expiresAt: string,
  locale: string,
  nowMs: number,
) {
  const diffMs = new Date(expiresAt).getTime() - nowMs;
  if (diffMs <= 0) {
    return locale.startsWith("ar") ? "انتهت صلاحية الطلب" : "Request expired";
  }

  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const numberFormat = new Intl.NumberFormat(locale.startsWith("ar") ? "ar-EG" : "en-US");

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (locale.startsWith("ar")) {
      return `ينتهي خلال ${numberFormat.format(hours)} س ${numberFormat.format(remainingMinutes)} د`;
    }

    return `Expires in ${numberFormat.format(hours)}h ${numberFormat.format(remainingMinutes)}m`;
  }

  if (locale.startsWith("ar")) {
    return `ينتهي خلال ${numberFormat.format(minutes)} د ${numberFormat.format(seconds)} ث`;
  }

  return `Expires in ${numberFormat.format(minutes)}m ${numberFormat.format(seconds)}s`;
}


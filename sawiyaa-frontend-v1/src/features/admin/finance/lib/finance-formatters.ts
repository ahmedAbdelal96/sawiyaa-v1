export function formatSettlementDateTime(locale: string, value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

export function formatSettlementMoney(
  locale: string,
  value: string | null,
  currency: string | null,
) {
  if (!value || !currency) {
    return "-";
  }

  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return `${value} ${currency}`;
  }

  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

export function toDateTimeLocalInputValue(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-")
    .concat("T")
    .concat([pad(date.getHours()), pad(date.getMinutes())].join(":"));
}

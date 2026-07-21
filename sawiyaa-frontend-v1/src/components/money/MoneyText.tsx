"use client";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedMoney, type Money } from "@/lib/money";

export function MoneyText({ money }: { money: Money }) {
  const locale = useLocale();
  const t = useTranslations("common.money");
  return <bdi dir={locale.startsWith("ar") ? "rtl" : "ltr"}>{formatLocalizedMoney({ money, locale, labels: { USD: t("currency.usd.full"), EGP: t("currency.egp.full") } })}</bdi>;
}

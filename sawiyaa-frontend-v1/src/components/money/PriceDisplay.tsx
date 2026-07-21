"use client";
import { useTranslations } from "next-intl";
import { MoneyText } from "./MoneyText";
import type { Price } from "@/lib/money";

export function PriceDisplay({ price }: { price: Price }) {
  const t = useTranslations("common.money.pricing");
  if (price.status === "FREE") return <span>{t("free")}</span>;
  if (price.status === "UNAVAILABLE") return <span>{t("unavailable")}</span>;
  return <MoneyText money={price.money} />;
}

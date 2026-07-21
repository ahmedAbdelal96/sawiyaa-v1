import React from "react";
import { useTranslation } from "react-i18next";
import { MoneyText } from "./MoneyText";
import { Text, type TextProps } from "../ui/Text";
import type { Price } from "../../lib/money";

export function PriceDisplay({ price, ...props }: TextProps & { price: Price }) {
  const { t } = useTranslation();
  if (price.status === "PAID" && price.money) return <MoneyText money={price.money} {...props} />;
  if (price.status === "FREE") return <Text {...props}>{t("money.free", "Free")}</Text>;
  return <Text {...props}>{t("money.unavailable", "Price unavailable")}</Text>;
}

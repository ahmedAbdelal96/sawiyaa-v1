import React from "react";
import { useTranslation } from "react-i18next";
import { Text, type TextProps } from "../ui/Text";
import { formatMoney, type Money } from "../../lib/money";

export function MoneyText({ money, ...props }: TextProps & { money: Money }) {
  const { i18n } = useTranslation();
  return <Text {...props}>{formatMoney(money, i18n.language)}</Text>;
}

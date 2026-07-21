import { parseMoney, type Money } from "@/lib/money";

type PractitionerFilterMoneyInput = {
  amount: number | null | undefined;
  currencyCode: string | null | undefined;
};

export function mapPractitionerFilterMoney(
  input: PractitionerFilterMoneyInput,
): Money | null {
  return parseMoney({ amount: input.amount, currencyCode: input.currencyCode });
}

import { parseMoney, type Money } from "@/lib/money";
import type {
  InstantBookingDiscoveryCurrency,
  InstantBookingDiscoveryDuration,
  InstantBookingEligiblePractitionerItem,
} from "../types/instant-booking.types";

/**
 * The API chooses the regional currency. This adapter only validates and maps
 * the selected response money for a duration, it never chooses a currency.
 */
export function mapInstantBookingDiscoveryMoney(input: {
  practitioner: InstantBookingEligiblePractitionerItem;
  currencyCode: InstantBookingDiscoveryCurrency;
  durationMinutes: InstantBookingDiscoveryDuration;
}): Money | null {
  const amount = input.practitioner.instantBookingPricing?.[input.currencyCode]?.[
    input.durationMinutes
  ];

  return parseMoney({ amount, currencyCode: input.currencyCode });
}

import * as Crypto from "expo-crypto";

/** Generate UUIDs without depending on browser globals unavailable in native Hermes. */
export function createMobileUuid(): string {
  return Crypto.randomUUID();
}

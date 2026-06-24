export enum PaymobCheckoutMethod {
  CARD = 'CARD',
  WALLET = 'WALLET',
}

export enum PaymobCheckoutFlow {
  LEGACY = 'legacy',
  INTENTION = 'intention',
}

export type PaymobCheckoutMethodValue =
  (typeof PaymobCheckoutMethod)[keyof typeof PaymobCheckoutMethod];

export type PaymobCheckoutFlowValue =
  (typeof PaymobCheckoutFlow)[keyof typeof PaymobCheckoutFlow];

export type PaymobMethodRegistryEntry = {
  key: string;
  label: string;
  type: string;
  enabled: boolean;
  priority: number;
  integrationId: string | null;
  currencyCodes: string[];
  supportedCheckoutFlows: PaymobCheckoutFlowValue[];
  countryIsoCodes: string[];
};

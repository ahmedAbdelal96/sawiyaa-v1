import { PaymentProvider } from '@prisma/client';
import { MarketType } from '@prisma/client';

export type PaymentRoutingMarket = 'EGYPT_LOCAL' | 'INTERNATIONAL';

export type PaymentRouteSource = 'DATABASE' | 'ENVIRONMENT';

export interface PaymentRoute {
  currencyCode: 'EGP' | 'USD';
  paymentMethod: string;
  provider: PaymentProvider;
  integrationKey: string;
  environment: 'development' | 'staging' | 'production';
  enabled: boolean;
  priority: number;
  source: PaymentRouteSource;
}

export interface PaymentRoutingContext {
  currencyCode: string;
  commissionMarketType: MarketType;
  operatingCountryIsoCode: string | null;
  checkoutCountryIsoCode: string | null;
}

export interface PaymentProviderCapability {
  provider: PaymentProvider;
  enabled: boolean;
  configured: boolean;
  available: boolean;
  missingConfig: string[];
  maintenanceMode?: boolean;
  checkoutFlow?: 'legacy' | 'intention';
  methods?: Array<{
    key: string;
    label: string;
    type: string;
    enabled: boolean;
  }>;
  supportedMethods?: string[];
  defaultMethod?: string | null;
}

export interface PaymentCapabilityMethodViewModel {
  key: string;
  type: string;
  label: string;
  enabled: boolean;
  description?: string | null;
  brands?: string[];
}

export interface PaymentWalletCapabilityViewModel {
  enabled: boolean;
  availableBalance: string | null;
  currencyCode: string | null;
  canUseFullAmount: boolean;
  canUsePartialAmount: boolean;
}

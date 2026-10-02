import { PractitionerPayoutMethodType } from '@prisma/client';

export type PractitionerPayoutMethodCapability = {
  methodType: PractitionerPayoutMethodType;
  semanticKey: string;
  countryCodes: string[] | null;
  requiredFields: string[];
  optionalFields: string[];
  providerIntegration: false;
};

/** Manual destination storage capabilities; no external provider integration is implied. */
export function getPractitionerPayoutCapabilities(): PractitionerPayoutMethodCapability[] {
  return [
    { methodType: PractitionerPayoutMethodType.WALLET, semanticKey: 'electronicWallet', countryCodes: ['EG', 'SA', 'AE'], requiredFields: ['countryCode', 'accountHolderName', 'walletProvider', 'walletIdentifier'], optionalFields: [], providerIntegration: false },
    { methodType: PractitionerPayoutMethodType.INSTAPAY, semanticKey: 'instapay', countryCodes: ['EG'], requiredFields: ['countryCode', 'accountHolderName', 'instapayIdentifier'], optionalFields: [], providerIntegration: false },
    { methodType: PractitionerPayoutMethodType.BANK_ACCOUNT, semanticKey: 'bankAccount', countryCodes: null, requiredFields: ['countryCode', 'accountHolderName', 'bankName', 'bankAccountNumber'], optionalFields: [], providerIntegration: false },
    { methodType: PractitionerPayoutMethodType.PAYPAL, semanticKey: 'paypal', countryCodes: null, requiredFields: ['countryCode', 'accountHolderName', 'paypalEmail'], optionalFields: [], providerIntegration: false },
    { methodType: PractitionerPayoutMethodType.IBAN, semanticKey: 'iban', countryCodes: null, requiredFields: ['countryCode', 'accountHolderName', 'iban'], optionalFields: [], providerIntegration: false },
    { methodType: PractitionerPayoutMethodType.OTHER, semanticKey: 'other', countryCodes: null, requiredFields: ['accountHolderName', 'otherDetails'], optionalFields: [], providerIntegration: false },
  ];
}

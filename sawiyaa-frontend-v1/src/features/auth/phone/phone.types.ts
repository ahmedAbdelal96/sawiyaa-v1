export type CountryIso2 = string;

export type PhoneInputValue = {
  raw: string;
  countryIso2: CountryIso2;
};

export type NormalizedPhoneNumber = {
  e164: string;
  countryIso2: CountryIso2;
  countryCallingCode: string;
  nationalNumber: string;
  isPossible: boolean;
  isValid: boolean;
};

export type PhoneCountryOption = {
  isoCode: CountryIso2;
  name: string;
  nativeName?: string;
  callingCode: string;
};

import {
  CountryCode,
  getCountries,
  getCountryCallingCode,
} from 'libphonenumber-js';

// ISO 3166-1 alpha-2 is the canonical identity used by the existing Country.isoCode column.
// Commercial availability is intentionally not represented here; this is master catalog data.
export const ISO3166_ALPHA2_CODES = `
AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ
BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ
DE DJ DK DM DO DZ
EC EE EG EH ER ES ET
FI FJ FK FM FO FR
GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY
HK HM HN HR HT HU
ID IE IL IM IN IO IQ IR IS IT
JE JM JO JP
KE KG KH KI KM KN KP KR KW KY KZ
LA LB LC LI LK LR LS LT LU LV LY
MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ
NA NC NE NF NG NI NL NO NP NR NU NZ
OM
PA PE PF PG PH PK PL PM PN PR PS PT PW PY
QA RE RO RS RU RW
SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ
TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ
UA UG UM US UY UZ
VA VC VE VG VI VN VU
WF WS
YE YT
ZA ZM ZW
`.trim().split(/\s+/) as string[];

export const REQUIRED_ARAB_COUNTRY_CODES = [
  'DZ', 'BH', 'KM', 'DJ', 'EG', 'IQ', 'JO', 'KW', 'LB', 'LY', 'MR',
  'MA', 'OM', 'PS', 'QA', 'SA', 'SO', 'SD', 'SY', 'TN', 'AE', 'YE',
] as const;

export const REQUIRED_MIDDLE_EAST_COUNTRY_CODES = [
  ...REQUIRED_ARAB_COUNTRY_CODES,
  'CY', 'IR', 'IL', 'TR',
] as const;

export type ProductionCountryCatalogEntry = {
  isoCode: string;
  slug: string;
  name: string;
  nativeName: string;
  phoneCode: string | null;
  currencyCode: string | null;
};

function countryName(code: string, locale: string): string {
  const name = new Intl.DisplayNames([locale], { type: 'region' }).of(code);
  if (!name) throw new Error(`Missing canonical ${locale} country name for ${code}`);
  return name;
}

function countryCallingCode(code: string): string | null {
  try {
    return `+${getCountryCallingCode(code as CountryCode)}`;
  } catch {
    return null;
  }
}

export function buildProductionCountryCatalog(): ProductionCountryCatalogEntry[] {
  const availableCallingCountries = new Set(getCountries());
  return ISO3166_ALPHA2_CODES.map((isoCode) => {
    const name = countryName(isoCode, 'en');
    return {
      isoCode,
      slug: name.toLocaleLowerCase('en-US').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      name,
      nativeName: countryName(isoCode, 'ar'),
      phoneCode: availableCallingCountries.has(isoCode as CountryCode)
        ? countryCallingCode(isoCode)
        : null,
      currencyCode: null,
    };
  });
}

export const PRODUCTION_COUNTRY_CATALOG = buildProductionCountryCatalog();

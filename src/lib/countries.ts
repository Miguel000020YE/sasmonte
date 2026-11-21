export interface Country {
  code: string;
  name: string;
}

export const COUNTRIES: Country[] = [
  { code: 'DZ', name: 'Algérie' },
  { code: 'BE', name: 'Belgique' },
  { code: 'BJ', name: 'Bénin' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'CM', name: 'Cameroun' },
  { code: 'CA', name: 'Canada' },
  { code: 'CF', name: 'Centrafrique' },
  { code: 'CG', name: 'Congo-Brazzaville' },
  { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'FR', name: 'France' },
  { code: 'GA', name: 'Gabon' },
  { code: 'GN', name: 'Guinée' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'ML', name: 'Mali' },
  { code: 'MA', name: 'Maroc' },
  { code: 'MR', name: 'Mauritanie' },
  { code: 'NE', name: 'Niger' },
  { code: 'CD', name: 'RD Congo' },
  { code: 'SN', name: 'Sénégal' },
  { code: 'CH', name: 'Suisse' },
  { code: 'TD', name: 'Tchad' },
  { code: 'TG', name: 'Togo' },
  { code: 'TN', name: 'Tunisie' },
  { code: 'ZZ', name: 'Autre pays' },
];

export const countryName = (code?: string | null) => COUNTRIES.find((c) => c.code === code)?.name ?? '';

/** Pays où SasPay (Mobile Money) est proposé en premier. TODO : confirmer la liste exacte dans la documentation SasPay. */
export const SASPAY_COUNTRIES = ['CI', 'BF', 'SN', 'ML', 'TG', 'BJ', 'CM'];
export const isSaspayCountry = (code?: string | null) => !!code && SASPAY_COUNTRIES.includes(code);

/**
 * Devine le pays depuis le fuseau horaire du navigateur. C'est une approximation :
 * plusieurs pays partagent un même fuseau (ex. Africa/Abidjan couvre aussi BF, SN, ML, TG, GN ; Africa/Lagos couvre aussi BJ, CM, GA, NE).
 * Le pays du profil prime toujours, et l'utilisateur peut le changer à la main.
 */
const TZ_TO_COUNTRY: Record<string, string> = {
  'Africa/Abidjan': 'CI',
  'Africa/Ouagadougou': 'BF',
  'Africa/Dakar': 'SN',
  'Africa/Bamako': 'ML',
  'Africa/Lome': 'TG',
  'Africa/Porto-Novo': 'BJ',
  'Africa/Douala': 'CM',
  'Africa/Conakry': 'GN',
  'Africa/Niamey': 'NE',
  'Africa/Ndjamena': 'TD',
  'Africa/Libreville': 'GA',
  'Africa/Brazzaville': 'CG',
  'Africa/Kinshasa': 'CD',
  'Africa/Lubumbashi': 'CD',
  'Africa/Nouakchott': 'MR',
  'Africa/Bangui': 'CF',
  'Africa/Casablanca': 'MA',
  'Africa/Algiers': 'DZ',
  'Africa/Tunis': 'TN',
  'Indian/Antananarivo': 'MG',
  'Europe/Paris': 'FR',
  'Europe/Brussels': 'BE',
  'Europe/Zurich': 'CH',
  'America/Toronto': 'CA',
  'America/Montreal': 'CA',
};

export function guessCountryFromTimezone(): string | null {
  try {
    return TZ_TO_COUNTRY[Intl.DateTimeFormat().resolvedOptions().timeZone] ?? null;
  } catch {
    return null;
  }
}

export type Provider = 'saspay' | 'chariow';
/** SasPay en premier dans les pays couverts, Chariow ailleurs. */
export const providerOrder = (country?: string | null): Provider[] =>
  isSaspayCountry(country) ? ['saspay', 'chariow'] : ['chariow', 'saspay'];

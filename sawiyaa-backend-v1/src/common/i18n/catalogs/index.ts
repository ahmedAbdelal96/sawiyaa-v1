import { arCatalog } from './ar';
import { enCatalog } from './en';
import { SupportedLocale } from '../types/locale.types';

export const messageCatalogs: Record<
  SupportedLocale,
  Record<string, unknown>
> = {
  ar: arCatalog,
  en: enCatalog,
};

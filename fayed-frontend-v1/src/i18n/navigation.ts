/**
 * i18n Navigation
 * روابط التنقل مع دعم اللغات
 */

import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

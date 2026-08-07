import { isValidIanaTimeZone } from '@common/utils/timezone.util';
import { SupportedLocale } from '@common/i18n/types/locale.types';

export type SessionEmailAction = {
  href: string;
  label?: string;
};

export type SessionEmailPackageContext = {
  sessionIndex: number;
  sessionCount: number;
  planTitle?: string | null;
};

export type SessionNotificationEmailTemplateInput = {
  locale: SupportedLocale;
  title: string;
  body: string;
  action: SessionEmailAction;
  publicWebUrl: string;
  environment?: string;
  sessionId?: string | null;
  recipientRole?: 'PATIENT' | 'PRACTITIONER' | null;
  startsAtUtc?: string | null;
  recipientTimezone?: string | null;
  /** @deprecated compatibility aliases for existing renderer callers. */
  sessionStartsAt?: string | null;
  timezone?: string | null;
  durationMinutes?: number | null;
  packageContext?: SessionEmailPackageContext | null;
  actionType?: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function isLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' ||
    host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.16.');
}

export function resolveAbsoluteSawiyaaUrl(
  publicWebUrl: string,
  href: string,
  environment = 'development',
): string | null {
  try {
    const base = new URL(publicWebUrl);
    if (!['http:', 'https:'].includes(base.protocol)) return null;
    if (environment === 'production' && isLocalHost(base.hostname)) return null;
    if (!href.startsWith('/') || href.startsWith('//')) return null;
    return new URL(href, `${base.origin}/`).toString();
  } catch {
    return null;
  }
}

function localizedActionLabel(locale: SupportedLocale, actionType?: string | null): string {
  if (locale === 'ar') {
    if (actionType === 'CANCELLATION_DETAILS') return 'عرض تفاصيل الإلغاء';
    if (actionType === 'JOIN_NOW' || actionType === 'LATE_JOIN') return 'انضم الآن';
    if (actionType === 'JOIN_SESSION') return 'دخول الجلسة';
    return 'عرض تفاصيل الجلسة';
  }
  if (actionType === 'CANCELLATION_DETAILS') return 'View cancellation details';
  if (actionType === 'JOIN_NOW' || actionType === 'LATE_JOIN') return 'Join now';
  if (actionType === 'JOIN_SESSION') return 'Join session';
  return 'View session details';
}

function localizedTime(utc: string | null | undefined, timezone: string | null | undefined, locale: SupportedLocale): string {
  if (!utc) return '';
  const parsed = new Date(utc);
  if (Number.isNaN(parsed.getTime())) return '';
  const zone = timezone && isValidIanaTimeZone(timezone) ? timezone : 'UTC';
  const formatted = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    timeZone: zone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'long',
  }).formatToParts(parsed);
  const parts = Object.fromEntries(formatted.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return locale === 'ar'
    ? `${parts.weekday ?? ''}، ${parts.day ?? ''} ${parts.month ?? ''} ${parts.year ?? ''}، ${parts.hour ?? ''}:${parts.minute ?? ''} ${parts.dayPeriod ?? ''} (${parts.timeZoneName ?? 'UTC'})`
    : `${parts.weekday ?? ''}, ${parts.month ?? ''} ${parts.day ?? ''}, ${parts.year ?? ''} at ${parts.hour ?? ''}:${parts.minute ?? ''} ${parts.dayPeriod ?? ''} (${parts.timeZoneName ?? 'UTC'})`;
}

function removeUnsafeDateText(value: string): string {
  return value
    .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/g, '')
    .replace(/\b(?:Africa|Asia|Europe|America|Australia|Pacific)\/[A-Za-z_]+(?:\/[A-Za-z_]+)?\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function renderSessionNotificationEmail(
  input: SessionNotificationEmailTemplateInput,
): { html: string; text: string; absoluteUrl: string } | null {
  const absoluteUrl = resolveAbsoluteSawiyaaUrl(input.publicWebUrl, input.action.href, input.environment);
  if (!absoluteUrl) return null;

  const rtl = input.locale === 'ar';
  const inferredActionType = input.actionType ?? (input.action.href.endsWith('/join') ? 'JOIN_SESSION' : 'DETAILS');
  const actionLabel = localizedActionLabel(input.locale, inferredActionType) || input.action.label || '';
  const title = removeUnsafeDateText(input.title);
  const body = removeUnsafeDateText(input.body);
  const time = localizedTime(input.startsAtUtc ?? input.sessionStartsAt, input.recipientTimezone ?? input.timezone, input.locale);
  const timeLabel = rtl ? 'موعد الجلسة' : 'Session time';
  const duration = input.durationMinutes ? (rtl ? `المدة: ${input.durationMinutes} دقيقة` : `Duration: ${input.durationMinutes} minutes`) : '';
  const packageLine = input.packageContext
    ? (rtl ? `الجلسة ${input.packageContext.sessionIndex} من أصل ${input.packageContext.sessionCount}` : `Session ${input.packageContext.sessionIndex} of ${input.packageContext.sessionCount}`)
    : '';
  const greeting = rtl ? 'مرحبًا بك في سويّة' : 'Hello from Sawiyaa';
  const accountNote = rtl ? 'يمكنك دائمًا الوصول إلى جلستك من حسابك أو تطبيق سويّة.' : 'You can always access your session from your Sawiyaa account or app.';
  const lines = [title, body, time ? `${timeLabel}: ${time}` : '', duration, packageLine, actionLabel, absoluteUrl, accountNote].filter(Boolean);
  const card = [time ? `<p><strong>${escapeHtml(timeLabel)}:</strong> ${escapeHtml(time)}</p>` : '', duration ? `<p>${escapeHtml(duration)}</p>` : '', packageLine ? `<p><strong>${escapeHtml(packageLine)}</strong></p>` : ''].join('');

  return {
    absoluteUrl,
    text: lines.join('\n\n'),
    html: `<!doctype html><html lang="${rtl ? 'ar' : 'en'}" dir="${rtl ? 'rtl' : 'ltr'}"><body style="margin:0;background:#f7f4ee;font-family:Arial,sans-serif;color:#173b3f"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden"><tr><td style="padding:28px"><div style="font-weight:700;color:#0f766e;font-size:20px">Sawiyaa | سويّة</div><p style="font-size:16px">${escapeHtml(greeting)}</p><h1 style="font-size:22px;line-height:1.35">${escapeHtml(title)}</h1><p style="font-size:16px;line-height:1.6">${escapeHtml(body)}</p><div style="font-size:14px;color:#48636a;line-height:1.7">${card}</div><table role="presentation" cellspacing="0" cellpadding="0"><tr><td bgcolor="#0f766e" style="border-radius:10px"><a href="${escapeHtml(absoluteUrl)}" style="display:inline-block;padding:14px 22px;color:#fff;text-decoration:none;font-weight:700;font-size:16px">${escapeHtml(actionLabel)}</a></td></tr></table><p style="margin-top:24px;font-size:13px;line-height:1.5;word-break:break-all"><a href="${escapeHtml(absoluteUrl)}" style="color:#0f766e">${escapeHtml(absoluteUrl)}</a></p><p style="font-size:13px;color:#48636a">${escapeHtml(accountNote)}</p></td></tr></table></td></tr></table></body></html>`,
  };
}

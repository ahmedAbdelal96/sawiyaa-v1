import { ConfigCategory } from '@prisma/client';
import { ConfigDefinition } from './config-definition.types';

export const ADMIN_SETTING_DOMAINS = [
  'sessions',
  'notifications',
  'messaging',
  'practitioners',
  'patientsAccounts',
  'contentAcademy',
  'general',
  'paymentsFinance',
  'advanced',
] as const;

export type AdminPlatformSettingDomain = (typeof ADMIN_SETTING_DOMAINS)[number];

export type AdminPlatformSettingOwnership =
  | 'BUSINESS'
  | 'OPERATIONAL'
  | 'FINANCIAL'
  | 'SECURITY'
  | 'ENVIRONMENT'
  | 'SYSTEM'
  | 'LEGACY';

export type AdminPlatformSettingEffectiveSource =
  | 'DATABASE_OVERRIDE'
  | 'CATALOG_DEFAULT'
  | 'ENVIRONMENT'
  | 'SYSTEM_MANAGED'
  | 'DEDICATED_CONTROL'
  | 'MISSING'
  | 'LEGACY';

export type AdminPlatformSettingSection =
  | 'instantBooking'
  | 'roomAccess'
  | 'packages'
  | 'reminders'
  | 'lateAttendance'
  | 'channels'
  | 'attachments'
  | 'limits'
  | 'formats'
  | 'profileMedia'
  | 'credentialDocuments'
  | 'accountAvatar'
  | 'patientAvatar'
  | 'articleAssets'
  | 'academyAssets'
  | 'certificates'
  | 'providers'
  | 'routing'
  | 'payoutProof'
  | 'localization'
  | 'systemManaged'
  | 'technical'
  | 'legacy'
  | 'environment';

export type AdminPlatformSettingMetadata = {
  primaryDomain: AdminPlatformSettingDomain;
  section: AdminPlatformSettingSection;
  ownership: AdminPlatformSettingOwnership;
  advancedOnly: boolean;
  managedByDedicatedControl: boolean;
  dedicatedRoute?: string;
};

export type AdminPlatformSettingDomainDefinition = {
  primaryDomain: AdminPlatformSettingDomain;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  dedicatedRoute?: string;
};

export const ADMIN_SETTING_DOMAIN_DEFINITIONS: readonly AdminPlatformSettingDomainDefinition[] =
  [
    {
      primaryDomain: 'sessions',
      title: 'Sessions & Booking',
      titleAr: 'الجلسات والحجوزات',
      description:
        'Timing policies for instant booking, room access, and session packages.',
      descriptionAr:
        'ضوابط الجلسات الفورية، الدخول إلى الغرفة، وباقات الجلسات.',
    },
    {
      primaryDomain: 'notifications',
      title: 'Notifications',
      titleAr: 'الإشعارات',
      description:
        'Reminder schedules, late attendance alerts, and delivery channels.',
      descriptionAr: 'جداول التذكير، تنبيهات التأخر، وقنوات إرسال الإشعارات.',
    },
    {
      primaryDomain: 'messaging',
      title: 'Messaging & Care Chat',
      titleAr: 'المراسلات ومحادثات الرعاية',
      description: 'Attachment and file policies for care conversations.',
      descriptionAr: 'سياسات المرفقات والملفات داخل محادثات الرعاية.',
    },
    {
      primaryDomain: 'practitioners',
      title: 'Practitioners',
      titleAr: 'الممارسون',
      description:
        'Practitioner profile media and credential document policies.',
      descriptionAr: 'سياسات صور الممارسين ومستندات الاعتماد المهني.',
    },
    {
      primaryDomain: 'patientsAccounts',
      title: 'Patients & Accounts',
      titleAr: 'الحسابات وملفات المستخدمين',
      description: 'Account and patient profile image policies.',
      descriptionAr: 'سياسات صور الحسابات وملفات المستخدمين.',
    },
    {
      primaryDomain: 'contentAcademy',
      title: 'Content & Academy',
      titleAr: 'المحتوى والأكاديمية',
      description: 'Article, program, and certificate asset policies.',
      descriptionAr: 'سياسات أصول المقالات والبرامج والشهادات.',
    },
    {
      primaryDomain: 'general',
      title: 'General Platform',
      titleAr: 'إعدادات المنصة العامة',
      description: 'Verified platform defaults and localization metadata.',
      descriptionAr: 'الإعدادات العامة المؤكدة وبيانات اللغة والمنطقة.',
    },
    {
      primaryDomain: 'paymentsFinance',
      title: 'Payments & Finance',
      titleAr: 'المدفوعات والمالية',
      description:
        'Payment readiness and finance controls managed in dedicated workflows.',
      descriptionAr:
        'حالة المدفوعات والضوابط المالية المدارة من مساراتها المخصصة.',
      dedicatedRoute: '/admin/payments',
    },
    {
      primaryDomain: 'advanced',
      title: 'Advanced / Technical',
      titleAr: 'متقدم / تقني',
      description:
        'Technical policies, lifecycle metadata, and safe configuration diagnostics.',
      descriptionAr:
        'السياسات التقنية وبيانات دورة الحياة وتشخيصات الإعدادات الآمنة.',
    },
  ] as const;

const EXACT_METADATA: Readonly<Record<string, AdminPlatformSettingMetadata>> = {
  INSTANT_BOOKING_REQUEST_TTL_MINUTES: {
    primaryDomain: 'sessions',
    section: 'instantBooking',
    ownership: 'BUSINESS',
    advancedOnly: false,
    managedByDedicatedControl: false,
  },
  INSTANT_BOOKING_PAYMENT_WINDOW_MINUTES: {
    primaryDomain: 'sessions',
    section: 'instantBooking',
    ownership: 'BUSINESS',
    advancedOnly: false,
    managedByDedicatedControl: false,
  },
  SESSION_JOIN_EARLY_MINUTES: {
    primaryDomain: 'sessions',
    section: 'roomAccess',
    ownership: 'BUSINESS',
    advancedOnly: false,
    managedByDedicatedControl: false,
  },
  SESSION_JOIN_AFTER_END_GRACE_MINUTES: {
    primaryDomain: 'sessions',
    section: 'roomAccess',
    ownership: 'BUSINESS',
    advancedOnly: false,
    managedByDedicatedControl: false,
  },
  'packages.enabled': {
    primaryDomain: 'sessions',
    section: 'packages',
    ownership: 'BUSINESS',
    advancedOnly: false,
    managedByDedicatedControl: false,
  },
  'packages.purchaseEnabled': {
    primaryDomain: 'sessions',
    section: 'packages',
    ownership: 'BUSINESS',
    advancedOnly: false,
    managedByDedicatedControl: false,
  },
  SESSION_REMINDER_OFFSETS_MINUTES: {
    primaryDomain: 'notifications',
    section: 'reminders',
    ownership: 'OPERATIONAL',
    advancedOnly: false,
    managedByDedicatedControl: false,
  },
  SESSION_LATE_REMINDER_ENABLED: {
    primaryDomain: 'notifications',
    section: 'lateAttendance',
    ownership: 'OPERATIONAL',
    advancedOnly: false,
    managedByDedicatedControl: false,
  },
  SESSION_LATE_REMINDER_MINUTES_AFTER_START: {
    primaryDomain: 'notifications',
    section: 'lateAttendance',
    ownership: 'OPERATIONAL',
    advancedOnly: false,
    managedByDedicatedControl: false,
  },
  SESSION_IN_APP_REMINDERS_ENABLED: {
    primaryDomain: 'notifications',
    section: 'channels',
    ownership: 'OPERATIONAL',
    advancedOnly: false,
    managedByDedicatedControl: false,
  },
  SESSION_EMAIL_REMINDERS_ENABLED: {
    primaryDomain: 'notifications',
    section: 'channels',
    ownership: 'OPERATIONAL',
    advancedOnly: false,
    managedByDedicatedControl: false,
  },
  'notifications.channels.default': {
    primaryDomain: 'advanced',
    section: 'systemManaged',
    ownership: 'SYSTEM',
    advancedOnly: true,
    managedByDedicatedControl: false,
  },
  'platform.defaultLocale': {
    primaryDomain: 'general',
    section: 'localization',
    ownership: 'SYSTEM',
    advancedOnly: true,
    managedByDedicatedControl: false,
  },
  'features.practitionerApplicationAdminReviewEnabled': {
    primaryDomain: 'advanced',
    section: 'systemManaged',
    ownership: 'SYSTEM',
    advancedOnly: true,
    managedByDedicatedControl: false,
  },
};

const PREFIX_METADATA: readonly [string, AdminPlatformSettingMetadata][] = [
  [
    'file.uploads.chat.',
    {
      primaryDomain: 'messaging',
      section: 'attachments',
      ownership: 'OPERATIONAL',
      advancedOnly: false,
      managedByDedicatedControl: false,
    },
  ],
  [
    'file.uploads.practitioner-avatar.',
    {
      primaryDomain: 'practitioners',
      section: 'profileMedia',
      ownership: 'OPERATIONAL',
      advancedOnly: false,
      managedByDedicatedControl: false,
    },
  ],
  [
    'file.uploads.practitioner-credential.',
    {
      primaryDomain: 'practitioners',
      section: 'credentialDocuments',
      ownership: 'OPERATIONAL',
      advancedOnly: false,
      managedByDedicatedControl: false,
    },
  ],
  [
    'file.uploads.user-avatar.',
    {
      primaryDomain: 'patientsAccounts',
      section: 'accountAvatar',
      ownership: 'OPERATIONAL',
      advancedOnly: false,
      managedByDedicatedControl: false,
    },
  ],
  [
    'file.uploads.patient-avatar.',
    {
      primaryDomain: 'patientsAccounts',
      section: 'patientAvatar',
      ownership: 'OPERATIONAL',
      advancedOnly: false,
      managedByDedicatedControl: false,
    },
  ],
  [
    'file.uploads.article-cover.',
    {
      primaryDomain: 'contentAcademy',
      section: 'articleAssets',
      ownership: 'OPERATIONAL',
      advancedOnly: false,
      managedByDedicatedControl: false,
    },
  ],
  [
    'file.uploads.academy-program-cover.',
    {
      primaryDomain: 'contentAcademy',
      section: 'academyAssets',
      ownership: 'OPERATIONAL',
      advancedOnly: false,
      managedByDedicatedControl: false,
    },
  ],
  [
    'file.uploads.academy-certificate.',
    {
      primaryDomain: 'contentAcademy',
      section: 'certificates',
      ownership: 'OPERATIONAL',
      advancedOnly: false,
      managedByDedicatedControl: false,
    },
  ],
  [
    'file.uploads.payout-proof.',
    {
      primaryDomain: 'paymentsFinance',
      section: 'payoutProof',
      ownership: 'FINANCIAL',
      advancedOnly: true,
      managedByDedicatedControl: true,
      dedicatedRoute: '/admin/payments',
    },
  ],
];

function fallbackOwnership(
  definition: Pick<ConfigDefinition, 'owner' | 'status' | 'category'>,
): AdminPlatformSettingOwnership {
  if (
    definition.owner === 'ENV_SECRET' ||
    definition.owner === 'ENV_INFRASTRUCTURE'
  )
    return 'ENVIRONMENT';
  if (definition.status === 'LEGACY') return 'LEGACY';
  if (definition.category === ConfigCategory.PAYMENT) return 'FINANCIAL';
  if (definition.owner === 'DATABASE_CONFIG') return 'SYSTEM';
  return 'SYSTEM';
}

export function getAdminPlatformSettingMetadata(
  definition: Pick<ConfigDefinition, 'key' | 'owner' | 'status' | 'category'>,
): AdminPlatformSettingMetadata {
  const exact = EXACT_METADATA[definition.key];
  if (exact) return exact;

  const prefix = PREFIX_METADATA.find(([value]) =>
    definition.key.startsWith(value),
  );
  if (prefix) return prefix[1];

  if (definition.category === ConfigCategory.PAYMENT) {
    return {
      primaryDomain: 'paymentsFinance',
      section: definition.key.includes('routing') ? 'routing' : 'providers',
      ownership: 'FINANCIAL',
      advancedOnly: true,
      managedByDedicatedControl: true,
      dedicatedRoute: '/admin/payments',
    };
  }

  return {
    primaryDomain: 'advanced',
    section:
      definition.owner === 'ENV_SECRET' ||
      definition.owner === 'ENV_INFRASTRUCTURE'
        ? 'environment'
        : definition.status === 'LEGACY'
          ? 'legacy'
          : 'technical',
    ownership: fallbackOwnership(definition),
    advancedOnly: true,
    managedByDedicatedControl: false,
  };
}

export function getAdminPlatformDomainDefinition(
  domain: AdminPlatformSettingDomain,
) {
  return ADMIN_SETTING_DOMAIN_DEFINITIONS.find(
    (definition) => definition.primaryDomain === domain,
  )!;
}

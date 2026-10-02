import {
  NotificationChannel,
  NotificationStatus,
  PackageSchedulePolicy,
  PatientPackagePurchaseStatus,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  PrismaClient,
  SessionEventType,
  SessionFlowType,
  SessionMode,
  SessionPaymentCoverageType,
  SessionProvider,
  SessionReminderType,
  SessionStatus,
  UserRoleType,
} from '@prisma/client';
import { createHash } from 'crypto';
import { reserveSeedSessionCode } from '../session-code-fixture';
import { developmentDemoAccounts, seedIds } from '../shared/seed.constants';
import { SeedModule } from '../shared/seed.types';

/** Development-only, dynamically dated fixtures for the real session access flow. */
export const SESSION_ACCESS_SEED_NAMESPACE = 'sawiyaa.dev.session-access.v1';

export const sessionAccessScenarioKeys = {
  primary: 'primary-immediately-joinable-direct',
  future: 'future-reminder-direct',
  package: 'package-funded',
  inProgress: 'currently-in-progress',
  expired: 'expired-join-window',
  rescheduled: 'rescheduled-active-revision',
  replacementOriginal: 'replacement-original',
  replacement: 'replacement-active',
  cancelled: 'cancelled',
} as const;

type SchedulePolicy = {
  version: 1;
  scheduleRevision: number;
  capturedAt: string;
  reminder: {
    reminderOffsetsMinutes: number[];
    lateReminderEnabled: boolean;
    lateReminderMinutesAfterStart: number;
    inAppRemindersEnabled: boolean;
    emailRemindersEnabled: boolean;
  };
  join: { joinEarlyMinutes: number; joinAfterEndGraceMinutes: number };
};

function deterministicUuid(seed: string): string {
  const hex = createHash('md5').update(seed).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function addMinutes(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60_000);
}

export function buildSessionAccessTimes(now: Date, earlyMinutes: number, graceMinutes: number) {
  const startsAt = addMinutes(now, 5);
  const endsAt = addMinutes(startsAt, 60);
  return {
    startsAt,
    endsAt,
    joinOpenAt: addMinutes(startsAt, -earlyMinutes),
    joinCloseAt: addMinutes(endsAt, graceMinutes),
  };
}

function marker(key: string): string {
  return `${SESSION_ACCESS_SEED_NAMESPACE}:${key}`;
}

async function readPolicy(prisma: PrismaClient, now: Date): Promise<SchedulePolicy> {
  const keys = [
    'SESSION_REMINDER_OFFSETS_MINUTES', 'SESSION_LATE_REMINDER_ENABLED',
    'SESSION_LATE_REMINDER_MINUTES_AFTER_START', 'SESSION_JOIN_EARLY_MINUTES',
    'SESSION_JOIN_AFTER_END_GRACE_MINUTES', 'SESSION_IN_APP_REMINDERS_ENABLED',
    'SESSION_EMAIL_REMINDERS_ENABLED',
  ];
  const rows = await prisma.configKeyCatalog.findMany({
    where: { key: { in: keys } },
    select: { key: true, values: { where: { isActive: true, scopeType: 'GLOBAL', OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }], AND: [{ OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] }] }, orderBy: { priority: 'desc' }, take: 1, select: { valueJson: true, valueBoolean: true, valueNumber: true } } },
  });
  const value = (key: string) => rows.find((row) => row.key === key)?.values[0];
  const offsets = value('SESSION_REMINDER_OFFSETS_MINUTES')?.valueJson;
  const early = value('SESSION_JOIN_EARLY_MINUTES')?.valueNumber;
  const grace = value('SESSION_JOIN_AFTER_END_GRACE_MINUTES')?.valueNumber;
  const late = value('SESSION_LATE_REMINDER_MINUTES_AFTER_START')?.valueNumber;
  if (!Array.isArray(offsets) || !offsets.every((item) => Number.isInteger(item) && Number(item) >= 0) || early === null || early === undefined || grace === null || grace === undefined || late === null || late === undefined) {
    throw new Error('Session access seed requires a valid initialized Database Config schedule policy');
  }
  return {
    version: 1, scheduleRevision: 1, capturedAt: now.toISOString(),
    reminder: {
      reminderOffsetsMinutes: [...offsets].map(Number).sort((a, b) => b - a),
      lateReminderEnabled: value('SESSION_LATE_REMINDER_ENABLED')?.valueBoolean ?? true,
      lateReminderMinutesAfterStart: Number(late),
      inAppRemindersEnabled: value('SESSION_IN_APP_REMINDERS_ENABLED')?.valueBoolean ?? true,
      emailRemindersEnabled: value('SESSION_EMAIL_REMINDERS_ENABLED')?.valueBoolean ?? true,
    },
    join: { joinEarlyMinutes: Number(early), joinAfterEndGraceMinutes: Number(grace) },
  };
}

function reminderType(offset: number): SessionReminderType {
  if (offset === 60) return SessionReminderType.REMINDER_60;
  if (offset === 15) return SessionReminderType.REMINDER_15;
  if (offset === 0) return SessionReminderType.STARTING_NOW;
  return SessionReminderType.PRE_START;
}

async function ensureSession(input: {
  prisma: PrismaClient; key: string; patientId: string; practitionerId: string; startsAt: Date;
  status: SessionStatus; policy: SchedulePolicy; scheduleRevision?: number; coverage?: SessionPaymentCoverageType;
  packagePurchaseId?: string | null; packageSessionIndex?: number | null; originalSessionId?: string | null;
  cancelledAt?: Date | null; provider?: SessionProvider; sessionId?: string;
}): Promise<string> {
  const { prisma, key, startsAt, policy } = input;
  const id = input.sessionId ?? deterministicUuid(marker(key));
  const revision = input.scheduleRevision ?? 1;
  const durationMinutes = 60;
  const endsAt = addMinutes(startsAt, durationMinutes);
  const snapshot = { ...policy, scheduleRevision: revision, capturedAt: new Date().toISOString() };
  const existing = await prisma.session.findUnique({ where: { id }, select: { sessionCode: true, createdAt: true } });
  const sessionCode = existing?.sessionCode ?? await reserveSeedSessionCode(prisma, existing?.createdAt ?? new Date(), 'dev-session-access');
  const data = {
    patientId: input.patientId, practitionerId: input.practitionerId, flowType: SessionFlowType.SCHEDULED,
    sessionMode: SessionMode.VIDEO, durationMinutes, status: input.status, requestedStartAt: startsAt,
    scheduledStartAt: startsAt, scheduledEndAt: endsAt,
    joinOpenAt: addMinutes(startsAt, -policy.join.joinEarlyMinutes),
    joinCloseAt: addMinutes(endsAt, policy.join.joinAfterEndGraceMinutes),
    scheduleRevision: revision, schedulePolicySnapshotJson: snapshot as unknown as Prisma.InputJsonValue,
    expiresAt: null, cancelledAt: input.cancelledAt ?? null, timezoneSnapshot: 'Africa/Cairo',
    provider: input.provider ?? SessionProvider.NONE, providerRoomId: null, providerSessionRef: null,
    videoRoomClosedAt: null, packagePurchaseId: input.packagePurchaseId ?? null,
    packageSessionIndex: input.packageSessionIndex ?? null, packageSessionCount: input.packagePurchaseId ? 2 : null,
    paymentCoverageType: input.coverage ?? SessionPaymentCoverageType.DIRECT_PAYMENT,
    originalSessionId: input.originalSessionId ?? null, notesInternal: marker(key),
  };
  await prisma.session.upsert({ where: { id }, create: { id, sessionCode, ...data }, update: data });
  await prisma.sessionReminderQueue.deleteMany({ where: { sessionId: id } });
  await prisma.sessionEvent.deleteMany({ where: { sessionId: id, reason: { startsWith: SESSION_ACCESS_SEED_NAMESPACE } } });
  await prisma.sessionEvent.create({ data: { sessionId: id, eventType: SessionEventType.SESSION_CREATED, source: 'SEED', reason: marker(key), occurredAt: new Date(), metadataJson: { namespace: SESSION_ACCESS_SEED_NAMESPACE, scenarioKey: key, scheduleRevision: revision } } });
  return id;
}

async function scheduleReminders(prisma: PrismaClient, input: { sessionId: string; startsAt: Date; policy: SchedulePolicy; patientUserId: string; practitionerUserId: string; revision?: number }) {
  const revision = input.revision ?? 1;
  const recipientRows = await prisma.user.findMany({ where: { id: { in: [input.patientUserId, input.practitionerUserId] } }, select: { id: true, timezone: true, defaultLocale: true } });
  const roles = new Map([[input.patientUserId, UserRoleType.PATIENT], [input.practitionerUserId, UserRoleType.PRACTITIONER]]);
  const schedule = input.policy.reminder.reminderOffsetsMinutes.map((offset) => ({ type: reminderType(offset), offset, dueAt: addMinutes(input.startsAt, -offset) }));
  if (input.policy.reminder.lateReminderEnabled) schedule.push({ type: SessionReminderType.LATE_JOIN, offset: -input.policy.reminder.lateReminderMinutesAfterStart, dueAt: addMinutes(input.startsAt, input.policy.reminder.lateReminderMinutesAfterStart) });
  const reminders = recipientRows.flatMap((recipient) =>
    schedule.map((item) => ({
      sessionId: input.sessionId, recipientUserId: recipient.id,
      recipientRole: roles.get(recipient.id)!, reminderType: item.type,
      scheduleRevision: revision, offsetMinutesSnapshot: item.offset, dueAt: item.dueAt,
      recipientTimezoneSnapshot: recipient.timezone ?? 'UTC', recipientLocaleSnapshot: recipient.defaultLocale,
      idempotencyKey: `${marker('reminder')}:${input.sessionId}:${recipient.id}:r${revision}:${item.offset}`,
    })),
  );
  await prisma.sessionReminderQueue.createMany({ data: reminders, skipDuplicates: true });
}

async function ensureCapturedPayment(prisma: PrismaClient, input: { key: string; sessionId?: string | null; patientId: string; practitionerId: string; amount: string; currency: string; purpose: PaymentPurpose }) {
  const id = deterministicUuid(marker(`payment:${input.key}`));
  const amount = new Prisma.Decimal(input.amount);
  const platformCommission = amount.mul(20).div(100).toDecimalPlaces(2);
  const practitionerShare = amount.sub(platformCommission).toDecimalPlaces(2);
  const metadataJson = {
    namespace: SESSION_ACCESS_SEED_NAMESPACE,
    scenarioKey: input.key,
    financialBreakdown: {
      sessionId: input.sessionId ?? null,
      paymentPurpose: input.purpose,
      currency: input.currency,
      grossAmount: amount.toFixed(2),
      discountAmount: '0.00',
      netPaidAmount: amount.toFixed(2),
      platformCommissionAmount: platformCommission.toFixed(2),
      practitionerShareAmount: practitionerShare.toFixed(2),
    },
  };
  await prisma.payment.upsert({ where: { id }, create: { id, sessionId: input.sessionId ?? null, patientId: input.patientId, practitionerId: input.practitionerId, paymentPurpose: input.purpose, provider: PaymentProvider.PAYMOB, status: PaymentStatus.CAPTURED, amountSubtotal: input.amount, amountDiscount: '0', amountTotal: input.amount, amountFromWallet: '0', amountFromGateway: input.amount, currencyCode: input.currency, commissionPlatformRatePercent: '20.00', commissionPractitionerRatePercent: '80.00', providerPaymentRef: marker(`payment-ref:${input.key}`), providerOrderRef: marker(`order:${input.key}`), initiatedAt: new Date(), authorizedAt: new Date(), capturedAt: new Date(), metadataJson }, update: { sessionId: input.sessionId ?? null, status: PaymentStatus.CAPTURED, amountSubtotal: input.amount, amountDiscount: '0', amountTotal: input.amount, amountFromGateway: input.amount, commissionPlatformRatePercent: '20.00', commissionPractitionerRatePercent: '80.00', capturedAt: new Date(), metadataJson } });
  return id;
}

async function seedSessionAccessFixtures(prisma: PrismaClient): Promise<void> {
  const now = new Date();
  const policy = await readPolicy(prisma, now);
  // These ids are exclusively owned by this development namespace. Removing
  // them first makes a refresh atomic in effect: all timestamps are calculated
  // from one `now`, while unrelated developer sessions remain untouched.
  const ownedSessions = await prisma.session.findMany({
    where: { notesInternal: { startsWith: `${SESSION_ACCESS_SEED_NAMESPACE}:` } },
    select: { id: true },
  });
  await prisma.notification.deleteMany({
    where: { relatedEntityId: { in: ownedSessions.map((session) => session.id) } },
  });
  await prisma.session.deleteMany({
    where: { id: { in: ownedSessions.map((session) => session.id) } },
  });
  // The primary fixture owns its operational notifications as well. Remove
  // stale notifications from older seed revisions before rebuilding the pair.
  await prisma.notification.deleteMany({
    where: {
      relatedEntityId: deterministicUuid(marker(sessionAccessScenarioKeys.primary)),
    },
  });
  const patientId = developmentDemoAccounts.primaryPatient.profileId;
  const patientUserId = developmentDemoAccounts.primaryPatient.userId;
  const practitionerId = developmentDemoAccounts.primaryPractitioner.profileId;
  const practitionerUserId = developmentDemoAccounts.primaryPractitioner.userId;
  const primaryTimes = buildSessionAccessTimes(now, policy.join.joinEarlyMinutes, policy.join.joinAfterEndGraceMinutes);
  const primaryStart = primaryTimes.startsAt;
  const primaryId = await ensureSession({ prisma, key: sessionAccessScenarioKeys.primary, patientId, practitionerId, startsAt: primaryStart, status: SessionStatus.UPCOMING, policy });
  await ensureCapturedPayment(prisma, { key: sessionAccessScenarioKeys.primary, sessionId: primaryId, patientId, practitionerId, amount: '650.00', currency: 'EGP', purpose: PaymentPurpose.SESSION_BOOKING });

  const notificationType = await prisma.notificationType.findUnique({ where: { slug: 'sessions.session-join-available' }, select: { id: true } });
  if (notificationType) for (const recipient of [{ id: patientUserId, role: 'PATIENT' }, { id: practitionerUserId, role: 'PRACTITIONER' }]) {
    const rolePath = recipient.role === 'PATIENT' ? 'patient' : 'practitioner';
    await prisma.notification.upsert({ where: { idempotencyKey: `${marker('join-available')}:${primaryId}:${recipient.id}` }, create: { userId: recipient.id, notificationTypeId: notificationType.id, channel: NotificationChannel.IN_APP, status: NotificationStatus.SENT, locale: 'ar', titleSnapshot: 'جلستك جاهزة للدخول', bodySnapshot: 'افتح سوايا للانضمام إلى الجلسة بشكل آمن.', relatedEntityType: 'SESSION', relatedEntityId: primaryId, scheduledFor: now, sentAt: now, deliveredAt: now, idempotencyKey: `${marker('join-available')}:${primaryId}:${recipient.id}`, payloadJson: { sessionId: primaryId, routePath: `/ar/${rolePath}/sessions/${primaryId}/join`, targetRole: recipient.role, action: { type: 'INTERNAL_LINK', href: `/ar/${rolePath}/sessions/${primaryId}/join`, label: 'دخول الجلسة', semanticType: 'OPEN_SESSION_JOIN' }, seedNamespace: SESSION_ACCESS_SEED_NAMESPACE } }, update: { relatedEntityId: primaryId, payloadJson: { sessionId: primaryId, routePath: `/ar/${rolePath}/sessions/${primaryId}/join`, targetRole: recipient.role, action: { type: 'INTERNAL_LINK', href: `/ar/${rolePath}/sessions/${primaryId}/join`, label: 'دخول الجلسة', semanticType: 'OPEN_SESSION_JOIN' }, seedNamespace: SESSION_ACCESS_SEED_NAMESPACE }, sentAt: now, deliveredAt: now } });
    const email = recipient.role === 'PATIENT'
      ? developmentDemoAccounts.primaryPatient.email
      : developmentDemoAccounts.primaryPractitioner.email;
    await prisma.notification.upsert({
      where: { idempotencyKey: `${marker('join-available-email')}:${primaryId}:${recipient.id}` },
      create: {
        userId: recipient.id, notificationTypeId: notificationType.id,
        channel: NotificationChannel.EMAIL, status: NotificationStatus.PENDING,
        locale: 'ar', titleSnapshot: 'جلستك جاهزة للدخول', subjectSnapshot: 'جلستك جاهزة للدخول',
        bodySnapshot: 'افتح سوايا للانضمام إلى الجلسة بشكل آمن.', relatedEntityType: 'SESSION', relatedEntityId: primaryId,
        scheduledFor: now, idempotencyKey: `${marker('join-available-email')}:${primaryId}:${recipient.id}`,
        payloadJson: { target: email, sessionId: primaryId, startsAtUtc: primaryStart.toISOString(), timezoneSnapshot: 'Africa/Cairo', routePath: `/ar/${rolePath}/sessions/${primaryId}/join`, action: { type: 'INTERNAL_LINK', href: `/ar/${rolePath}/sessions/${primaryId}/join`, label: 'دخول الجلسة', semanticType: 'OPEN_SESSION_JOIN' }, seedNamespace: SESSION_ACCESS_SEED_NAMESPACE },
      },
      update: { relatedEntityId: primaryId, scheduledFor: now, status: NotificationStatus.PENDING,
        payloadJson: { target: email, sessionId: primaryId, startsAtUtc: primaryStart.toISOString(), timezoneSnapshot: 'Africa/Cairo', routePath: `/ar/${rolePath}/sessions/${primaryId}/join`, action: { type: 'INTERNAL_LINK', href: `/ar/${rolePath}/sessions/${primaryId}/join`, label: 'دخول الجلسة', semanticType: 'OPEN_SESSION_JOIN' }, seedNamespace: SESSION_ACCESS_SEED_NAMESPACE } },
    });
  }

  const futureStart = addMinutes(now, 90);
  const futureId = await ensureSession({ prisma, key: sessionAccessScenarioKeys.future, patientId, practitionerId, startsAt: futureStart, status: SessionStatus.UPCOMING, policy });
  await ensureCapturedPayment(prisma, { key: sessionAccessScenarioKeys.future, sessionId: futureId, patientId, practitionerId, amount: '650.00', currency: 'EGP', purpose: PaymentPurpose.SESSION_BOOKING });
  await scheduleReminders(prisma, { sessionId: futureId, startsAt: futureStart, policy, patientUserId, practitionerUserId });

  const packagePurchaseId = deterministicUuid(marker('package-purchase'));
  const packagePaymentId = await ensureCapturedPayment(prisma, { key: 'package', patientId, practitionerId, amount: '1200.00', currency: 'EGP', purpose: PaymentPurpose.SESSION_PACKAGE_PURCHASE });
  const plan = await prisma.packagePlan.findFirst({ where: { isActive: true }, select: { id: true, code: true, title: true, description: true, discountPercent: true } });
  if (!plan) throw new Error('Session access seed requires an active package plan');
  await prisma.patientPackagePurchase.upsert({ where: { id: packagePurchaseId }, create: { id: packagePurchaseId, packagePlanId: plan.id, practitionerId, patientId, paymentId: packagePaymentId, status: PatientPackagePurchaseStatus.ACTIVE, paidAt: now, activatedAt: now, titleSnapshot: plan.title, descriptionSnapshot: plan.description, slugSnapshot: plan.code, packageVersionSnapshot: 1, planIdSnapshot: plan.id, planCodeSnapshot: plan.code, sessionCountSnapshot: 2, discountPercentSnapshot: plan.discountPercent, sessionDurationMinutesSnapshot: 60, sessionModeSnapshot: SessionMode.VIDEO, schedulePolicySnapshot: PackageSchedulePolicy.ALLOW_SCHEDULE_LATER, selectedCurrencyCode: 'EGP', selectedAmountSnapshot: '1200.00', metadataJson: { namespace: SESSION_ACCESS_SEED_NAMESPACE, scenarioKey: sessionAccessScenarioKeys.package } }, update: { paymentId: packagePaymentId, status: PatientPackagePurchaseStatus.ACTIVE, activatedAt: now, metadataJson: { namespace: SESSION_ACCESS_SEED_NAMESPACE, scenarioKey: sessionAccessScenarioKeys.package } } });
  // Keep the package fixture outside the T-60 direct-reminder fixture's
  // one-hour duration; the database overlap constraint remains authoritative.
  const packageStart = addMinutes(now, 240);
  const packageId = await ensureSession({ prisma, key: sessionAccessScenarioKeys.package, patientId, practitionerId, startsAt: packageStart, status: SessionStatus.UPCOMING, policy, coverage: SessionPaymentCoverageType.PACKAGE, packagePurchaseId, packageSessionIndex: 1 });
  await scheduleReminders(prisma, { sessionId: packageId, startsAt: packageStart, policy, patientUserId, practitionerUserId });

  const inProgressId = await ensureSession({ prisma, key: sessionAccessScenarioKeys.inProgress, patientId: seedIds.patientProfiles.patientB, practitionerId: seedIds.practitionerProfiles.practitionerE, startsAt: addMinutes(now, -180), status: SessionStatus.IN_PROGRESS, policy });
  await ensureCapturedPayment(prisma, { key: sessionAccessScenarioKeys.inProgress, sessionId: inProgressId, patientId: seedIds.patientProfiles.patientB, practitionerId: seedIds.practitionerProfiles.practitionerE, amount: '600.00', currency: 'USD', purpose: PaymentPurpose.SESSION_BOOKING });
  await ensureSession({ prisma, key: sessionAccessScenarioKeys.expired, patientId: seedIds.patientProfiles.patientB, practitionerId: seedIds.practitionerProfiles.practitionerF, startsAt: addMinutes(now, -300), status: SessionStatus.EXPIRED, policy });
  // Keep this patient-B fixture one full session interval before the curated
  // patient-B ready-to-join fixture at now + 5h. The gap prevents a later
  // refresh from overlapping the previous run's moving curated interval while
  // preserving a dynamic, upcoming rescheduled scenario.
  const rescheduledStart = addMinutes(now, 180);
  const rescheduledId = await ensureSession({ prisma, key: sessionAccessScenarioKeys.rescheduled, patientId: seedIds.patientProfiles.patientB, practitionerId: seedIds.practitionerProfiles.practitionerF, startsAt: rescheduledStart, status: SessionStatus.UPCOMING, policy, scheduleRevision: 2 });
  await scheduleReminders(prisma, { sessionId: rescheduledId, startsAt: rescheduledStart, policy, patientUserId: seedIds.users.patientB, practitionerUserId: seedIds.users.practitionerF, revision: 2 });
  const originalStart = addMinutes(now, 360);
  const originalId = await ensureSession({ prisma, key: sessionAccessScenarioKeys.replacementOriginal, patientId: seedIds.patientProfiles.patientB, practitionerId: seedIds.practitionerProfiles.practitionerF, startsAt: originalStart, status: SessionStatus.CANCELLED, policy, cancelledAt: now });
  await ensureSession({ prisma, key: sessionAccessScenarioKeys.replacement, patientId: seedIds.patientProfiles.patientB, practitionerId: seedIds.practitionerProfiles.practitionerF, startsAt: addMinutes(now, 440), status: SessionStatus.UPCOMING, policy, originalSessionId: originalId });
  await ensureSession({ prisma, key: sessionAccessScenarioKeys.cancelled, patientId: seedIds.patientProfiles.patientB, practitionerId: seedIds.practitionerProfiles.practitionerF, startsAt: addMinutes(now, 540), status: SessionStatus.CANCELLED, policy, cancelledAt: now });
  console.log(`[seed:session-access] ${sessionAccessScenarioKeys.primary}=${primaryId} startsAt=${primaryStart.toISOString()} joinOpenAt=${addMinutes(primaryStart, -policy.join.joinEarlyMinutes).toISOString()}`);
}

export const sessionAccessSeedModule: SeedModule = { name: 'session-access', run: seedSessionAccessFixtures };
export { seedSessionAccessFixtures };

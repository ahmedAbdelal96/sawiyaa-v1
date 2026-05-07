"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.regionalBulkSeedModule = void 0;
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const seed_utils_1 = require("../shared/seed.utils");
const SCALE_CONFIG = {
    small: {
        patients: 30,
        practitioners: 20,
        sessions: 240,
        articles: 60,
        conversations: 90,
        messagesPerConversation: 5,
        notificationsPerUser: 8,
        courses: 10,
    },
    medium: {
        patients: 120,
        practitioners: 70,
        sessions: 1100,
        articles: 220,
        conversations: 420,
        messagesPerConversation: 8,
        notificationsPerUser: 14,
        courses: 28,
    },
    large: {
        patients: 300,
        practitioners: 180,
        sessions: 4000,
        articles: 700,
        conversations: 1200,
        messagesPerConversation: 10,
        notificationsPerUser: 20,
        courses: 80,
    },
};
const TIMEZONES = [
    'Africa/Cairo',
    'Asia/Riyadh',
    'Asia/Dubai',
    'Asia/Kuwait',
    'Asia/Qatar',
    'Asia/Amman',
];
const NAMES = [
    'أحمد علي',
    'محمد حسن',
    'سارة محمود',
    'ياسمين خالد',
    'مريم سمير',
    'خالد عبد الله',
    'نوران شريف',
    'هبة جمال',
    'أدهم فؤاد',
    'رنا طارق',
];
function parseScale(value) {
    if (value === 'small' || value === 'medium' || value === 'large') {
        return value;
    }
    return 'medium';
}
function uuid(seed) {
    const h = (0, crypto_1.createHash)('md5').update(seed).digest('hex');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
function pick(arr, index) {
    return arr[index % arr.length];
}
function daysAgo(days) {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}
function daysFromNow(days) {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
function addDays(base, days) {
    return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}
function hoursAgo(hours) {
    return new Date(Date.now() - hours * 60 * 60 * 1000);
}
function addHours(base, hours) {
    return new Date(base.getTime() + hours * 60 * 60 * 1000);
}
function money(base, delta, index) {
    return (base + ((index % delta) - delta / 2)).toFixed(2);
}
const BULK_AVAILABILITY_WEEKDAYS = [
    client_1.AvailabilityWeekday.SUNDAY,
    client_1.AvailabilityWeekday.MONDAY,
    client_1.AvailabilityWeekday.TUESDAY,
    client_1.AvailabilityWeekday.WEDNESDAY,
    client_1.AvailabilityWeekday.THURSDAY,
];
exports.regionalBulkSeedModule = {
    name: 'regional-bulk',
    async run(prisma) {
        const scale = parseScale(process.env.SEED_SCALE);
        const cfg = SCALE_CONFIG[scale];
        const passwordHash = await (0, seed_utils_1.hashPassword)('Seed@123456');
        console.log(`[seed:regional-bulk] scale=${scale}`);
        const legacyLocalEmails = await prisma.userEmail.findMany({
            where: { email: { endsWith: '@fayed.local' } },
            select: {
                id: true,
                userId: true,
                email: true,
                isPrimary: true,
                isVerified: true,
            },
        });
        for (const legacyEmail of legacyLocalEmails) {
            const normalizedEmail = legacyEmail.email.replace(/@fayed\.local$/i, '@hesba.local');
            await prisma.userEmail.upsert({
                where: { email: normalizedEmail },
                create: {
                    id: uuid(`legacy-email-migration-${legacyEmail.id}`),
                    userId: legacyEmail.userId,
                    email: normalizedEmail,
                    isPrimary: legacyEmail.isPrimary,
                    isVerified: legacyEmail.isVerified,
                },
                update: {
                    userId: legacyEmail.userId,
                    isPrimary: legacyEmail.isPrimary,
                    isVerified: legacyEmail.isVerified,
                },
            });
            await prisma.userEmail.delete({
                where: { id: legacyEmail.id },
            });
        }
        const countries = await prisma.country.findMany({
            select: { id: true },
            orderBy: { createdAt: 'asc' },
        });
        const specialties = await prisma.specialty.findMany({
            where: { isActive: true },
            select: { id: true },
            orderBy: { sortOrder: 'asc' },
        });
        const languages = await prisma.language.findMany({
            where: { code: { in: ['ar', 'en'] } },
            select: { id: true, code: true },
        });
        if (countries.length === 0 || specialties.length === 0 || languages.length === 0) {
            throw new Error('[seed:regional-bulk] missing countries/specialties/languages. Run base seed first.');
        }
        const arLanguageId = languages.find((l) => l.code === 'ar')?.id ?? languages[0].id;
        const enLanguageId = languages.find((l) => l.code === 'en')?.id ?? languages[0].id;
        const patientUsers = [];
        const practitionerUsers = [];
        for (let i = 1; i <= cfg.patients; i += 1) {
            const userId = uuid(`bulk-patient-user-${i}`);
            const profileId = uuid(`bulk-patient-profile-${i}`);
            const email = `patient.bulk.${i}@hesba.local`;
            const phone = `+2011${String(1000000 + i).slice(-7)}`;
            const countryId = pick(countries, i).id;
            await prisma.user.upsert({
                where: { id: userId },
                create: {
                    id: userId,
                    displayName: `${pick(NAMES, i)} (مريض ${i})`,
                    status: client_1.UserStatus.ACTIVE,
                    defaultLocale: i % 3 === 0 ? 'en' : 'ar',
                    timezone: pick(TIMEZONES, i),
                },
                update: {
                    displayName: `${pick(NAMES, i)} (مريض ${i})`,
                    status: client_1.UserStatus.ACTIVE,
                    defaultLocale: i % 3 === 0 ? 'en' : 'ar',
                    timezone: pick(TIMEZONES, i),
                },
            });
            await prisma.userRole.upsert({
                where: { userId_role: { userId, role: client_1.UserRoleType.PATIENT } },
                create: { userId, role: client_1.UserRoleType.PATIENT },
                update: {},
            });
            await prisma.userEmail.upsert({
                where: { email },
                create: {
                    id: uuid(`bulk-patient-email-${i}`),
                    userId,
                    email,
                    isPrimary: true,
                    isVerified: true,
                },
                update: {
                    userId,
                    isPrimary: true,
                    isVerified: true,
                },
            });
            await prisma.userEmail.deleteMany({
                where: {
                    userId,
                    email: {
                        not: email,
                    },
                },
            });
            await prisma.userPhone.upsert({
                where: { phone },
                create: {
                    id: uuid(`bulk-patient-phone-${i}`),
                    userId,
                    phone,
                    isPrimary: true,
                    isVerified: i % 5 !== 0,
                },
                update: {
                    userId,
                    isPrimary: true,
                    isVerified: i % 5 !== 0,
                },
            });
            const existingPassword = await prisma.authIdentity.findFirst({
                where: { userId, provider: client_1.AuthProvider.PASSWORD },
            });
            if (existingPassword) {
                await prisma.authIdentity.update({
                    where: { id: existingPassword.id },
                    data: { passwordHash, isEnabled: true },
                });
            }
            else {
                await prisma.authIdentity.create({
                    data: {
                        id: uuid(`bulk-patient-auth-${i}`),
                        userId,
                        provider: client_1.AuthProvider.PASSWORD,
                        passwordHash,
                        isEnabled: true,
                    },
                });
            }
            await prisma.patientProfile.upsert({
                where: { userId },
                create: {
                    id: profileId,
                    userId,
                    countryId,
                    displayName: `${pick(NAMES, i)} (مريض ${i})`,
                    gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
                    dateOfBirth: new Date(1989 + (i % 12), i % 12, (i % 27) + 1),
                    onboardingCompletedAt: i % 4 === 0 ? null : daysAgo(i % 120),
                },
                update: {
                    countryId,
                    displayName: `${pick(NAMES, i)} (مريض ${i})`,
                    gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
                    dateOfBirth: new Date(1989 + (i % 12), i % 12, (i % 27) + 1),
                    onboardingCompletedAt: i % 4 === 0 ? null : daysAgo(i % 120),
                },
            });
            patientUsers.push({ userId, profileId });
        }
        for (let i = 1; i <= cfg.practitioners; i += 1) {
            const userId = uuid(`bulk-practitioner-user-${i}`);
            const profileId = uuid(`bulk-practitioner-profile-${i}`);
            const email = `practitioner.bulk.${i}@hesba.local`;
            const phone = `+9665${String(1000000 + i).slice(-7)}`;
            const countryId = pick(countries, i + 1).id;
            const primarySpecialty = pick(specialties, i).id;
            const secondarySpecialty = pick(specialties, i + 1).id;
            await prisma.user.upsert({
                where: { id: userId },
                create: {
                    id: userId,
                    displayName: `د. ${pick(NAMES, i)} ${i}`,
                    status: client_1.UserStatus.ACTIVE,
                    defaultLocale: i % 2 === 0 ? 'ar' : 'en',
                    timezone: pick(TIMEZONES, i + 1),
                },
                update: {
                    displayName: `د. ${pick(NAMES, i)} ${i}`,
                    status: client_1.UserStatus.ACTIVE,
                    defaultLocale: i % 2 === 0 ? 'ar' : 'en',
                    timezone: pick(TIMEZONES, i + 1),
                },
            });
            await prisma.userRole.upsert({
                where: { userId_role: { userId, role: client_1.UserRoleType.PRACTITIONER } },
                create: { userId, role: client_1.UserRoleType.PRACTITIONER },
                update: {},
            });
            await prisma.userEmail.upsert({
                where: { email },
                create: {
                    id: uuid(`bulk-practitioner-email-${i}`),
                    userId,
                    email,
                    isPrimary: true,
                    isVerified: true,
                },
                update: {
                    userId,
                    isPrimary: true,
                    isVerified: true,
                },
            });
            await prisma.userEmail.deleteMany({
                where: {
                    userId,
                    email: {
                        not: email,
                    },
                },
            });
            await prisma.userPhone.upsert({
                where: { phone },
                create: {
                    id: uuid(`bulk-practitioner-phone-${i}`),
                    userId,
                    phone,
                    isPrimary: true,
                    isVerified: true,
                },
                update: {
                    userId,
                    isPrimary: true,
                    isVerified: true,
                },
            });
            const existingPassword = await prisma.authIdentity.findFirst({
                where: { userId, provider: client_1.AuthProvider.PASSWORD },
            });
            if (existingPassword) {
                await prisma.authIdentity.update({
                    where: { id: existingPassword.id },
                    data: { passwordHash, isEnabled: true },
                });
            }
            else {
                await prisma.authIdentity.create({
                    data: {
                        id: uuid(`bulk-practitioner-auth-${i}`),
                        userId,
                        provider: client_1.AuthProvider.PASSWORD,
                        passwordHash,
                        isEnabled: true,
                    },
                });
            }
            await prisma.practitionerProfile.upsert({
                where: { userId },
                create: {
                    id: profileId,
                    userId,
                    countryId,
                    practitionerType: pick([
                        client_1.PractitionerType.PSYCHOLOGIST,
                        client_1.PractitionerType.PSYCHIATRIST,
                        client_1.PractitionerType.COUNSELOR,
                        client_1.PractitionerType.NUTRITIONIST,
                    ], i),
                    practitionerGender: i % 2 === 0 ? client_1.PractitionerGender.MALE : client_1.PractitionerGender.FEMALE,
                    publicSlug: `bulk-practitioner-${i}`,
                    professionalTitle: 'أخصائي صحة نفسية وتطوير نمط حياة',
                    bio: `ممارس رقم ${i} يخدم الحالات داخل مصر والوطن العربي.`,
                    yearsOfExperience: 3 + (i % 18),
                    sessionPrice30: money(350, 120, i),
                    sessionPrice60: money(650, 180, i),
                    status: client_1.PractitionerStatus.APPROVED,
                    isPublicProfilePublished: true,
                },
                update: {
                    countryId,
                    practitionerType: pick([
                        client_1.PractitionerType.PSYCHOLOGIST,
                        client_1.PractitionerType.PSYCHIATRIST,
                        client_1.PractitionerType.COUNSELOR,
                        client_1.PractitionerType.NUTRITIONIST,
                    ], i),
                    practitionerGender: i % 2 === 0 ? client_1.PractitionerGender.MALE : client_1.PractitionerGender.FEMALE,
                    publicSlug: `bulk-practitioner-${i}`,
                    professionalTitle: 'أخصائي صحة نفسية وتطوير نمط حياة',
                    bio: `ممارس رقم ${i} يخدم الحالات داخل مصر والوطن العربي.`,
                    yearsOfExperience: 3 + (i % 18),
                    sessionPrice30: money(350, 120, i),
                    sessionPrice60: money(650, 180, i),
                    status: client_1.PractitionerStatus.APPROVED,
                    isPublicProfilePublished: true,
                },
            });
            await prisma.practitionerProfileLanguage.upsert({
                where: {
                    practitionerId_languageId: {
                        practitionerId: profileId,
                        languageId: arLanguageId,
                    },
                },
                create: {
                    practitionerId: profileId,
                    languageId: arLanguageId,
                    isPrimary: true,
                },
                update: { isPrimary: true },
            });
            await prisma.practitionerProfileLanguage.upsert({
                where: {
                    practitionerId_languageId: {
                        practitionerId: profileId,
                        languageId: enLanguageId,
                    },
                },
                create: {
                    practitionerId: profileId,
                    languageId: enLanguageId,
                    isPrimary: false,
                },
                update: { isPrimary: false },
            });
            await prisma.practitionerSpecialty.upsert({
                where: {
                    practitionerId_specialtyId: {
                        practitionerId: profileId,
                        specialtyId: primarySpecialty,
                    },
                },
                create: {
                    practitionerId: profileId,
                    specialtyId: primarySpecialty,
                    isPrimary: true,
                },
                update: { isPrimary: true },
            });
            await prisma.practitionerSpecialty.upsert({
                where: {
                    practitionerId_specialtyId: {
                        practitionerId: profileId,
                        specialtyId: secondarySpecialty,
                    },
                },
                create: {
                    practitionerId: profileId,
                    specialtyId: secondarySpecialty,
                    isPrimary: false,
                },
                update: { isPrimary: false },
            });
            const practitionerTimezone = pick(TIMEZONES, i);
            const weeklyAvailability = BULK_AVAILABILITY_WEEKDAYS.map((weekday) => ({
                id: uuid(`bulk-practitioner-availability-${profileId}-${weekday}`),
                practitionerId: profileId,
                weekday,
                durationMinutes: 30,
                startMinuteOfDay: 10 * 60 + (i % 3) * 60,
                endMinuteOfDay: 18 * 60 + (i % 2) * 30,
                timezone: practitionerTimezone,
                isActive: true,
            }));
            for (const slot of weeklyAvailability) {
                await prisma.availabilitySlot.upsert({
                    where: { id: slot.id },
                    create: slot,
                    update: {
                        practitionerId: slot.practitionerId,
                        weekday: slot.weekday,
                        durationMinutes: slot.durationMinutes,
                        startMinuteOfDay: slot.startMinuteOfDay,
                        endMinuteOfDay: slot.endMinuteOfDay,
                        timezone: slot.timezone,
                        isActive: slot.isActive,
                    },
                });
            }
            practitionerUsers.push({ userId, profileId });
        }
        const sessions = [];
        const financeMap = new Map();
        for (let i = 1; i <= cfg.sessions; i += 1) {
            const sessionId = uuid(`bulk-session-${i}`);
            const patient = pick(patientUsers, i);
            const practitioner = pick(practitionerUsers, i + 7);
            const startAt = hoursAgo((i % 24) + 5);
            const endAt = new Date(startAt.getTime() + 45 * 60 * 1000);
            const status = pick([
                client_1.SessionStatus.COMPLETED,
                client_1.SessionStatus.CONFIRMED,
                client_1.SessionStatus.CANCELLED,
                client_1.SessionStatus.UPCOMING,
                client_1.SessionStatus.READY_TO_JOIN,
                client_1.SessionStatus.IN_PROGRESS,
            ], i);
            const seededSessionCode = `SES-${startAt.getUTCFullYear()}-${String(500000 + i).padStart(6, '0')}`;
            await prisma.session.upsert({
                where: { id: sessionId },
                create: {
                    id: sessionId,
                    sessionCode: seededSessionCode,
                    patientId: patient.profileId,
                    practitionerId: practitioner.profileId,
                    flowType: i % 4 === 0 ? client_1.SessionFlowType.INSTANT : client_1.SessionFlowType.SCHEDULED,
                    sessionMode: pick([client_1.SessionMode.VIDEO, client_1.SessionMode.CHAT, client_1.SessionMode.AUDIO], i),
                    durationMinutes: 45,
                    status,
                    requestedStartAt: startAt,
                    scheduledStartAt: startAt,
                    scheduledEndAt: endAt,
                    joinOpenAt: new Date(startAt.getTime() - 10 * 60 * 1000),
                    completedAt: status === client_1.SessionStatus.COMPLETED ? endAt : null,
                    cancelledAt: status === client_1.SessionStatus.CANCELLED ? endAt : null,
                    timezoneSnapshot: pick(TIMEZONES, i),
                    provider: client_1.SessionProvider.DAILY,
                    providerRoomId: `bulk-room-${i}`,
                    providerSessionRef: `bulk-provider-session-${i}`,
                },
                update: {
                    sessionCode: seededSessionCode,
                    patientId: patient.profileId,
                    practitionerId: practitioner.profileId,
                    status,
                    scheduledStartAt: startAt,
                    scheduledEndAt: endAt,
                    completedAt: status === client_1.SessionStatus.COMPLETED ? endAt : null,
                    cancelledAt: status === client_1.SessionStatus.CANCELLED ? endAt : null,
                    timezoneSnapshot: pick(TIMEZONES, i),
                },
            });
            const paymentId = uuid(`bulk-payment-${i}`);
            const subtotal = Number(money(700, 200, i));
            const discount = i % 5 === 0 ? 50 : 0;
            const total = subtotal - discount;
            const paymentStatus = status === client_1.SessionStatus.CANCELLED
                ? client_1.PaymentStatus.FAILED
                : status === client_1.SessionStatus.COMPLETED || status === client_1.SessionStatus.IN_PROGRESS
                    ? client_1.PaymentStatus.CAPTURED
                    : client_1.PaymentStatus.PENDING;
            await prisma.payment.upsert({
                where: { id: paymentId },
                create: {
                    id: paymentId,
                    sessionId,
                    patientId: patient.profileId,
                    practitionerId: practitioner.profileId,
                    paymentPurpose: client_1.PaymentPurpose.SESSION_BOOKING,
                    provider: pick([client_1.PaymentProvider.PAYMOB, client_1.PaymentProvider.STRIPE], i),
                    status: paymentStatus,
                    amountSubtotal: subtotal.toFixed(2),
                    amountDiscount: discount.toFixed(2),
                    amountTotal: total.toFixed(2),
                    currencyCode: 'EGP',
                    providerPaymentRef: `bulk-payment-ref-${i}`,
                    providerOrderRef: `bulk-order-ref-${i}`,
                    initiatedAt: startAt,
                    capturedAt: paymentStatus === client_1.PaymentStatus.CAPTURED ? startAt : null,
                    failedAt: paymentStatus === client_1.PaymentStatus.FAILED ? startAt : null,
                },
                update: {
                    status: paymentStatus,
                    amountSubtotal: subtotal.toFixed(2),
                    amountDiscount: discount.toFixed(2),
                    amountTotal: total.toFixed(2),
                    capturedAt: paymentStatus === client_1.PaymentStatus.CAPTURED ? startAt : null,
                    failedAt: paymentStatus === client_1.PaymentStatus.FAILED ? startAt : null,
                },
            });
            await prisma.paymentEvent.upsert({
                where: { id: uuid(`bulk-payment-event-${i}`) },
                create: {
                    id: uuid(`bulk-payment-event-${i}`),
                    paymentId,
                    eventType: paymentStatus === client_1.PaymentStatus.CAPTURED
                        ? 'PAYMENT_CAPTURED'
                        : paymentStatus === client_1.PaymentStatus.FAILED
                            ? 'PAYMENT_FAILED'
                            : 'PAYMENT_CREATED',
                    providerEventRef: `bulk-provider-event-${i}`,
                },
                update: {},
            });
            const earnings = Math.max(100, Math.round(total * 0.75));
            const finance = financeMap.get(practitioner.profileId) ?? {
                pending: 0,
                available: 0,
                earned: 0,
            };
            if (paymentStatus === client_1.PaymentStatus.CAPTURED) {
                finance.pending += earnings;
                finance.earned += earnings;
            }
            await prisma.ledgerEntry.upsert({
                where: { id: uuid(`bulk-ledger-${i}`) },
                create: {
                    id: uuid(`bulk-ledger-${i}`),
                    practitionerId: practitioner.profileId,
                    sessionId,
                    paymentId,
                    entryType: paymentStatus === client_1.PaymentStatus.CAPTURED
                        ? client_1.LedgerEntryType.PRACTITIONER_EARNING
                        : client_1.LedgerEntryType.MANUAL_ADJUSTMENT,
                    direction: paymentStatus === client_1.PaymentStatus.CAPTURED
                        ? client_1.LedgerDirection.CREDIT
                        : client_1.LedgerDirection.DEBIT,
                    amount: (paymentStatus === client_1.PaymentStatus.CAPTURED ? earnings : 0).toFixed(2),
                    currencyCode: 'EGP',
                    balanceBucket: client_1.WalletBalanceBucket.PENDING,
                    referenceType: 'PAYMENT',
                    referenceId: paymentId,
                    description: 'Bulk finance seed entry',
                    effectiveAt: startAt,
                },
                update: {
                    amount: (paymentStatus === client_1.PaymentStatus.CAPTURED ? earnings : 0).toFixed(2),
                    effectiveAt: startAt,
                },
            });
            if (i % 9 === 0 && paymentStatus === client_1.PaymentStatus.CAPTURED) {
                const refundAmount = Math.round(total * 0.2);
                await prisma.refund.upsert({
                    where: { id: uuid(`bulk-refund-${i}`) },
                    create: {
                        id: uuid(`bulk-refund-${i}`),
                        paymentId,
                        sessionId,
                        refundType: client_1.RefundType.PARTIAL,
                        status: pick([client_1.RefundStatus.REQUESTED, client_1.RefundStatus.PROCESSING, client_1.RefundStatus.SUCCEEDED], i),
                        refundReason: 'Regional bulk refund scenario',
                        amount: refundAmount.toFixed(2),
                        currencyCode: 'EGP',
                        providerRefundRef: `bulk-refund-ref-${i}`,
                        requestedAt: endAt,
                        processedAt: i % 3 === 0 ? daysAgo(0) : null,
                    },
                    update: {},
                });
                finance.pending = Math.max(0, finance.pending - refundAmount);
            }
            financeMap.set(practitioner.profileId, finance);
            sessions.push({
                id: sessionId,
                patientId: patient.profileId,
                practitionerId: practitioner.profileId,
                status,
                endAt,
            });
        }
        const walletIds = new Map();
        for (const practitioner of practitionerUsers) {
            const finance = financeMap.get(practitioner.profileId) ?? {
                pending: 0,
                available: 0,
                earned: 0,
            };
            finance.available = Math.round(finance.pending * 0.6);
            finance.pending = Math.max(0, finance.pending - finance.available);
            const walletId = uuid(`bulk-wallet-${practitioner.profileId}`);
            walletIds.set(practitioner.profileId, walletId);
            await prisma.practitionerWallet.upsert({
                where: {
                    practitionerId_currencyCode: {
                        practitionerId: practitioner.profileId,
                        currencyCode: 'EGP',
                    },
                },
                create: {
                    id: walletId,
                    practitionerId: practitioner.profileId,
                    currencyCode: 'EGP',
                    availableBalance: finance.available.toFixed(2),
                    pendingBalance: finance.pending.toFixed(2),
                    reservedBalance: '0.00',
                    lifetimeEarned: finance.earned.toFixed(2),
                    lifetimePaidOut: Math.round(finance.available * 0.4).toFixed(2),
                    lastLedgerEntryAt: new Date(),
                },
                update: {
                    availableBalance: finance.available.toFixed(2),
                    pendingBalance: finance.pending.toFixed(2),
                    lifetimeEarned: finance.earned.toFixed(2),
                    lifetimePaidOut: Math.round(finance.available * 0.4).toFixed(2),
                    lastLedgerEntryAt: new Date(),
                },
            });
        }
        for (let monthOffset = 0; monthOffset < 6; monthOffset += 1) {
            const date = new Date();
            date.setMonth(date.getMonth() - monthOffset);
            const batchId = uuid(`bulk-settlement-batch-${monthOffset}`);
            await prisma.settlementBatch.upsert({
                where: {
                    periodYear_periodMonth_currencyCode: {
                        periodYear: date.getFullYear(),
                        periodMonth: date.getMonth() + 1,
                        currencyCode: 'EGP',
                    },
                },
                create: {
                    id: batchId,
                    periodYear: date.getFullYear(),
                    periodMonth: date.getMonth() + 1,
                    currencyCode: 'EGP',
                    status: monthOffset === 0
                        ? client_1.SettlementBatchStatus.PROCESSING
                        : client_1.SettlementBatchStatus.COMPLETED,
                    slug: `bulk-egp-${date.getFullYear()}-${date.getMonth() + 1}`,
                    generatedAt: daysAgo(monthOffset * 30 + 2),
                    finalizedAt: monthOffset === 0 ? null : daysAgo(monthOffset * 30),
                },
                update: {
                    status: monthOffset === 0
                        ? client_1.SettlementBatchStatus.PROCESSING
                        : client_1.SettlementBatchStatus.COMPLETED,
                    generatedAt: daysAgo(monthOffset * 30 + 2),
                    finalizedAt: monthOffset === 0 ? null : daysAgo(monthOffset * 30),
                },
            });
            for (let i = 0; i < practitionerUsers.length; i += 1) {
                if ((i + monthOffset) % 3 !== 0) {
                    continue;
                }
                const practitioner = practitionerUsers[i];
                const gross = Number(money(1200, 280, i + monthOffset));
                const adj = i % 7 === 0 ? -50 : 0;
                const net = gross + adj;
                await prisma.practitionerSettlement.upsert({
                    where: {
                        batchId_practitionerId: {
                            batchId,
                            practitionerId: practitioner.profileId,
                        },
                    },
                    create: {
                        id: uuid(`bulk-practitioner-settlement-${monthOffset}-${i}`),
                        batchId,
                        practitionerId: practitioner.profileId,
                        walletId: walletIds.get(practitioner.profileId) ?? null,
                        amountGross: gross.toFixed(2),
                        amountAdjustments: adj.toFixed(2),
                        amountNet: net.toFixed(2),
                        currencyCode: 'EGP',
                        status: monthOffset === 0
                            ? client_1.PractitionerSettlementStatus.PROCESSING
                            : client_1.PractitionerSettlementStatus.PAID,
                        paidAt: monthOffset === 0 ? null : daysAgo(monthOffset * 30 - 1),
                    },
                    update: {
                        amountGross: gross.toFixed(2),
                        amountAdjustments: adj.toFixed(2),
                        amountNet: net.toFixed(2),
                        status: monthOffset === 0
                            ? client_1.PractitionerSettlementStatus.PROCESSING
                            : client_1.PractitionerSettlementStatus.PAID,
                        paidAt: monthOffset === 0 ? null : daysAgo(monthOffset * 30 - 1),
                    },
                });
            }
        }
        const completedSessions = sessions.filter((s) => s.status === client_1.SessionStatus.COMPLETED);
        for (let i = 0; i < completedSessions.length; i += 1) {
            const session = completedSessions[i];
            const reviewStatus = i % 13 === 0
                ? client_1.SessionReviewStatus.HIDDEN
                : i % 17 === 0
                    ? client_1.SessionReviewStatus.REJECTED
                    : client_1.SessionReviewStatus.PUBLISHED;
            await prisma.sessionReview.upsert({
                where: { sessionId: session.id },
                create: {
                    id: uuid(`bulk-review-${session.id}`),
                    sessionId: session.id,
                    patientId: session.patientId,
                    practitionerId: session.practitionerId,
                    ratingValue: (i % 5) + 1,
                    reviewTitle: `تقييم جلسة ${i + 1}`,
                    reviewText: `تقييم واقعي للجلسة ${i + 1} لاختبار النظام.`,
                    reviewStatus,
                    submittedAt: session.endAt,
                    publishedAt: reviewStatus === client_1.SessionReviewStatus.PUBLISHED ? session.endAt : null,
                    hiddenAt: reviewStatus === client_1.SessionReviewStatus.HIDDEN ? session.endAt : null,
                    isAnonymous: i % 4 === 0,
                },
                update: {
                    ratingValue: (i % 5) + 1,
                    reviewStatus,
                    submittedAt: session.endAt,
                    publishedAt: reviewStatus === client_1.SessionReviewStatus.PUBLISHED ? session.endAt : null,
                    hiddenAt: reviewStatus === client_1.SessionReviewStatus.HIDDEN ? session.endAt : null,
                },
            });
        }
        for (const slug of ['mental-health', 'relationships', 'nutrition', 'sleep']) {
            const categoryId = uuid(`bulk-article-category-${slug}`);
            await prisma.articleCategory.upsert({
                where: { slugRoot: slug },
                create: { id: categoryId, slugRoot: slug, isActive: true },
                update: { isActive: true },
            });
            await prisma.articleCategoryTranslation.upsert({
                where: {
                    articleCategoryId_locale: {
                        articleCategoryId: categoryId,
                        locale: client_1.ContentLocale.ar,
                    },
                },
                create: {
                    articleCategoryId: categoryId,
                    locale: client_1.ContentLocale.ar,
                    title: `تصنيف ${slug}`,
                    slug: `${slug}-ar`,
                },
                update: {},
            });
            await prisma.articleCategoryTranslation.upsert({
                where: {
                    articleCategoryId_locale: {
                        articleCategoryId: categoryId,
                        locale: client_1.ContentLocale.en,
                    },
                },
                create: {
                    articleCategoryId: categoryId,
                    locale: client_1.ContentLocale.en,
                    title: slug,
                    slug: `${slug}-en`,
                },
                update: {},
            });
        }
        const articleCategoryIds = (await prisma.articleCategory.findMany({
            where: { slugRoot: { in: ['mental-health', 'relationships', 'nutrition', 'sleep'] } },
            select: { id: true },
        })).map((c) => c.id);
        for (let i = 1; i <= cfg.articles; i += 1) {
            const articleId = uuid(`bulk-article-${i}`);
            const practitioner = pick(practitionerUsers, i);
            const categoryId = pick(articleCategoryIds, i);
            const status = i % 8 === 0 ? client_1.ArticleStatus.DRAFT : client_1.ArticleStatus.PUBLISHED;
            const visibility = i % 9 === 0 ? client_1.ArticleVisibility.UNLISTED : client_1.ArticleVisibility.PUBLIC;
            const publishedAt = status === client_1.ArticleStatus.PUBLISHED ? daysAgo(i % 200) : null;
            await prisma.article.upsert({
                where: { id: articleId },
                create: {
                    id: articleId,
                    authorUserId: practitioner.userId,
                    authorPractitionerId: practitioner.profileId,
                    primaryCategoryId: categoryId,
                    status,
                    visibility,
                    publishedAt,
                    approvedAt: publishedAt,
                },
                update: {
                    authorUserId: practitioner.userId,
                    authorPractitionerId: practitioner.profileId,
                    primaryCategoryId: categoryId,
                    status,
                    visibility,
                    publishedAt,
                    approvedAt: publishedAt,
                },
            });
            await prisma.articleTranslation.upsert({
                where: { articleId_locale: { articleId, locale: client_1.ContentLocale.ar } },
                create: {
                    articleId,
                    locale: client_1.ContentLocale.ar,
                    title: `مقالة رقم ${i}`,
                    excerpt: `ملخص المقالة ${i}`,
                    contentMarkdown: `## المقالة ${i}\n\nمحتوى تجريبي عربي.`,
                    slug: `bulk-article-${i}-ar`,
                    readingTimeMinutes: 3 + (i % 8),
                },
                update: {
                    title: `مقالة رقم ${i}`,
                    excerpt: `ملخص المقالة ${i}`,
                },
            });
            await prisma.articleTranslation.upsert({
                where: { articleId_locale: { articleId, locale: client_1.ContentLocale.en } },
                create: {
                    articleId,
                    locale: client_1.ContentLocale.en,
                    title: `Article ${i}`,
                    excerpt: `Article excerpt ${i}`,
                    contentMarkdown: `## Article ${i}\n\nEnglish test content.`,
                    slug: `bulk-article-${i}-en`,
                    readingTimeMinutes: 3 + (i % 8),
                },
                update: {
                    title: `Article ${i}`,
                    excerpt: `Article excerpt ${i}`,
                },
            });
            await prisma.articleCategoryAssignment.upsert({
                where: {
                    articleId_articleCategoryId: {
                        articleId,
                        articleCategoryId: categoryId,
                    },
                },
                create: {
                    articleId,
                    articleCategoryId: categoryId,
                    isPrimary: true,
                },
                update: { isPrimary: true },
            });
        }
        const supportUser = await prisma.user.findFirst({
            where: { roles: { some: { role: client_1.UserRoleType.SUPPORT } } },
            select: { id: true },
        });
        const supportUserId = supportUser?.id ?? patientUsers[0].userId;
        for (let i = 1; i <= cfg.conversations; i += 1) {
            const conversationId = uuid(`bulk-conversation-${i}`);
            const patient = pick(patientUsers, i);
            const practitioner = pick(practitionerUsers, i + 9);
            const supportConv = i % 3 === 0;
            await prisma.conversation.upsert({
                where: { id: conversationId },
                create: {
                    id: conversationId,
                    conversationType: supportConv
                        ? client_1.ConversationType.SUPPORT
                        : client_1.ConversationType.CARE_APPROVED,
                    status: i % 10 === 0 ? client_1.ConversationStatus.CLOSED : client_1.ConversationStatus.OPEN,
                    patientId: patient.profileId,
                    practitionerId: practitioner.profileId,
                    sessionId: pick(sessions, i).id,
                    conversationRef: `bulk-conv-${i}`,
                    startedAt: daysAgo(i % 120),
                },
                update: {
                    status: i % 10 === 0 ? client_1.ConversationStatus.CLOSED : client_1.ConversationStatus.OPEN,
                    patientId: patient.profileId,
                    practitionerId: practitioner.profileId,
                    sessionId: pick(sessions, i).id,
                },
            });
            await prisma.conversationParticipant.upsert({
                where: { id: uuid(`bulk-conversation-participant-p-${i}`) },
                create: {
                    id: uuid(`bulk-conversation-participant-p-${i}`),
                    conversationId,
                    userId: patient.userId,
                    participantRole: client_1.ConversationParticipantRole.PATIENT,
                    isActive: true,
                },
                update: {
                    conversationId,
                    userId: patient.userId,
                    participantRole: client_1.ConversationParticipantRole.PATIENT,
                    isActive: true,
                },
            });
            await prisma.conversationParticipant.upsert({
                where: { id: uuid(`bulk-conversation-participant-r-${i}`) },
                create: {
                    id: uuid(`bulk-conversation-participant-r-${i}`),
                    conversationId,
                    userId: practitioner.userId,
                    participantRole: client_1.ConversationParticipantRole.PRACTITIONER,
                    isActive: true,
                },
                update: {
                    conversationId,
                    userId: practitioner.userId,
                    participantRole: client_1.ConversationParticipantRole.PRACTITIONER,
                    isActive: true,
                },
            });
            if (supportConv) {
                await prisma.conversationParticipant.upsert({
                    where: { id: uuid(`bulk-conversation-participant-s-${i}`) },
                    create: {
                        id: uuid(`bulk-conversation-participant-s-${i}`),
                        conversationId,
                        userId: supportUserId,
                        participantRole: client_1.ConversationParticipantRole.SUPPORT_AGENT,
                        isActive: true,
                    },
                    update: {
                        conversationId,
                        userId: supportUserId,
                        participantRole: client_1.ConversationParticipantRole.SUPPORT_AGENT,
                        isActive: true,
                    },
                });
            }
            let latestMessageAt = null;
            for (let m = 1; m <= cfg.messagesPerConversation; m += 1) {
                const sentAt = hoursAgo(i + m);
                latestMessageAt = sentAt;
                await prisma.message.upsert({
                    where: { id: uuid(`bulk-message-${i}-${m}`) },
                    create: {
                        id: uuid(`bulk-message-${i}-${m}`),
                        conversationId,
                        senderUserId: m % 2 === 0 ? patient.userId : practitioner.userId,
                        messageType: client_1.MessageType.TEXT,
                        status: client_1.MessageStatus.SENT,
                        visibility: client_1.MessageVisibility.NORMAL,
                        contentText: `رسالة ${m} في محادثة ${i}`,
                        sentAt,
                    },
                    update: {
                        senderUserId: m % 2 === 0 ? patient.userId : practitioner.userId,
                        contentText: `رسالة ${m} في محادثة ${i}`,
                        sentAt,
                    },
                });
            }
            if (supportConv) {
                const ticketId = uuid(`bulk-support-ticket-${i}`);
                await prisma.supportTicket.upsert({
                    where: { conversationId },
                    create: {
                        id: ticketId,
                        openedByUserId: patient.userId,
                        createdByRole: client_1.ConversationParticipantRole.PATIENT,
                        patientId: patient.profileId,
                        practitionerId: practitioner.profileId,
                        conversationId,
                        ticketType: pick([
                            client_1.SupportTicketType.BOOKING,
                            client_1.SupportTicketType.PAYMENT,
                            client_1.SupportTicketType.TECHNICAL,
                            client_1.SupportTicketType.GENERAL,
                        ], i),
                        status: pick([client_1.SupportTicketStatus.OPEN, client_1.SupportTicketStatus.IN_PROGRESS, client_1.SupportTicketStatus.RESOLVED], i),
                        priority: pick([client_1.SupportTicketPriority.NORMAL, client_1.SupportTicketPriority.MEDIUM, client_1.SupportTicketPriority.HIGH], i),
                        subject: `Support ticket ${i}`,
                        description: `Seed support scenario ${i}`,
                        assignedToUserId: supportUserId,
                        publicTicketRef: `SUP-${String(10000 + i)}`,
                        relatedSessionId: pick(sessions, i).id,
                        lastMessageAt: latestMessageAt,
                    },
                    update: {
                        status: pick([client_1.SupportTicketStatus.OPEN, client_1.SupportTicketStatus.IN_PROGRESS, client_1.SupportTicketStatus.RESOLVED], i),
                        priority: pick([client_1.SupportTicketPriority.NORMAL, client_1.SupportTicketPriority.MEDIUM, client_1.SupportTicketPriority.HIGH], i),
                        assignedToUserId: supportUserId,
                        relatedSessionId: pick(sessions, i).id,
                        lastMessageAt: latestMessageAt,
                    },
                });
                await prisma.supportTicketEvent.upsert({
                    where: { id: uuid(`bulk-support-ticket-event-${i}`) },
                    create: {
                        id: uuid(`bulk-support-ticket-event-${i}`),
                        supportTicketId: ticketId,
                        eventType: client_1.SupportTicketEventType.TICKET_CREATED,
                        actorUserId: patient.userId,
                        actorRole: client_1.ConversationParticipantRole.PATIENT,
                    },
                    update: {},
                });
            }
        }
        for (let i = 1; i <= Math.min(cfg.conversations, 240); i += 1) {
            const reportId = uuid(`bulk-moderation-report-${i}`);
            await prisma.moderationReport.upsert({
                where: { id: reportId },
                create: {
                    id: reportId,
                    targetType: pick([
                        client_1.ModerationReportTargetType.SUPPORT_TICKET,
                        client_1.ModerationReportTargetType.SUPPORT_MESSAGE,
                        client_1.ModerationReportTargetType.CARE_CHAT_MESSAGE,
                        client_1.ModerationReportTargetType.REVIEW,
                        client_1.ModerationReportTargetType.ARTICLE,
                    ], i),
                    targetId: uuid(`bulk-target-${i}`),
                    reason: pick([
                        client_1.ModerationReportReason.SPAM,
                        client_1.ModerationReportReason.HARASSMENT,
                        client_1.ModerationReportReason.INAPPROPRIATE_CONTENT,
                        client_1.ModerationReportReason.OTHER,
                    ], i),
                    status: pick([client_1.ModerationCaseStatus.OPEN, client_1.ModerationCaseStatus.UNDER_REVIEW, client_1.ModerationCaseStatus.RESOLVED], i),
                    reportedByUserId: pick(patientUsers, i).userId,
                    reportedByRole: client_1.ModerationReporterRole.PATIENT,
                    note: `Seed moderation report ${i}`,
                },
                update: {
                    status: pick([client_1.ModerationCaseStatus.OPEN, client_1.ModerationCaseStatus.UNDER_REVIEW, client_1.ModerationCaseStatus.RESOLVED], i),
                },
            });
            await prisma.moderationReportAuditEvent.upsert({
                where: { id: uuid(`bulk-moderation-audit-${i}`) },
                create: {
                    id: uuid(`bulk-moderation-audit-${i}`),
                    moderationReportId: reportId,
                    eventType: client_1.ModerationAuditEventType.REPORT_CREATED,
                    actorUserId: pick(patientUsers, i).userId,
                    actorRole: client_1.ModerationReporterRole.PATIENT,
                },
                update: {},
            });
            if (i % 4 === 0) {
                await prisma.moderationReportAction.upsert({
                    where: { id: uuid(`bulk-moderation-action-${i}`) },
                    create: {
                        id: uuid(`bulk-moderation-action-${i}`),
                        moderationReportId: reportId,
                        actionType: client_1.ModerationCaseActionType.REVIEW_CASE,
                        previousStatus: client_1.ModerationCaseStatus.OPEN,
                        nextStatus: client_1.ModerationCaseStatus.UNDER_REVIEW,
                        actedByUserId: supportUserId,
                        actedByRole: client_1.ModerationReporterRole.SUPPORT_AGENT,
                    },
                    update: {},
                });
            }
        }
        const notificationTypes = await prisma.notificationType.findMany({
            select: { id: true, supportsInApp: true, supportsEmail: true, supportsSms: true },
            take: 12,
        });
        const usersForNotifications = [...patientUsers, ...practitionerUsers];
        for (let i = 0; i < usersForNotifications.length; i += 1) {
            const user = usersForNotifications[i];
            for (let n = 1; n <= cfg.notificationsPerUser; n += 1) {
                const type = pick(notificationTypes, i + n);
                const channel = type.supportsInApp
                    ? client_1.NotificationChannel.IN_APP
                    : type.supportsEmail
                        ? client_1.NotificationChannel.EMAIL
                        : type.supportsSms
                            ? client_1.NotificationChannel.SMS
                            : client_1.NotificationChannel.IN_APP;
                await prisma.notification.upsert({
                    where: { id: uuid(`bulk-notification-${user.userId}-${n}`) },
                    create: {
                        id: uuid(`bulk-notification-${user.userId}-${n}`),
                        userId: user.userId,
                        notificationTypeId: type.id,
                        channel,
                        status: pick([client_1.NotificationStatus.SENT, client_1.NotificationStatus.DELIVERED, client_1.NotificationStatus.READ, client_1.NotificationStatus.FAILED], n),
                        locale: i % 2 === 0 ? 'ar' : 'en',
                        titleSnapshot: `Notification ${n}`,
                        bodySnapshot: `Seed notification ${n} for pagination`,
                        payloadJson: { seed: true, index: n },
                        sentAt: daysAgo(n % 40),
                        createdAt: daysAgo(n % 40),
                    },
                    update: {
                        status: pick([client_1.NotificationStatus.SENT, client_1.NotificationStatus.DELIVERED, client_1.NotificationStatus.READ, client_1.NotificationStatus.FAILED], n),
                        titleSnapshot: `Notification ${n}`,
                        bodySnapshot: `Seed notification ${n} for pagination`,
                    },
                });
            }
        }
        const definitions = await prisma.assessmentDefinition.findMany({
            where: { isPublished: true },
            include: { questions: { include: { options: true }, orderBy: { order: 'asc' } } },
        });
        for (let i = 1; i <= Math.min(patientUsers.length, 120); i += 1) {
            const patient = pick(patientUsers, i);
            const definition = pick(definitions, i);
            if (!definition || definition.questions.length === 0) {
                continue;
            }
            const submissionId = uuid(`bulk-assessment-submission-${i}`);
            await prisma.assessmentSubmission.upsert({
                where: { id: submissionId },
                create: {
                    id: submissionId,
                    assessmentDefinitionId: definition.id,
                    patientProfileId: patient.profileId,
                    status: client_1.AssessmentSubmissionStatus.COMPLETED,
                    startedAt: daysAgo(i % 30),
                    completedAt: daysAgo(i % 30),
                    totalScore: 8,
                    resultBand: client_1.AssessmentResultBand.MODERATE,
                    resultSummary: 'Seed assessment summary',
                    definitionVersionSnapshot: definition.version,
                    definitionSlugSnapshot: definition.slug,
                    definitionTitleSnapshot: definition.title,
                },
                update: {
                    status: client_1.AssessmentSubmissionStatus.COMPLETED,
                    completedAt: daysAgo(i % 30),
                },
            });
        }
        for (let i = 1; i <= Math.min(patientUsers.length, 120); i += 1) {
            const matchingId = uuid(`bulk-matching-${i}`);
            await prisma.matchingSession.upsert({
                where: { id: matchingId },
                create: {
                    id: matchingId,
                    patientProfileId: pick(patientUsers, i).profileId,
                    status: client_1.MatchingSessionStatus.COMPLETED,
                    startedAt: daysAgo(i % 40),
                    completedAt: daysAgo(i % 40),
                },
                update: {
                    status: client_1.MatchingSessionStatus.COMPLETED,
                    completedAt: daysAgo(i % 40),
                },
            });
            await prisma.matchingAnswer.upsert({
                where: {
                    matchingSessionId_key: {
                        matchingSessionId: matchingId,
                        key: client_1.MatchingAnswerKey.PRIMARY_CONCERN,
                    },
                },
                create: {
                    id: uuid(`bulk-matching-answer-${i}`),
                    matchingSessionId: matchingId,
                    key: client_1.MatchingAnswerKey.PRIMARY_CONCERN,
                    valueJson: { value: 'anxiety' },
                },
                update: {
                    valueJson: { value: 'anxiety' },
                },
            });
        }
        for (let i = 1; i <= cfg.courses; i += 1) {
            const instructor = pick(practitionerUsers, i);
            const instructorId = uuid(`bulk-instructor-${i}`);
            await prisma.trainingInstructor.upsert({
                where: { id: instructorId },
                create: {
                    id: instructorId,
                    userId: instructor.userId,
                    practitionerId: instructor.profileId,
                    instructorType: 'PRACTITIONER',
                    status: 'ACTIVE',
                    displayName: `Trainer ${i}`,
                },
                update: {
                    userId: instructor.userId,
                    practitionerId: instructor.profileId,
                    displayName: `Trainer ${i}`,
                },
            });
            const categoryId = uuid(`bulk-course-category-${(i % 5) + 1}`);
            await prisma.courseCategory.upsert({
                where: { slugRoot: `bulk-course-category-${(i % 5) + 1}` },
                create: {
                    id: categoryId,
                    slugRoot: `bulk-course-category-${(i % 5) + 1}`,
                    isActive: true,
                },
                update: { isActive: true },
            });
            const courseId = uuid(`bulk-course-${i}`);
            await prisma.course.upsert({
                where: { slugRoot: `bulk-course-${i}` },
                create: {
                    id: courseId,
                    primaryCategoryId: categoryId,
                    primaryInstructorId: instructorId,
                    slugRoot: `bulk-course-${i}`,
                    courseType: client_1.CourseType.LIVE_COURSE,
                    deliveryMode: client_1.CourseDeliveryMode.EXTERNAL_LIVE_ROOM,
                    status: client_1.CourseStatus.PUBLISHED,
                    visibility: client_1.CourseVisibility.PUBLIC,
                    priceAmount: money(350, 100, i),
                    currencyCode: 'EGP',
                    publishedAt: daysAgo(i % 90),
                },
                update: {
                    status: client_1.CourseStatus.PUBLISHED,
                    visibility: client_1.CourseVisibility.PUBLIC,
                    priceAmount: money(350, 100, i),
                    currencyCode: 'EGP',
                    publishedAt: daysAgo(i % 90),
                },
            });
            const scheduleId = uuid(`bulk-course-schedule-${i}`);
            const scheduleStartsAt = daysFromNow((i % 30) + 3);
            const scheduleEndsAt = addDays(scheduleStartsAt, 13);
            const enrollmentOpenAt = daysAgo((i % 7) + 2);
            const enrollmentCloseAt = daysFromNow(1);
            await prisma.courseSchedule.upsert({
                where: { scheduleCode: `BULK-SCH-${i}` },
                create: {
                    id: scheduleId,
                    courseId,
                    scheduleCode: `BULK-SCH-${i}`,
                    status: client_1.CourseScheduleStatus.OPEN_FOR_ENROLLMENT,
                    createdByUserId: supportUserId,
                    plannedDurationDays: 14,
                    plannedLectureCount: 4,
                    enrollmentOpenAt,
                    enrollmentCloseAt,
                    startsAt: scheduleStartsAt,
                    endsAt: scheduleEndsAt,
                    timezone: pick(TIMEZONES, i),
                    externalRoomProvider: 'ZOOM',
                    externalRoomJoinUrl: `https://meet.example.com/bulk-course-${i}`,
                    externalRoomHostUrl: `https://host.example.com/bulk-course-${i}`,
                },
                update: {
                    status: client_1.CourseScheduleStatus.OPEN_FOR_ENROLLMENT,
                    createdByUserId: supportUserId,
                    plannedDurationDays: 14,
                    plannedLectureCount: 4,
                    enrollmentOpenAt,
                    enrollmentCloseAt,
                    startsAt: scheduleStartsAt,
                    endsAt: scheduleEndsAt,
                    timezone: pick(TIMEZONES, i),
                    externalRoomProvider: 'ZOOM',
                    externalRoomJoinUrl: `https://meet.example.com/bulk-course-${i}`,
                    externalRoomHostUrl: `https://host.example.com/bulk-course-${i}`,
                },
            });
            const lectureOffsets = [0, 3, 7, 10];
            for (let lectureIndex = 0; lectureIndex < lectureOffsets.length; lectureIndex += 1) {
                const sessionOrder = lectureIndex + 1;
                const lectureStart = addDays(scheduleStartsAt, lectureOffsets[lectureIndex]);
                const lectureEnd = addHours(lectureStart, 2);
                await prisma.courseSession.upsert({
                    where: {
                        courseScheduleId_sessionOrder: {
                            courseScheduleId: scheduleId,
                            sessionOrder,
                        },
                    },
                    create: {
                        id: uuid(`bulk-course-session-${i}-${sessionOrder}`),
                        courseScheduleId: scheduleId,
                        createdByUserId: supportUserId,
                        sessionTitle: `Lecture ${sessionOrder}`,
                        sessionOrder,
                        startsAt: lectureStart,
                        endsAt: lectureEnd,
                        attendanceTrackingEnabled: true,
                        isMandatory: true,
                        externalRoomProvider: 'ZOOM',
                        externalRoomJoinUrl: `https://meet.example.com/bulk-course-${i}/lecture-${sessionOrder}`,
                        externalRoomHostUrl: `https://host.example.com/bulk-course-${i}/lecture-${sessionOrder}`,
                    },
                    update: {
                        createdByUserId: supportUserId,
                        sessionTitle: `Lecture ${sessionOrder}`,
                        startsAt: lectureStart,
                        endsAt: lectureEnd,
                        attendanceTrackingEnabled: true,
                        isMandatory: true,
                        externalRoomProvider: 'ZOOM',
                        externalRoomJoinUrl: `https://meet.example.com/bulk-course-${i}/lecture-${sessionOrder}`,
                        externalRoomHostUrl: `https://host.example.com/bulk-course-${i}/lecture-${sessionOrder}`,
                    },
                });
            }
            for (let e = 1; e <= 5; e += 1) {
                const user = pick(patientUsers, i * 7 + e);
                const enrollmentId = uuid(`bulk-enrollment-${i}-${e}`);
                const enrollmentStatus = pick([client_1.EnrollmentStatus.ACTIVE, client_1.EnrollmentStatus.COMPLETED, client_1.EnrollmentStatus.CANCELLED], e);
                const paymentStatus = e % 4 === 0 ? 'PENDING' : 'CAPTURED';
                await prisma.enrollment.upsert({
                    where: { id: enrollmentId },
                    create: {
                        id: enrollmentId,
                        courseId,
                        courseScheduleId: scheduleId,
                        userId: user.userId,
                        enrollmentStatus,
                        paymentStatus,
                        attendanceStatus: pick([
                            client_1.EnrollmentAttendanceStatus.NOT_STARTED,
                            client_1.EnrollmentAttendanceStatus.PARTIALLY_ATTENDED,
                            client_1.EnrollmentAttendanceStatus.ATTENDED,
                        ], e),
                        enrolledAt: daysAgo(i + e),
                    },
                    update: {
                        courseId,
                        courseScheduleId: scheduleId,
                        userId: user.userId,
                        enrollmentStatus,
                        paymentStatus,
                    },
                });
            }
            await prisma.courseApproval.upsert({
                where: { id: uuid(`bulk-course-approval-${i}`) },
                create: {
                    id: uuid(`bulk-course-approval-${i}`),
                    courseId,
                    reviewedByUserId: supportUserId,
                    decision: client_1.CourseReviewDecision.APPROVED,
                    reviewNote: 'Seed-approved course',
                },
                update: {},
            });
        }
    },
};
//# sourceMappingURL=regional-bulk.seed.js.map
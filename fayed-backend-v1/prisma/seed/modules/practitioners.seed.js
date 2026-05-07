"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.practitionersSeedModule = void 0;
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const seed_constants_1 = require("../shared/seed.constants");
const seed_utils_1 = require("../shared/seed.utils");
function deterministicUuid(seed) {
    const hash = (0, crypto_1.createHash)('md5').update(seed).digest('hex');
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
exports.practitionersSeedModule = {
    name: 'practitioners',
    async run(prisma) {
        const profiles = [
            {
                id: seed_constants_1.seedIds.practitionerProfiles.practitionerA,
                userId: seed_constants_1.seedIds.users.practitionerA,
                countryId: seed_constants_1.seedIds.countries.egypt,
                practitionerType: client_1.PractitionerType.PSYCHOLOGIST,
                publicSlug: 'dr-ahmed-mohamed',
                professionalTitle: 'أخصائي نفسي إكلينيكي',
                bio: 'أخصائي نفسي بخبرة عملية في علاج القلق واضطرابات المزاج.',
                yearsOfExperience: 8,
                sessionPrice30: '300',
                sessionPrice60: '550',
                status: client_1.PractitionerStatus.PENDING_REVIEW,
                isPublicProfilePublished: false,
            },
            {
                id: seed_constants_1.seedIds.practitionerProfiles.practitionerB,
                userId: seed_constants_1.seedIds.users.practitionerB,
                countryId: seed_constants_1.seedIds.countries.saudiArabia,
                practitionerType: client_1.PractitionerType.PSYCHIATRIST,
                publicSlug: 'dr-mohamed-mahmoud',
                professionalTitle: 'استشاري طب نفسي',
                bio: 'استشاري طب نفسي بخبرة طويلة في التشخيص وخطط العلاج المتكاملة.',
                yearsOfExperience: 14,
                sessionPrice30: '420',
                sessionPrice60: '760',
                status: client_1.PractitionerStatus.APPROVED,
                isPublicProfilePublished: true,
            },
            {
                id: seed_constants_1.seedIds.practitionerProfiles.practitionerC,
                userId: seed_constants_1.seedIds.users.practitionerC,
                countryId: seed_constants_1.seedIds.countries.uae,
                practitionerType: client_1.PractitionerType.NUTRITIONIST,
                publicSlug: 'dr-mahmoud-ali',
                professionalTitle: 'أخصائي تغذية علاجية',
                bio: 'أخصائي تغذية علاجية يركز على إدارة الأكل العاطفي وتعديل السلوك الغذائي.',
                yearsOfExperience: 6,
                sessionPrice30: '260',
                sessionPrice60: '480',
                status: client_1.PractitionerStatus.REJECTED,
                isPublicProfilePublished: false,
            },
            {
                id: seed_constants_1.seedIds.practitionerProfiles.practitionerD,
                userId: seed_constants_1.seedIds.users.practitionerD,
                countryId: seed_constants_1.seedIds.countries.kuwait,
                practitionerType: client_1.PractitionerType.COUNSELOR,
                publicSlug: 'dr-abdelfattah-ali',
                professionalTitle: 'مرشد أسري ونفسي',
                bio: 'مرشد أسري متخصص في حل النزاعات الزوجية وتحسين التواصل داخل الأسرة.',
                yearsOfExperience: 7,
                sessionPrice30: '280',
                sessionPrice60: '520',
                status: client_1.PractitionerStatus.PENDING_REVIEW,
                isPublicProfilePublished: false,
            },
            {
                id: seed_constants_1.seedIds.practitionerProfiles.practitionerE,
                userId: seed_constants_1.seedIds.users.practitionerE,
                countryId: seed_constants_1.seedIds.countries.egypt,
                practitionerType: client_1.PractitionerType.PSYCHOLOGIST,
                publicSlug: 'dr-youssef-abdallah',
                professionalTitle: 'معالج القلق والضغوط',
                bio: 'معالج نفسي يقدّم برامج عملية للتعامل مع القلق والضغط النفسي اليومي.',
                yearsOfExperience: 10,
                sessionPrice30: '350',
                sessionPrice60: '650',
                status: client_1.PractitionerStatus.APPROVED,
                isPublicProfilePublished: true,
            },
            {
                id: seed_constants_1.seedIds.practitionerProfiles.practitionerF,
                userId: seed_constants_1.seedIds.users.practitionerF,
                countryId: seed_constants_1.seedIds.countries.saudiArabia,
                practitionerType: client_1.PractitionerType.PSYCHOLOGIST,
                publicSlug: 'dr-karim-hassan',
                professionalTitle: 'معالج الاكتئاب',
                bio: 'معالج نفسي يركز على التعافي من الاكتئاب وخطط الوقاية من الانتكاس.',
                yearsOfExperience: 11,
                sessionPrice30: '390',
                sessionPrice60: '720',
                status: client_1.PractitionerStatus.APPROVED,
                isPublicProfilePublished: true,
            },
            {
                id: seed_constants_1.seedIds.practitionerProfiles.practitionerG,
                userId: seed_constants_1.seedIds.users.practitionerG,
                countryId: seed_constants_1.seedIds.countries.uae,
                practitionerType: client_1.PractitionerType.WEIGHT_LOSS_SPECIALIST,
                publicSlug: 'dr-sara-khaled',
                professionalTitle: 'أخصائية رياضة وتأهيل',
                bio: 'أخصائية تأهيل رياضي لتحسين اللياقة والتعافي بعد الإصابات الرياضية.',
                yearsOfExperience: 9,
                sessionPrice30: '320',
                sessionPrice60: '580',
                status: client_1.PractitionerStatus.APPROVED,
                isPublicProfilePublished: true,
            },
            {
                id: seed_constants_1.seedIds.practitionerProfiles.practitionerH,
                userId: seed_constants_1.seedIds.users.practitionerH,
                countryId: seed_constants_1.seedIds.countries.kuwait,
                practitionerType: client_1.PractitionerType.WEIGHT_LOSS_SPECIALIST,
                publicSlug: 'dr-nour-hani',
                professionalTitle: 'أخصائية أداء رياضي',
                bio: 'أخصائية برامج أداء رياضي لتحسين القوة والتحمل والجاهزية البدنية.',
                yearsOfExperience: 12,
                sessionPrice30: '360',
                sessionPrice60: '680',
                status: client_1.PractitionerStatus.APPROVED,
                isPublicProfilePublished: true,
            },
            {
                id: seed_constants_1.seedIds.practitionerProfiles.practitionerI,
                userId: seed_constants_1.seedIds.users.practitionerI,
                countryId: seed_constants_1.seedIds.countries.qatar,
                practitionerType: client_1.PractitionerType.PSYCHOLOGIST,
                publicSlug: 'dr-mariam-ashraf',
                professionalTitle: 'أخصائية نفسية أطفال ومراهقين',
                bio: 'تقدّم جلسات نفسية مخصصة للأطفال والمراهقين بأساليب علمية حديثة.',
                yearsOfExperience: 13,
                sessionPrice30: '410',
                sessionPrice60: '760',
                status: client_1.PractitionerStatus.APPROVED,
                isPublicProfilePublished: true,
            },
            {
                id: seed_constants_1.seedIds.practitionerProfiles.practitionerJ,
                userId: seed_constants_1.seedIds.users.practitionerJ,
                countryId: seed_constants_1.seedIds.countries.egypt,
                practitionerType: client_1.PractitionerType.PSYCHOLOGIST,
                publicSlug: 'dr-hassan-tarek',
                professionalTitle: 'أخصائي نفسي متكامل',
                bio: 'أخصائي نفسي شامل يدعم القلق والاكتئاب مع برامج تعديل نمط الحياة.',
                yearsOfExperience: 15,
                sessionPrice30: '430',
                sessionPrice60: '790',
                status: client_1.PractitionerStatus.APPROVED,
                isPublicProfilePublished: true,
            },
        ];
        for (const profile of profiles) {
            await prisma.practitionerProfile.upsert({
                where: { userId: profile.userId },
                create: profile,
                update: {
                    countryId: profile.countryId,
                    practitionerType: profile.practitionerType,
                    publicSlug: profile.publicSlug,
                    professionalTitle: profile.professionalTitle,
                    bio: profile.bio,
                    yearsOfExperience: profile.yearsOfExperience,
                    sessionPrice30: profile.sessionPrice30,
                    sessionPrice60: profile.sessionPrice60,
                    status: profile.status,
                    isPublicProfilePublished: profile.isPublicProfilePublished,
                },
            });
        }
        const profileLanguages = [
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerA,
                languageId: seed_constants_1.seedIds.languages.arabic,
                isPrimary: true,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerA,
                languageId: seed_constants_1.seedIds.languages.english,
                isPrimary: false,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerB,
                languageId: seed_constants_1.seedIds.languages.english,
                isPrimary: true,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerC,
                languageId: seed_constants_1.seedIds.languages.arabic,
                isPrimary: true,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerD,
                languageId: seed_constants_1.seedIds.languages.arabic,
                isPrimary: true,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerE,
                languageId: seed_constants_1.seedIds.languages.arabic,
                isPrimary: true,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerE,
                languageId: seed_constants_1.seedIds.languages.english,
                isPrimary: false,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerF,
                languageId: seed_constants_1.seedIds.languages.english,
                isPrimary: true,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerG,
                languageId: seed_constants_1.seedIds.languages.english,
                isPrimary: true,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerG,
                languageId: seed_constants_1.seedIds.languages.arabic,
                isPrimary: false,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerH,
                languageId: seed_constants_1.seedIds.languages.arabic,
                isPrimary: true,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerI,
                languageId: seed_constants_1.seedIds.languages.english,
                isPrimary: true,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerI,
                languageId: seed_constants_1.seedIds.languages.arabic,
                isPrimary: false,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerJ,
                languageId: seed_constants_1.seedIds.languages.arabic,
                isPrimary: true,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerJ,
                languageId: seed_constants_1.seedIds.languages.english,
                isPrimary: false,
            },
        ];
        for (const link of profileLanguages) {
            await prisma.practitionerProfileLanguage.upsert({
                where: {
                    practitionerId_languageId: {
                        practitionerId: link.practitionerId,
                        languageId: link.languageId,
                    },
                },
                create: link,
                update: {
                    isPrimary: link.isPrimary,
                },
            });
        }
        const practitionerSpecialties = [
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerA,
                specialtyId: seed_constants_1.seedIds.specialties.anxiety,
                isPrimary: true,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerA,
                specialtyId: seed_constants_1.seedIds.specialties.depression,
                isPrimary: false,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerB,
                specialtyId: seed_constants_1.seedIds.specialties.familyCounseling,
                isPrimary: true,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerC,
                specialtyId: seed_constants_1.seedIds.specialties.nutrition,
                isPrimary: true,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerC,
                specialtyId: seed_constants_1.seedIds.specialties.emotionalEating,
                isPrimary: false,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerD,
                specialtyId: seed_constants_1.seedIds.specialties.childPsychology,
                isPrimary: true,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerE,
                specialtyId: seed_constants_1.seedIds.specialties.anxiety,
                isPrimary: true,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerE,
                specialtyId: seed_constants_1.seedIds.specialties.weightManagement,
                isPrimary: false,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerF,
                specialtyId: seed_constants_1.seedIds.specialties.depression,
                isPrimary: true,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerG,
                specialtyId: seed_constants_1.seedIds.specialties.sportsInjuryRehab,
                isPrimary: true,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerG,
                specialtyId: seed_constants_1.seedIds.specialties.athleticPerformance,
                isPrimary: false,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerH,
                specialtyId: seed_constants_1.seedIds.specialties.athleticPerformance,
                isPrimary: true,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerH,
                specialtyId: seed_constants_1.seedIds.specialties.sportsInjuryRehab,
                isPrimary: false,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerI,
                specialtyId: seed_constants_1.seedIds.specialties.childPsychology,
                isPrimary: true,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerI,
                specialtyId: seed_constants_1.seedIds.specialties.anxiety,
                isPrimary: false,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerJ,
                specialtyId: seed_constants_1.seedIds.specialties.depression,
                isPrimary: true,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerJ,
                specialtyId: seed_constants_1.seedIds.specialties.weightManagement,
                isPrimary: false,
            },
        ];
        await prisma.practitionerSpecialty.deleteMany({
            where: {
                practitionerId: {
                    in: Object.values(seed_constants_1.seedIds.practitionerProfiles),
                },
            },
        });
        for (const link of practitionerSpecialties) {
            await prisma.practitionerSpecialty.create({
                data: link,
            });
        }
        const weeklyAvailability = [];
        const weekdays = [
            client_1.AvailabilityWeekday.SUNDAY,
            client_1.AvailabilityWeekday.MONDAY,
            client_1.AvailabilityWeekday.TUESDAY,
            client_1.AvailabilityWeekday.WEDNESDAY,
            client_1.AvailabilityWeekday.THURSDAY,
        ];
        const practitionerIds = Object.values(seed_constants_1.seedIds.practitionerProfiles);
        for (let i = 0; i < practitionerIds.length; i += 1) {
            const practitionerId = practitionerIds[i];
            const timezone = i % 3 === 0 ? 'Africa/Cairo' : i % 3 === 1 ? 'Asia/Riyadh' : 'Asia/Dubai';
            for (const weekday of weekdays) {
                weeklyAvailability.push({
                    id: deterministicUuid(`avail-${practitionerId}-${weekday}-${10 * 60 + (i % 3) * 60}`),
                    practitionerId,
                    weekday,
                    startMinuteOfDay: 10 * 60 + (i % 3) * 60,
                    endMinuteOfDay: 18 * 60 + (i % 2) * 30,
                    timezone,
                    isActive: true,
                });
            }
        }
        for (const slot of weeklyAvailability) {
            await prisma.availabilitySlot.upsert({
                where: { id: slot.id },
                create: slot,
                update: {
                    practitionerId: slot.practitionerId,
                    weekday: slot.weekday,
                    startMinuteOfDay: slot.startMinuteOfDay,
                    endMinuteOfDay: slot.endMinuteOfDay,
                    timezone: slot.timezone,
                    isActive: slot.isActive,
                },
            });
        }
        for (let i = 0; i < practitionerIds.length; i += 1) {
            const practitionerId = practitionerIds[i];
            await prisma.practitionerPresence.upsert({
                where: { practitionerId },
                create: {
                    practitionerId,
                    status: i % 2 === 0 ? client_1.PresenceStatus.ONLINE : client_1.PresenceStatus.AWAY,
                    isInstantBookingEnabled: i % 3 !== 0,
                    lastSeenAtUtc: new Date(),
                    lastHeartbeatAtUtc: new Date(),
                },
                update: {
                    status: i % 2 === 0 ? client_1.PresenceStatus.ONLINE : client_1.PresenceStatus.AWAY,
                    isInstantBookingEnabled: i % 3 !== 0,
                    lastSeenAtUtc: new Date(),
                    lastHeartbeatAtUtc: new Date(),
                },
            });
        }
        const credentials = [
            {
                id: seed_constants_1.seedIds.credentials.aLicense,
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerA,
                credentialType: client_1.CredentialType.LICENSE,
                fileUrl: 'https://files.local/practitioner-a-license.pdf',
                reviewStatus: client_1.CredentialReviewStatus.PENDING,
                expiresAt: (0, seed_utils_1.daysFromNow)(365),
            },
            {
                id: seed_constants_1.seedIds.credentials.aDegree,
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerA,
                credentialType: client_1.CredentialType.DEGREE,
                fileUrl: 'https://files.local/practitioner-a-degree.pdf',
                reviewStatus: client_1.CredentialReviewStatus.APPROVED,
                expiresAt: null,
            },
            {
                id: seed_constants_1.seedIds.credentials.bLicense,
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerB,
                credentialType: client_1.CredentialType.LICENSE,
                fileUrl: 'https://files.local/practitioner-b-license.pdf',
                reviewStatus: client_1.CredentialReviewStatus.APPROVED,
                expiresAt: (0, seed_utils_1.daysFromNow)(540),
            },
            {
                id: seed_constants_1.seedIds.credentials.cLicense,
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerC,
                credentialType: client_1.CredentialType.CERTIFICATION,
                fileUrl: 'https://files.local/practitioner-c-certification.pdf',
                reviewStatus: client_1.CredentialReviewStatus.REJECTED,
                expiresAt: null,
            },
            {
                id: seed_constants_1.seedIds.credentials.dLicense,
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerD,
                credentialType: client_1.CredentialType.LICENSE,
                fileUrl: 'https://files.local/practitioner-d-license.pdf',
                reviewStatus: client_1.CredentialReviewStatus.PENDING,
                expiresAt: (0, seed_utils_1.daysFromNow)(400),
            },
            {
                id: seed_constants_1.seedIds.credentials.eLicense,
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerE,
                credentialType: client_1.CredentialType.LICENSE,
                fileUrl: 'https://files.local/practitioner-e-license.pdf',
                reviewStatus: client_1.CredentialReviewStatus.APPROVED,
                expiresAt: (0, seed_utils_1.daysFromNow)(480),
            },
            {
                id: seed_constants_1.seedIds.credentials.fLicense,
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerF,
                credentialType: client_1.CredentialType.CERTIFICATION,
                fileUrl: 'https://files.local/practitioner-f-certification.pdf',
                reviewStatus: client_1.CredentialReviewStatus.APPROVED,
                expiresAt: (0, seed_utils_1.daysFromNow)(365),
            },
            {
                id: seed_constants_1.seedIds.credentials.gLicense,
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerG,
                credentialType: client_1.CredentialType.DEGREE,
                fileUrl: 'https://files.local/practitioner-g-degree.pdf',
                reviewStatus: client_1.CredentialReviewStatus.APPROVED,
                expiresAt: null,
            },
            {
                id: seed_constants_1.seedIds.credentials.hLicense,
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerH,
                credentialType: client_1.CredentialType.LICENSE,
                fileUrl: 'https://files.local/practitioner-h-license.pdf',
                reviewStatus: client_1.CredentialReviewStatus.APPROVED,
                expiresAt: (0, seed_utils_1.daysFromNow)(365),
            },
            {
                id: seed_constants_1.seedIds.credentials.iLicense,
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerI,
                credentialType: client_1.CredentialType.CERTIFICATION,
                fileUrl: 'https://files.local/practitioner-i-certification.pdf',
                reviewStatus: client_1.CredentialReviewStatus.APPROVED,
                expiresAt: (0, seed_utils_1.daysFromNow)(365),
            },
            {
                id: seed_constants_1.seedIds.credentials.jLicense,
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerJ,
                credentialType: client_1.CredentialType.LICENSE,
                fileUrl: 'https://files.local/practitioner-j-license.pdf',
                reviewStatus: client_1.CredentialReviewStatus.APPROVED,
                expiresAt: (0, seed_utils_1.daysFromNow)(365),
            },
        ];
        for (const credential of credentials) {
            await prisma.practitionerCredential.upsert({
                where: { id: credential.id },
                create: credential,
                update: {
                    credentialType: credential.credentialType,
                    fileUrl: credential.fileUrl,
                    reviewStatus: credential.reviewStatus,
                    expiresAt: credential.expiresAt,
                },
            });
        }
        const applications = [
            {
                id: seed_constants_1.seedIds.practitionerApplications.practitionerA,
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerA,
                status: client_1.PractitionerApplicationStatus.SUBMITTED,
                submittedAt: (0, seed_utils_1.daysAgo)(3),
                reviewedAt: null,
                reviewNotes: null,
            },
            {
                id: seed_constants_1.seedIds.practitionerApplications.practitionerB,
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerB,
                status: client_1.PractitionerApplicationStatus.APPROVED,
                submittedAt: (0, seed_utils_1.daysAgo)(28),
                reviewedAt: (0, seed_utils_1.daysAgo)(20),
                reviewNotes: 'Application approved after full verification.',
            },
            {
                id: seed_constants_1.seedIds.practitionerApplications.practitionerC,
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerC,
                status: client_1.PractitionerApplicationStatus.REJECTED,
                submittedAt: (0, seed_utils_1.daysAgo)(15),
                reviewedAt: (0, seed_utils_1.daysAgo)(8),
                reviewNotes: 'Reason: Missing updated certification documents.',
            },
            {
                id: seed_constants_1.seedIds.practitionerApplications.practitionerD,
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerD,
                status: client_1.PractitionerApplicationStatus.UNDER_REVIEW,
                submittedAt: (0, seed_utils_1.daysAgo)(2),
                reviewedAt: null,
                reviewNotes: null,
            },
            {
                id: seed_constants_1.seedIds.practitionerApplications.practitionerE,
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerE,
                status: client_1.PractitionerApplicationStatus.APPROVED,
                submittedAt: (0, seed_utils_1.daysAgo)(35),
                reviewedAt: (0, seed_utils_1.daysAgo)(27),
                reviewNotes: 'Approved with complete profile and credentials.',
            },
            {
                id: seed_constants_1.seedIds.practitionerApplications.practitionerF,
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerF,
                status: client_1.PractitionerApplicationStatus.APPROVED,
                submittedAt: (0, seed_utils_1.daysAgo)(22),
                reviewedAt: (0, seed_utils_1.daysAgo)(17),
                reviewNotes: 'Approved after readiness review.',
            },
            {
                id: seed_constants_1.seedIds.practitionerApplications.practitionerG,
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerG,
                status: client_1.PractitionerApplicationStatus.APPROVED,
                submittedAt: (0, seed_utils_1.daysAgo)(19),
                reviewedAt: (0, seed_utils_1.daysAgo)(14),
                reviewNotes: 'Approved and cleared for public listing.',
            },
            {
                id: seed_constants_1.seedIds.practitionerApplications.practitionerH,
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerH,
                status: client_1.PractitionerApplicationStatus.APPROVED,
                submittedAt: (0, seed_utils_1.daysAgo)(26),
                reviewedAt: (0, seed_utils_1.daysAgo)(18),
                reviewNotes: 'Approved after family-counseling scope verification.',
            },
            {
                id: seed_constants_1.seedIds.practitionerApplications.practitionerI,
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerI,
                status: client_1.PractitionerApplicationStatus.APPROVED,
                submittedAt: (0, seed_utils_1.daysAgo)(31),
                reviewedAt: (0, seed_utils_1.daysAgo)(23),
                reviewNotes: 'Approved with child-psychology credentials validated.',
            },
            {
                id: seed_constants_1.seedIds.practitionerApplications.practitionerJ,
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerJ,
                status: client_1.PractitionerApplicationStatus.APPROVED,
                submittedAt: (0, seed_utils_1.daysAgo)(40),
                reviewedAt: (0, seed_utils_1.daysAgo)(30),
                reviewNotes: 'Approved as senior integrated practitioner.',
            },
        ];
        for (const application of applications) {
            await prisma.practitionerApplication.upsert({
                where: { id: application.id },
                create: application,
                update: {
                    status: application.status,
                    submittedAt: application.submittedAt,
                    reviewedAt: application.reviewedAt,
                    reviewNotes: application.reviewNotes,
                },
            });
        }
        const ratingSummaries = [
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerB,
                totalReviews: 126,
                publishedReviewsCount: 118,
                averageRating: 4.8,
                rating1Count: 2,
                rating2Count: 4,
                rating3Count: 8,
                rating4Count: 36,
                rating5Count: 76,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerE,
                totalReviews: 84,
                publishedReviewsCount: 80,
                averageRating: 4.7,
                rating1Count: 1,
                rating2Count: 2,
                rating3Count: 7,
                rating4Count: 25,
                rating5Count: 49,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerF,
                totalReviews: 95,
                publishedReviewsCount: 90,
                averageRating: 4.6,
                rating1Count: 3,
                rating2Count: 5,
                rating3Count: 10,
                rating4Count: 31,
                rating5Count: 46,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerG,
                totalReviews: 72,
                publishedReviewsCount: 68,
                averageRating: 4.5,
                rating1Count: 2,
                rating2Count: 4,
                rating3Count: 12,
                rating4Count: 24,
                rating5Count: 30,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerH,
                totalReviews: 111,
                publishedReviewsCount: 103,
                averageRating: 4.9,
                rating1Count: 1,
                rating2Count: 1,
                rating3Count: 6,
                rating4Count: 24,
                rating5Count: 79,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerI,
                totalReviews: 90,
                publishedReviewsCount: 86,
                averageRating: 4.8,
                rating1Count: 1,
                rating2Count: 2,
                rating3Count: 9,
                rating4Count: 28,
                rating5Count: 50,
            },
            {
                practitionerId: seed_constants_1.seedIds.practitionerProfiles.practitionerJ,
                totalReviews: 134,
                publishedReviewsCount: 127,
                averageRating: 4.9,
                rating1Count: 1,
                rating2Count: 3,
                rating3Count: 7,
                rating4Count: 35,
                rating5Count: 88,
            },
        ];
        for (const summary of ratingSummaries) {
            await prisma.practitionerRatingSummary.upsert({
                where: { practitionerId: summary.practitionerId },
                create: summary,
                update: {
                    totalReviews: summary.totalReviews,
                    publishedReviewsCount: summary.publishedReviewsCount,
                    averageRating: summary.averageRating,
                    rating1Count: summary.rating1Count,
                    rating2Count: summary.rating2Count,
                    rating3Count: summary.rating3Count,
                    rating4Count: summary.rating4Count,
                    rating5Count: summary.rating5Count,
                    lastReviewAt: new Date(),
                },
            });
        }
    },
};
//# sourceMappingURL=practitioners.seed.js.map
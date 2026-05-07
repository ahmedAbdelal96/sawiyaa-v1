"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersSeedModule = void 0;
const client_1 = require("@prisma/client");
const seed_constants_1 = require("../shared/seed.constants");
exports.usersSeedModule = {
    name: 'users',
    async run(prisma) {
        const users = [
            {
                id: seed_constants_1.seedIds.users.superAdmin,
                displayName: 'مدير النظام',
                status: client_1.UserStatus.ACTIVE,
                defaultLocale: 'ar',
                timezone: 'Africa/Cairo',
            },
            {
                id: seed_constants_1.seedIds.users.supportAgent,
                displayName: 'وكيل الدعم',
                status: client_1.UserStatus.ACTIVE,
                defaultLocale: 'ar',
                timezone: 'Africa/Cairo',
            },
            {
                id: seed_constants_1.seedIds.users.contentReviewer,
                displayName: 'مراجع المحتوى',
                status: client_1.UserStatus.ACTIVE,
                defaultLocale: 'ar',
                timezone: 'Asia/Riyadh',
            },
            {
                id: seed_constants_1.seedIds.users.patientA,
                displayName: 'أحمد محمود',
                status: client_1.UserStatus.ACTIVE,
                defaultLocale: 'ar',
                timezone: 'Africa/Cairo',
            },
            {
                id: seed_constants_1.seedIds.users.patientB,
                displayName: 'محمد عبد الفتاح',
                status: client_1.UserStatus.ACTIVE,
                defaultLocale: 'ar',
                timezone: 'Asia/Dubai',
            },
            {
                id: seed_constants_1.seedIds.users.practitionerA,
                displayName: 'د. أحمد محمد',
                status: client_1.UserStatus.ACTIVE,
                defaultLocale: 'ar',
                timezone: 'Africa/Cairo',
            },
            {
                id: seed_constants_1.seedIds.users.practitionerB,
                displayName: 'د. محمد محمود',
                status: client_1.UserStatus.ACTIVE,
                defaultLocale: 'ar',
                timezone: 'Asia/Riyadh',
            },
            {
                id: seed_constants_1.seedIds.users.practitionerC,
                displayName: 'د. عبد الفتاح علي',
                status: client_1.UserStatus.ACTIVE,
                defaultLocale: 'ar',
                timezone: 'Asia/Dubai',
            },
            {
                id: seed_constants_1.seedIds.users.practitionerD,
                displayName: 'د. محمود السيد',
                status: client_1.UserStatus.ACTIVE,
                defaultLocale: 'ar',
                timezone: 'Asia/Kuwait',
            },
            {
                id: seed_constants_1.seedIds.users.practitionerE,
                displayName: 'د. يوسف عبد الله',
                status: client_1.UserStatus.ACTIVE,
                defaultLocale: 'ar',
                timezone: 'Africa/Cairo',
            },
            {
                id: seed_constants_1.seedIds.users.practitionerF,
                displayName: 'د. كريم حسن',
                status: client_1.UserStatus.ACTIVE,
                defaultLocale: 'ar',
                timezone: 'Asia/Riyadh',
            },
            {
                id: seed_constants_1.seedIds.users.practitionerG,
                displayName: 'د. سارة خالد',
                status: client_1.UserStatus.ACTIVE,
                defaultLocale: 'ar',
                timezone: 'Asia/Dubai',
            },
            {
                id: seed_constants_1.seedIds.users.practitionerH,
                displayName: 'د. نور هاني',
                status: client_1.UserStatus.ACTIVE,
                defaultLocale: 'ar',
                timezone: 'Asia/Kuwait',
            },
            {
                id: seed_constants_1.seedIds.users.practitionerI,
                displayName: 'د. مريم أشرف',
                status: client_1.UserStatus.ACTIVE,
                defaultLocale: 'ar',
                timezone: 'Asia/Qatar',
            },
            {
                id: seed_constants_1.seedIds.users.practitionerJ,
                displayName: 'د. حسن طارق',
                status: client_1.UserStatus.ACTIVE,
                defaultLocale: 'ar',
                timezone: 'Africa/Cairo',
            },
        ];
        for (const user of users) {
            await prisma.user.upsert({
                where: { id: user.id },
                create: user,
                update: {
                    displayName: user.displayName,
                    status: user.status,
                    defaultLocale: user.defaultLocale,
                    timezone: user.timezone,
                },
            });
        }
        const rolePairs = [
            { userId: seed_constants_1.seedIds.users.superAdmin, role: client_1.UserRoleType.SUPER_ADMIN },
            { userId: seed_constants_1.seedIds.users.supportAgent, role: client_1.UserRoleType.SUPPORT },
            {
                userId: seed_constants_1.seedIds.users.contentReviewer,
                role: client_1.UserRoleType.CONTENT_REVIEWER,
            },
            { userId: seed_constants_1.seedIds.users.patientA, role: client_1.UserRoleType.PATIENT },
            { userId: seed_constants_1.seedIds.users.patientB, role: client_1.UserRoleType.PATIENT },
            { userId: seed_constants_1.seedIds.users.practitionerA, role: client_1.UserRoleType.PRACTITIONER },
            { userId: seed_constants_1.seedIds.users.practitionerB, role: client_1.UserRoleType.PRACTITIONER },
            { userId: seed_constants_1.seedIds.users.practitionerC, role: client_1.UserRoleType.PRACTITIONER },
            { userId: seed_constants_1.seedIds.users.practitionerD, role: client_1.UserRoleType.PRACTITIONER },
            { userId: seed_constants_1.seedIds.users.practitionerE, role: client_1.UserRoleType.PRACTITIONER },
            { userId: seed_constants_1.seedIds.users.practitionerF, role: client_1.UserRoleType.PRACTITIONER },
            { userId: seed_constants_1.seedIds.users.practitionerG, role: client_1.UserRoleType.PRACTITIONER },
            { userId: seed_constants_1.seedIds.users.practitionerH, role: client_1.UserRoleType.PRACTITIONER },
            { userId: seed_constants_1.seedIds.users.practitionerI, role: client_1.UserRoleType.PRACTITIONER },
            { userId: seed_constants_1.seedIds.users.practitionerJ, role: client_1.UserRoleType.PRACTITIONER },
        ];
        for (const rolePair of rolePairs) {
            await prisma.userRole.upsert({
                where: {
                    userId_role: {
                        userId: rolePair.userId,
                        role: rolePair.role,
                    },
                },
                create: rolePair,
                update: {},
            });
        }
        const emailSeed = [
            {
                userId: seed_constants_1.seedIds.users.superAdmin,
                email: seed_constants_1.seedCredentials.superAdmin.email,
                isPrimary: true,
                isVerified: true,
            },
            {
                userId: seed_constants_1.seedIds.users.supportAgent,
                email: seed_constants_1.seedCredentials.support.email,
                isPrimary: true,
                isVerified: true,
            },
            {
                userId: seed_constants_1.seedIds.users.contentReviewer,
                email: seed_constants_1.seedCredentials.reviewer.email,
                isPrimary: true,
                isVerified: true,
            },
            {
                userId: seed_constants_1.seedIds.users.patientA,
                email: seed_constants_1.seedCredentials.patientA.email,
                isPrimary: true,
                isVerified: true,
            },
            {
                userId: seed_constants_1.seedIds.users.patientB,
                email: seed_constants_1.seedCredentials.patientB.email,
                isPrimary: true,
                isVerified: true,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerA,
                email: seed_constants_1.seedCredentials.practitionerA.email,
                isPrimary: true,
                isVerified: true,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerB,
                email: seed_constants_1.seedCredentials.practitionerB.email,
                isPrimary: true,
                isVerified: true,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerC,
                email: seed_constants_1.seedCredentials.practitionerC.email,
                isPrimary: true,
                isVerified: true,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerD,
                email: seed_constants_1.seedCredentials.practitionerD.email,
                isPrimary: true,
                isVerified: true,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerE,
                email: seed_constants_1.seedCredentials.practitionerE.email,
                isPrimary: true,
                isVerified: true,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerF,
                email: seed_constants_1.seedCredentials.practitionerF.email,
                isPrimary: true,
                isVerified: true,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerG,
                email: seed_constants_1.seedCredentials.practitionerG.email,
                isPrimary: true,
                isVerified: true,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerH,
                email: seed_constants_1.seedCredentials.practitionerH.email,
                isPrimary: true,
                isVerified: true,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerI,
                email: seed_constants_1.seedCredentials.practitionerI.email,
                isPrimary: true,
                isVerified: true,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerJ,
                email: seed_constants_1.seedCredentials.practitionerJ.email,
                isPrimary: true,
                isVerified: true,
            },
        ];
        await prisma.userEmail.deleteMany({
            where: {
                userId: {
                    in: users.map((user) => user.id),
                },
                email: {
                    notIn: emailSeed.map((email) => email.email),
                },
            },
        });
        for (const email of emailSeed) {
            await prisma.userEmail.upsert({
                where: { email: email.email },
                create: email,
                update: {
                    userId: email.userId,
                    isPrimary: email.isPrimary,
                    isVerified: email.isVerified,
                },
            });
        }
        for (const email of emailSeed) {
            await prisma.userEmail.updateMany({
                where: {
                    userId: email.userId,
                    email: {
                        not: email.email,
                    },
                },
                data: {
                    isPrimary: false,
                },
            });
        }
        const phoneSeed = [
            {
                userId: seed_constants_1.seedIds.users.patientA,
                phone: '+201000000001',
                isPrimary: true,
                isVerified: true,
            },
            {
                userId: seed_constants_1.seedIds.users.patientB,
                phone: '+971500000002',
                isPrimary: true,
                isVerified: false,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerA,
                phone: '+201000000003',
                isPrimary: true,
                isVerified: true,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerB,
                phone: '+966500000004',
                isPrimary: true,
                isVerified: true,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerC,
                phone: '+971500000005',
                isPrimary: true,
                isVerified: true,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerD,
                phone: '+965500000006',
                isPrimary: true,
                isVerified: true,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerE,
                phone: '+201000000007',
                isPrimary: true,
                isVerified: true,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerF,
                phone: '+966500000008',
                isPrimary: true,
                isVerified: true,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerG,
                phone: '+971500000009',
                isPrimary: true,
                isVerified: true,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerH,
                phone: '+965500000010',
                isPrimary: true,
                isVerified: true,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerI,
                phone: '+974500000011',
                isPrimary: true,
                isVerified: true,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerJ,
                phone: '+201000000012',
                isPrimary: true,
                isVerified: true,
            },
        ];
        await prisma.userPhone.deleteMany({
            where: {
                userId: {
                    in: users.map((user) => user.id),
                },
                phone: {
                    notIn: phoneSeed.map((phone) => phone.phone),
                },
            },
        });
        for (const phone of phoneSeed) {
            await prisma.userPhone.upsert({
                where: { phone: phone.phone },
                create: phone,
                update: {
                    userId: phone.userId,
                    isPrimary: phone.isPrimary,
                    isVerified: phone.isVerified,
                },
            });
        }
        for (const phone of phoneSeed) {
            await prisma.userPhone.updateMany({
                where: {
                    userId: phone.userId,
                    phone: {
                        not: phone.phone,
                    },
                },
                data: {
                    isPrimary: false,
                },
            });
        }
    },
};
//# sourceMappingURL=users.seed.js.map
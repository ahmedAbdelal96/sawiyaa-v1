"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authSeedModule = void 0;
const client_1 = require("@prisma/client");
const seed_constants_1 = require("../shared/seed.constants");
const seed_utils_1 = require("../shared/seed.utils");
exports.authSeedModule = {
    name: 'auth',
    async run(prisma) {
        const passwordIdentitySeed = [
            {
                userId: seed_constants_1.seedIds.users.superAdmin,
                password: seed_constants_1.seedCredentials.superAdmin.password,
            },
            {
                userId: seed_constants_1.seedIds.users.supportAgent,
                password: seed_constants_1.seedCredentials.support.password,
            },
            {
                userId: seed_constants_1.seedIds.users.contentReviewer,
                password: seed_constants_1.seedCredentials.reviewer.password,
            },
            {
                userId: seed_constants_1.seedIds.users.patientA,
                password: seed_constants_1.seedCredentials.patientA.password,
            },
            {
                userId: seed_constants_1.seedIds.users.patientB,
                password: seed_constants_1.seedCredentials.patientB.password,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerA,
                password: seed_constants_1.seedCredentials.practitionerA.password,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerB,
                password: seed_constants_1.seedCredentials.practitionerB.password,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerC,
                password: seed_constants_1.seedCredentials.practitionerC.password,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerD,
                password: seed_constants_1.seedCredentials.practitionerD.password,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerE,
                password: seed_constants_1.seedCredentials.practitionerE.password,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerF,
                password: seed_constants_1.seedCredentials.practitionerF.password,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerG,
                password: seed_constants_1.seedCredentials.practitionerG.password,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerH,
                password: seed_constants_1.seedCredentials.practitionerH.password,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerI,
                password: seed_constants_1.seedCredentials.practitionerI.password,
            },
            {
                userId: seed_constants_1.seedIds.users.practitionerJ,
                password: seed_constants_1.seedCredentials.practitionerJ.password,
            },
        ];
        for (const identity of passwordIdentitySeed) {
            const passwordHash = await (0, seed_utils_1.hashPassword)(identity.password);
            const existing = await prisma.authIdentity.findFirst({
                where: {
                    userId: identity.userId,
                    provider: client_1.AuthProvider.PASSWORD,
                },
            });
            if (existing) {
                await prisma.authIdentity.update({
                    where: { id: existing.id },
                    data: {
                        passwordHash,
                        isEnabled: true,
                        lastUsedAt: null,
                    },
                });
            }
            else {
                await prisma.authIdentity.create({
                    data: {
                        userId: identity.userId,
                        provider: client_1.AuthProvider.PASSWORD,
                        passwordHash,
                        isEnabled: true,
                    },
                });
            }
        }
        await prisma.authIdentity.upsert({
            where: {
                provider_providerSubject: {
                    provider: client_1.AuthProvider.GOOGLE,
                    providerSubject: seed_constants_1.seedCredentials.patientB.googleSubject,
                },
            },
            create: {
                userId: seed_constants_1.seedIds.users.patientB,
                provider: client_1.AuthProvider.GOOGLE,
                providerSubject: seed_constants_1.seedCredentials.patientB.googleSubject,
                isEnabled: true,
            },
            update: {
                userId: seed_constants_1.seedIds.users.patientB,
                isEnabled: true,
            },
        });
        const twoFactorUsers = [
            seed_constants_1.seedIds.users.practitionerA,
            seed_constants_1.seedIds.users.practitionerB,
            seed_constants_1.seedIds.users.practitionerC,
            seed_constants_1.seedIds.users.practitionerD,
            seed_constants_1.seedIds.users.practitionerE,
            seed_constants_1.seedIds.users.practitionerF,
            seed_constants_1.seedIds.users.practitionerG,
            seed_constants_1.seedIds.users.practitionerH,
            seed_constants_1.seedIds.users.practitionerI,
            seed_constants_1.seedIds.users.practitionerJ,
        ];
        for (const userId of twoFactorUsers) {
            await prisma.twoFactorSetting.upsert({
                where: { userId },
                create: {
                    userId,
                    isRequired: true,
                    preferredChannel: client_1.OtpChannel.EMAIL,
                    fallbackChannel: client_1.OtpChannel.SMS,
                    enabledAt: new Date(),
                },
                update: {
                    isRequired: true,
                    preferredChannel: client_1.OtpChannel.EMAIL,
                    fallbackChannel: client_1.OtpChannel.SMS,
                    enabledAt: new Date(),
                },
            });
        }
        await prisma.userSession.upsert({
            where: { id: seed_constants_1.seedIds.sessions.adminSession },
            create: {
                id: seed_constants_1.seedIds.sessions.adminSession,
                userId: seed_constants_1.seedIds.users.superAdmin,
                refreshTokenHash: 'seed-hash-admin-refresh-token',
                deviceId: 'seed-admin-browser',
                ipAddress: '127.0.0.1',
                userAgent: 'Seed Agent',
                expiresAt: (0, seed_utils_1.daysFromNow)(30),
            },
            update: {
                revokedAt: null,
                expiresAt: (0, seed_utils_1.daysFromNow)(30),
            },
        });
        await prisma.userSession.upsert({
            where: { id: seed_constants_1.seedIds.sessions.patientSession },
            create: {
                id: seed_constants_1.seedIds.sessions.patientSession,
                userId: seed_constants_1.seedIds.users.patientA,
                refreshTokenHash: 'seed-hash-patient-refresh-token',
                deviceId: 'seed-patient-mobile',
                ipAddress: '127.0.0.1',
                userAgent: 'Seed Mobile',
                expiresAt: (0, seed_utils_1.daysFromNow)(14),
            },
            update: {
                revokedAt: null,
                expiresAt: (0, seed_utils_1.daysFromNow)(14),
            },
        });
    },
};
//# sourceMappingURL=auth.seed.js.map
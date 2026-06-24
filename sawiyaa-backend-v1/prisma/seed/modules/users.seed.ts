import { PrismaClient, UserRoleType, UserStatus } from '@prisma/client';
import { seedCredentials, seedIds } from '../shared/seed.constants';
import { SeedModule } from '../shared/seed.types';

/**
 * Users seed module owns base users and role assignments.
 * It does not create auth identities; that concern stays in auth.seed.ts.
 */
export const usersSeedModule: SeedModule = {
  name: 'users',
  async run(prisma: PrismaClient): Promise<void> {
    const users = [
      {
        id: seedIds.users.superAdmin,
        displayName: 'مدير النظام',
        status: UserStatus.ACTIVE,
        defaultLocale: 'ar',
        timezone: 'Africa/Cairo',
      },
      {
        id: seedIds.users.supportAgent,
        displayName: 'وكيل الدعم',
        status: UserStatus.ACTIVE,
        defaultLocale: 'ar',
        timezone: 'Africa/Cairo',
      },
      {
        id: seedIds.users.contentReviewer,
        displayName: 'مراجع المحتوى',
        status: UserStatus.ACTIVE,
        defaultLocale: 'ar',
        timezone: 'Asia/Riyadh',
      },
      {
        id: seedIds.users.patientA,
        displayName: 'أحمد محمود',
        status: UserStatus.ACTIVE,
        defaultLocale: 'ar',
        timezone: 'Africa/Cairo',
      },
      {
        id: seedIds.users.patientB,
        displayName: 'محمد عبد الفتاح',
        status: UserStatus.ACTIVE,
        defaultLocale: 'ar',
        timezone: 'Asia/Dubai',
      },
      {
        id: seedIds.users.practitionerA,
        displayName: 'د. أحمد محمد',
        status: UserStatus.ACTIVE,
        defaultLocale: 'ar',
        timezone: 'Africa/Cairo',
      },
      {
        id: seedIds.users.practitionerB,
        displayName: 'د. محمد محمود',
        status: UserStatus.ACTIVE,
        defaultLocale: 'ar',
        timezone: 'Asia/Riyadh',
      },
      {
        id: seedIds.users.practitionerC,
        displayName: 'د. عبد الفتاح علي',
        status: UserStatus.ACTIVE,
        defaultLocale: 'ar',
        timezone: 'Asia/Dubai',
      },
      {
        id: seedIds.users.practitionerD,
        displayName: 'د. محمود السيد',
        status: UserStatus.ACTIVE,
        defaultLocale: 'ar',
        timezone: 'Asia/Kuwait',
      },
      {
        id: seedIds.users.practitionerE,
        displayName: 'د. يوسف عبد الله',
        status: UserStatus.ACTIVE,
        defaultLocale: 'ar',
        timezone: 'Africa/Cairo',
      },
      {
        id: seedIds.users.practitionerF,
        displayName: 'د. كريم حسن',
        status: UserStatus.ACTIVE,
        defaultLocale: 'ar',
        timezone: 'Asia/Riyadh',
      },
      {
        id: seedIds.users.practitionerG,
        displayName: 'د. سارة خالد',
        status: UserStatus.ACTIVE,
        defaultLocale: 'ar',
        timezone: 'Asia/Dubai',
      },
      {
        id: seedIds.users.practitionerH,
        displayName: 'د. نور هاني',
        status: UserStatus.ACTIVE,
        defaultLocale: 'ar',
        timezone: 'Asia/Kuwait',
      },
      {
        id: seedIds.users.practitionerI,
        displayName: 'د. مريم أشرف',
        status: UserStatus.ACTIVE,
        defaultLocale: 'ar',
        timezone: 'Asia/Qatar',
      },
      {
        id: seedIds.users.practitionerJ,
        displayName: 'د. حسن طارق',
        status: UserStatus.ACTIVE,
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

    const rolePairs: Array<{ userId: string; role: UserRoleType }> = [
      { userId: seedIds.users.superAdmin, role: UserRoleType.SUPER_ADMIN },
      { userId: seedIds.users.supportAgent, role: UserRoleType.SUPPORT },
      {
        userId: seedIds.users.contentReviewer,
        role: UserRoleType.CONTENT_REVIEWER,
      },
      { userId: seedIds.users.patientA, role: UserRoleType.PATIENT },
      { userId: seedIds.users.patientB, role: UserRoleType.PATIENT },
      { userId: seedIds.users.practitionerA, role: UserRoleType.PRACTITIONER },
      { userId: seedIds.users.practitionerB, role: UserRoleType.PRACTITIONER },
      { userId: seedIds.users.practitionerC, role: UserRoleType.PRACTITIONER },
      { userId: seedIds.users.practitionerD, role: UserRoleType.PRACTITIONER },
      { userId: seedIds.users.practitionerE, role: UserRoleType.PRACTITIONER },
      { userId: seedIds.users.practitionerF, role: UserRoleType.PRACTITIONER },
      { userId: seedIds.users.practitionerG, role: UserRoleType.PRACTITIONER },
      { userId: seedIds.users.practitionerH, role: UserRoleType.PRACTITIONER },
      { userId: seedIds.users.practitionerI, role: UserRoleType.PRACTITIONER },
      { userId: seedIds.users.practitionerJ, role: UserRoleType.PRACTITIONER },
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
        userId: seedIds.users.superAdmin,
        email: seedCredentials.superAdmin.email,
        isPrimary: true,
        isVerified: true,
      },
      {
        userId: seedIds.users.supportAgent,
        email: seedCredentials.support.email,
        isPrimary: true,
        isVerified: true,
      },
      {
        userId: seedIds.users.contentReviewer,
        email: seedCredentials.reviewer.email,
        isPrimary: true,
        isVerified: true,
      },
      {
        userId: seedIds.users.patientA,
        email: seedCredentials.patientA.email,
        isPrimary: true,
        isVerified: true,
      },
      {
        userId: seedIds.users.patientB,
        email: seedCredentials.patientB.email,
        isPrimary: true,
        isVerified: true,
      },
      {
        userId: seedIds.users.practitionerA,
        email: seedCredentials.practitionerA.email,
        isPrimary: true,
        isVerified: true,
      },
      {
        userId: seedIds.users.practitionerB,
        email: seedCredentials.practitionerB.email,
        isPrimary: true,
        isVerified: true,
      },
      {
        userId: seedIds.users.practitionerC,
        email: seedCredentials.practitionerC.email,
        isPrimary: true,
        isVerified: true,
      },
      {
        userId: seedIds.users.practitionerD,
        email: seedCredentials.practitionerD.email,
        isPrimary: true,
        isVerified: true,
      },
      {
        userId: seedIds.users.practitionerE,
        email: seedCredentials.practitionerE.email,
        isPrimary: true,
        isVerified: true,
      },
      {
        userId: seedIds.users.practitionerF,
        email: seedCredentials.practitionerF.email,
        isPrimary: true,
        isVerified: true,
      },
      {
        userId: seedIds.users.practitionerG,
        email: seedCredentials.practitionerG.email,
        isPrimary: true,
        isVerified: true,
      },
      {
        userId: seedIds.users.practitionerH,
        email: seedCredentials.practitionerH.email,
        isPrimary: true,
        isVerified: true,
      },
      {
        userId: seedIds.users.practitionerI,
        email: seedCredentials.practitionerI.email,
        isPrimary: true,
        isVerified: true,
      },
      {
        userId: seedIds.users.practitionerJ,
        email: seedCredentials.practitionerJ.email,
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
        userId: seedIds.users.patientA,
        phone: '+201000000001',
        isPrimary: true,
        isVerified: true,
      },
      {
        userId: seedIds.users.patientB,
        phone: '+971500000002',
        isPrimary: true,
        isVerified: false,
      },
      {
        userId: seedIds.users.practitionerA,
        phone: '+201000000003',
        isPrimary: true,
        isVerified: true,
      },
      {
        userId: seedIds.users.practitionerB,
        phone: '+966500000004',
        isPrimary: true,
        isVerified: true,
      },
      {
        userId: seedIds.users.practitionerC,
        phone: '+971500000005',
        isPrimary: true,
        isVerified: true,
      },
      {
        userId: seedIds.users.practitionerD,
        phone: '+965500000006',
        isPrimary: true,
        isVerified: true,
      },
      {
        userId: seedIds.users.practitionerE,
        phone: '+201000000007',
        isPrimary: true,
        isVerified: true,
      },
      {
        userId: seedIds.users.practitionerF,
        phone: '+966500000008',
        isPrimary: true,
        isVerified: true,
      },
      {
        userId: seedIds.users.practitionerG,
        phone: '+971500000009',
        isPrimary: true,
        isVerified: true,
      },
      {
        userId: seedIds.users.practitionerH,
        phone: '+965500000010',
        isPrimary: true,
        isVerified: true,
      },
      {
        userId: seedIds.users.practitionerI,
        phone: '+974500000011',
        isPrimary: true,
        isVerified: true,
      },
      {
        userId: seedIds.users.practitionerJ,
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

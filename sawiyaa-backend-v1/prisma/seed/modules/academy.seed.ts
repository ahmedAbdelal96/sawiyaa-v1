import {
  AcademyProgramDeliveryMethod,
  AcademyProgramEnrollmentStatus,
  AcademyProgramSessionAttendanceStatus,
  AcademyProgramStatus,
  PaymentStatus,
  PrismaClient,
  UserRoleType,
  UserStatus,
} from '@prisma/client';
import { promises as fs } from 'fs';
import * as path from 'path';
import { seedCredentials, seedIds } from '../shared/seed.constants';
import { SeedModule } from '../shared/seed.types';
import { hashPassword } from '../shared/seed.utils';

/**
 * Small, deterministic Academy operations fixtures for local QA only.
 * It intentionally creates no certificate file because the storage-backed upload
 * flow should be exercised with a real PDF in an environment that has storage.
 */
export const academySeedModule: SeedModule = {
  name: 'academy',
  async run(prisma: PrismaClient): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    const now = new Date();
    const completedStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const completedFirstEnd = new Date(completedStart.getTime() + 90 * 60 * 1000);
    const completedSecondStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const completedSecondEnd = new Date(completedSecondStart.getTime() + 90 * 60 * 1000);
    const completedThirdStart = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const completedThirdEnd = new Date(completedThirdStart.getTime() + 90 * 60 * 1000);
    const upcomingStart = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingEnd = new Date(upcomingStart.getTime() + 90 * 60 * 1000);

    const traineePasswordHash = await hashPassword(seedCredentials.traineeA.password);
    await prisma.user.upsert({
      where: { id: seedIds.users.traineeA },
      create: {
        id: seedIds.users.traineeA,
        displayName: 'Academy Trainee',
        status: UserStatus.ACTIVE,
        defaultLocale: 'en',
        timezone: 'Africa/Cairo',
      },
      update: { displayName: 'Academy Trainee', status: UserStatus.ACTIVE },
    });
    await prisma.userRole.upsert({
      where: { userId_role: { userId: seedIds.users.traineeA, role: UserRoleType.TRAINEE } },
      create: { userId: seedIds.users.traineeA, role: UserRoleType.TRAINEE },
      update: {},
    });
    await prisma.userEmail.upsert({
      where: { email: seedCredentials.traineeA.email },
      create: {
        userId: seedIds.users.traineeA,
        email: seedCredentials.traineeA.email,
        isPrimary: true,
        isVerified: true,
      },
      update: { userId: seedIds.users.traineeA, isPrimary: true, isVerified: true },
    });
    const passwordIdentity = await prisma.authIdentity.findFirst({
      where: { userId: seedIds.users.traineeA, provider: 'PASSWORD' },
    });
    if (passwordIdentity) {
      await prisma.authIdentity.update({
        where: { id: passwordIdentity.id },
        data: { passwordHash: traineePasswordHash, isEnabled: true },
      });
    } else {
      await prisma.authIdentity.create({
        data: {
          userId: seedIds.users.traineeA,
          provider: 'PASSWORD',
          passwordHash: traineePasswordHash,
          isEnabled: true,
        },
      });
    }

    const programs = [
      {
        id: seedIds.academy.completedProgram,
        slug: 'dev-academy-completed',
        titleAr: 'أساسيات التعامل مع الضغط',
        titleEn: 'Foundations of Stress Management',
        descriptionAr: 'برنامج تدريبي مكتمل لاختبار الحضور والشهادات.',
        descriptionEn: 'Completed fixture for attendance and certificate operations.',
        startAt: completedStart,
        endAt: completedSecondEnd,
        registrationOpen: true,
      },
      {
        id: seedIds.academy.upcomingProgram,
        slug: 'dev-academy-upcoming',
        titleAr: 'التواصل الصحي في العمل',
        titleEn: 'Healthy Communication at Work',
        descriptionAr: 'برنامج مستقبلي لاختبار قفل الحضور قبل نهاية المحاضرة.',
        descriptionEn: 'Future fixture for the attendance time guard.',
        startAt: upcomingStart,
        endAt: upcomingEnd,
        registrationOpen: true,
      },
    ] as const;

    for (const program of programs) {
      await prisma.academyProgram.upsert({
        where: { id: program.id },
        create: {
          ...program,
          priceEgp: '150.00',
          priceUsd: '5.00',
          maxSeats: 30,
          status: AcademyProgramStatus.PUBLISHED,
          publishedAt: completedStart,
          createdByUserId: seedIds.users.superAdmin,
        },
        update: {
          ...program,
          priceEgp: '150.00',
          priceUsd: '5.00',
          maxSeats: 30,
          status: AcademyProgramStatus.PUBLISHED,
          registrationOpen: true,
          publishedAt: completedStart,
          createdByUserId: seedIds.users.superAdmin,
        },
      });
    }

    const sessions = [
      {
        id: seedIds.academy.completedSessionOne,
        academyProgramId: seedIds.academy.completedProgram,
        titleAr: 'المحاضرة الأولى',
        titleEn: 'Lecture 1',
        startsAt: completedStart,
        endsAt: completedFirstEnd,
        sortOrder: 1,
      },
      {
        id: seedIds.academy.completedSessionTwo,
        academyProgramId: seedIds.academy.completedProgram,
        titleAr: 'المحاضرة الثانية',
        titleEn: 'Lecture 2',
        startsAt: completedSecondStart,
        endsAt: completedSecondEnd,
        sortOrder: 2,
      },
      {
        id: seedIds.academy.completedSessionThree,
        academyProgramId: seedIds.academy.completedProgram,
        titleAr: 'المحاضرة الثالثة',
        titleEn: 'Lecture 3',
        startsAt: completedThirdStart,
        endsAt: completedThirdEnd,
        sortOrder: 3,
      },
      {
        id: seedIds.academy.upcomingSessionOne,
        academyProgramId: seedIds.academy.upcomingProgram,
        titleAr: 'المحاضرة القادمة',
        titleEn: 'Upcoming lecture',
        startsAt: upcomingStart,
        endsAt: upcomingEnd,
        sortOrder: 1,
      },
    ] as const;

    for (const session of sessions) {
      await prisma.academyProgramSession.upsert({
        where: { id: session.id },
        create: {
          ...session,
          deliveryMethod: AcademyProgramDeliveryMethod.OFFLINE,
          isPublished: true,
          publishedAt: session.startsAt,
          createdByUserId: seedIds.users.superAdmin,
        },
        update: {
          ...session,
          deliveryMethod: AcademyProgramDeliveryMethod.OFFLINE,
          isPublished: true,
          publishedAt: session.startsAt,
          createdByUserId: seedIds.users.superAdmin,
        },
      });
    }

    const learners = [
      {
        id: seedIds.academy.guestLearner,
        userId: null,
        fullName: 'Guest Academy Learner',
        phoneNumber: '+201099999991',
        email: 'guest.academy@hesba.local',
      },
      {
        id: seedIds.academy.traineeLearner,
        userId: seedIds.users.traineeA,
        fullName: 'Academy Trainee',
        phoneNumber: '+201099999992',
        email: seedCredentials.traineeA.email,
      },
    ] as const;

    for (const learner of learners) {
      await prisma.academyLearner.upsert({
        where: { id: learner.id },
        create: { ...learner, countryCode: 'EG', sourceLabel: 'dev-academy-fixture' },
        update: { ...learner, countryCode: 'EG', sourceLabel: 'dev-academy-fixture' },
      });
    }

    const enrollments = [
      {
        id: seedIds.academy.guestEnrollment,
        academyProgramId: seedIds.academy.completedProgram,
        academyLearnerId: seedIds.academy.guestLearner,
        userId: null,
        token: 'dev-academy-guest-enrollment-token',
        paymentStatus: PaymentStatus.CAPTURED,
        amount: '150.00',
        name: 'Guest Academy Learner',
        email: 'guest.academy@hesba.local',
        phone: '+201099999991',
      },
      {
        id: seedIds.academy.traineeCompletedEnrollment,
        academyProgramId: seedIds.academy.completedProgram,
        academyLearnerId: seedIds.academy.traineeLearner,
        userId: seedIds.users.traineeA,
        token: 'dev-academy-trainee-completed-token',
        paymentStatus: PaymentStatus.CAPTURED,
        amount: '150.00',
        name: 'Academy Trainee',
        email: seedCredentials.traineeA.email,
        phone: '+201099999992',
      },
      {
        id: seedIds.academy.traineeUpcomingEnrollment,
        academyProgramId: seedIds.academy.upcomingProgram,
        academyLearnerId: seedIds.academy.traineeLearner,
        userId: seedIds.users.traineeA,
        token: 'dev-academy-trainee-upcoming-token',
        paymentStatus: PaymentStatus.CREATED,
        amount: '150.00',
        name: 'Academy Trainee',
        email: seedCredentials.traineeA.email,
        phone: '+201099999992',
      },
      {
        id: seedIds.academy.guestPendingEnrollment,
        academyProgramId: seedIds.academy.upcomingProgram,
        academyLearnerId: seedIds.academy.guestLearner,
        userId: null,
        token: 'dev-academy-guest-pending-token',
        paymentStatus: PaymentStatus.PENDING,
        amount: '150.00',
        name: 'Guest Academy Learner',
        email: 'guest.academy@hesba.local',
        phone: '+201099999991',
      },
    ] as const;

    for (const enrollment of enrollments) {
      await prisma.academyProgramEnrollment.upsert({
        where: { id: enrollment.id },
        create: {
          id: enrollment.id,
          academyProgramId: enrollment.academyProgramId,
          academyLearnerId: enrollment.academyLearnerId,
          userId: enrollment.userId,
          publicAccessToken: enrollment.token,
          status: enrollment.paymentStatus === PaymentStatus.PENDING
            ? AcademyProgramEnrollmentStatus.PENDING_PAYMENT
            : AcademyProgramEnrollmentStatus.CONFIRMED,
          paymentStatus: enrollment.paymentStatus,
          confirmedAt: enrollment.paymentStatus === PaymentStatus.PENDING ? null : now,
          selectedCurrencyCode: 'EGP',
          selectedAmountSnapshot: enrollment.amount,
          submittedCountry: 'EG',
          contactFullName: enrollment.name,
          contactEmail: enrollment.email,
          contactPhone: enrollment.phone,
          contactCountry: 'EG',
        },
        update: {
          academyProgramId: enrollment.academyProgramId,
          academyLearnerId: enrollment.academyLearnerId,
          userId: enrollment.userId,
          publicAccessToken: enrollment.token,
          status: enrollment.paymentStatus === PaymentStatus.PENDING
            ? AcademyProgramEnrollmentStatus.PENDING_PAYMENT
            : AcademyProgramEnrollmentStatus.CONFIRMED,
          paymentStatus: enrollment.paymentStatus,
          confirmedAt: enrollment.paymentStatus === PaymentStatus.PENDING ? null : now,
          selectedCurrencyCode: 'EGP',
          selectedAmountSnapshot: enrollment.amount,
          submittedCountry: 'EG',
          contactFullName: enrollment.name,
          contactEmail: enrollment.email,
          contactPhone: enrollment.phone,
          contactCountry: 'EG',
        },
      });
    }

    for (const [id, enrollmentId, sessionId, status] of [
      [seedIds.academy.completedSessionOneAttendance, seedIds.academy.traineeCompletedEnrollment, seedIds.academy.completedSessionOne, AcademyProgramSessionAttendanceStatus.PRESENT],
      [seedIds.academy.completedSessionTwoAttendance, seedIds.academy.traineeCompletedEnrollment, seedIds.academy.completedSessionTwo, AcademyProgramSessionAttendanceStatus.ABSENT],
    ] as const) {
      await prisma.academyProgramSessionAttendance.upsert({
        where: {
          academyProgramSessionId_academyProgramEnrollmentId: {
            academyProgramSessionId: sessionId,
            academyProgramEnrollmentId: enrollmentId,
          },
        },
        create: {
          id,
          academyProgramSessionId: sessionId,
          academyProgramEnrollmentId: enrollmentId,
          attendanceStatus: status,
          markedByUserId: seedIds.users.superAdmin,
          markedAt: now,
        },
        update: { attendanceStatus: status, markedByUserId: seedIds.users.superAdmin, markedAt: now },
      });
    }

    const certificatePath = path.resolve(process.cwd(), 'storage', 'academy-certificates', 'dev-certificate.pdf');
    await fs.mkdir(path.dirname(certificatePath), { recursive: true });
    await fs.writeFile(certificatePath, Buffer.from('%PDF-1.4\n% Sawiyaa Academy development fixture\n'));
    await prisma.academyProgramEnrollment.update({
      where: { id: seedIds.academy.traineeCompletedEnrollment },
      data: {
        certificateFileStoragePath: 'academy-certificates/dev-certificate.pdf',
        certificateFileName: 'dev-certificate.pdf',
        certificateUploadedAt: now,
        certificateIssuedAt: now,
        certificateUploadedByUserId: seedIds.users.superAdmin,
      },
    });
  },
};

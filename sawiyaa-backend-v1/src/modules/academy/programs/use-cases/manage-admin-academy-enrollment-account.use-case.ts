import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthProvider, PaymentStatus, Prisma, SecurityAuditOutcome, UserRoleType, UserStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '@common/prisma/prisma.service';
import { HashPasswordUseCase } from '@modules/auth/use-cases/hash-password.use-case';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';

type DbClient = PrismaService | Prisma.TransactionClient;

const PRIVILEGED_ROLES = new Set<UserRoleType>([
  UserRoleType.ADMIN,
  UserRoleType.SUPER_ADMIN,
  UserRoleType.SUPPORT,
  UserRoleType.FINANCE_STAFF,
  UserRoleType.MARKETING_STAFF,
  UserRoleType.PATIENT_OPERATIONS,
  UserRoleType.CONTENT_REVIEWER,
  UserRoleType.PRACTITIONER_REVIEWER,
  UserRoleType.PRACTITIONER,
]);

@Injectable()
export class ManageAdminAcademyEnrollmentAccountUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashPasswordUseCase: HashPasswordUseCase,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async status(enrollmentId: string) {
    const enrollment = await this.loadEnrollment(enrollmentId);
    if (!enrollment) throw new NotFoundException({ messageKey: 'academyProgram.errors.enrollmentNotFound', error: 'ACADEMY_PROGRAM_ENROLLMENT_NOT_FOUND' });
    const account = enrollment.user ?? (enrollment.academyLearner.userId ? await this.prisma.user.findUnique({ where: { id: enrollment.academyLearner.userId }, include: { roles: true, emails: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } } }) : null);
    const accountType = this.accountType(account?.roles.map((role) => role.role) ?? []);
    return {
      account: account ? { type: accountType, name: account.displayName, email: account.emails[0]?.email ?? null } : { type: 'NONE', name: null, email: null },
      canCreate: !account && this.isEligible(enrollment),
      canLink: this.isEligible(enrollment),
    };
  }

  async lookup(input: { enrollmentId: string; email: string }) {
    await this.loadEnrollment(input.enrollmentId);
    const userEmail = await this.findAccountByEmail(input.email);
    const account = userEmail?.user;
    if (!account || !this.isSupportedAccount(account.roles.map((role) => role.role))) {
      throw new NotFoundException({ messageKey: 'academyProgram.errors.accountNotFound', error: 'ACADEMY_ACCOUNT_NOT_FOUND' });
    }
    return { account: { type: this.accountType(account.roles.map((role) => role.role)), name: account.displayName, email: account.emails[0]?.email ?? input.email.trim().toLowerCase() } };
  }

  async create(input: { enrollmentId: string; email: string; actorUserId: string }) {
    const email = this.normalizeEmail(input.email);
    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await this.hashPasswordUseCase.execute(temporaryPassword);
    const result = await this.prisma.$transaction(async (tx) => {
      const enrollment = await this.loadEnrollment(input.enrollmentId, tx);
      this.assertEligible(enrollment);
      if (enrollment.userId && enrollment.user) {
        throw new ConflictException({ messageKey: 'academyProgram.errors.accountAlreadyLinked', error: 'ACADEMY_ACCOUNT_ALREADY_LINKED' });
      }
      const existing = await tx.userEmail.findUnique({ where: { email }, include: { user: { include: { roles: true, emails: true } } } });
      if (existing) {
        throw new ConflictException({ messageKey: 'academyProgram.errors.accountAlreadyExists', error: 'ACADEMY_ACCOUNT_EXISTS', data: { accountType: this.accountType(existing.user.roles.map((role) => role.role)), email } });
      }
      const user = await tx.user.create({
        data: {
          displayName: enrollment.academyLearner.fullName,
          status: UserStatus.ACTIVE,
          emails: { create: { email, isPrimary: true, isVerified: false } },
          authIdentities: { create: { provider: AuthProvider.PASSWORD, passwordHash, isEnabled: true } },
          roles: { create: { role: UserRoleType.TRAINEE } },
        },
        select: { id: true, displayName: true, emails: true },
      });
      await tx.academyLearner.update({ where: { id: enrollment.academyLearnerId }, data: { userId: user.id } });
      await tx.academyProgramEnrollment.updateMany({ where: { academyLearnerId: enrollment.academyLearnerId }, data: { userId: user.id } });
      return { user, temporaryPassword };
    });
    this.securityAuditService.logAsync({ action: 'academy.programEnrollment.traineeAccount.create', outcome: SecurityAuditOutcome.SUCCESS, actorUserId: input.actorUserId, actorRoles: [UserRoleType.ADMIN], resourceType: 'AcademyProgramEnrollment', resourceId: input.enrollmentId, targetUserId: result.user.id, metadata: { email: email, credentialsReturned: true } });
    return { account: { type: 'TRAINEE', name: result.user.displayName, email }, temporaryCredentials: { email, password: result.temporaryPassword } };
  }

  async link(input: { enrollmentId: string; email: string; confirm: boolean; actorUserId: string }) {
    if (!input.confirm) throw new ForbiddenException({ messageKey: 'academyProgram.errors.accountLinkConfirmationRequired', error: 'ACADEMY_ACCOUNT_LINK_CONFIRMATION_REQUIRED' });
    const email = this.normalizeEmail(input.email);
    const result = await this.prisma.$transaction(async (tx) => {
      const enrollment = await this.loadEnrollment(input.enrollmentId, tx);
      this.assertEligible(enrollment);
      const account = await tx.userEmail.findUnique({ where: { email }, include: { user: { include: { roles: true, emails: true } } } });
      if (!account || !this.isSupportedAccount(account.user.roles.map((role) => role.role))) throw new NotFoundException({ messageKey: 'academyProgram.errors.accountNotFound', error: 'ACADEMY_ACCOUNT_NOT_FOUND' });
      if (enrollment.userId && enrollment.userId !== account.user.id) throw new ConflictException({ messageKey: 'academyProgram.errors.accountAlreadyLinked', error: 'ACADEMY_ACCOUNT_ALREADY_LINKED' });
      const sourceLearner = enrollment.academyLearner;
      const canonicalLearner = await tx.academyLearner.findUnique({ where: { userId: account.user.id } });
      const sourceEnrollments = await tx.academyProgramEnrollment.findMany({
        where: { academyLearnerId: sourceLearner.id },
        select: { id: true, academyProgramId: true, userId: true },
      });

      const inconsistentSourceEnrollment = sourceEnrollments.find(
        (sourceEnrollment) => sourceEnrollment.userId && sourceEnrollment.userId !== account.user.id,
      );
      if (inconsistentSourceEnrollment) {
        throw new ConflictException({
          messageKey: 'academyProgram.errors.accountAlreadyLinked',
          error: 'ACADEMY_ENROLLMENT_USER_MISMATCH',
        });
      }

      if (canonicalLearner && canonicalLearner.id !== sourceLearner.id) {
        const canonicalEnrollments = await tx.academyProgramEnrollment.findMany({
          where: { academyLearnerId: canonicalLearner.id },
          select: { id: true, academyProgramId: true },
        });
        const canonicalProgramIds = new Set(canonicalEnrollments.map((item) => item.academyProgramId));
        const conflictingEnrollment = sourceEnrollments.find((item) => canonicalProgramIds.has(item.academyProgramId));
        if (conflictingEnrollment) {
          throw new ConflictException({
            messageKey: 'academyProgram.errors.duplicateEnrollmentConflict',
            error: 'ACADEMY_DUPLICATE_PROGRAM_ENROLLMENT_CONFLICT',
            data: { enrollmentId: conflictingEnrollment.id },
          });
        }

        await tx.academyProgramEnrollment.updateMany({
          where: { academyLearnerId: sourceLearner.id },
          data: { academyLearnerId: canonicalLearner.id, userId: account.user.id },
        });
        await tx.academyLearner.delete({ where: { id: sourceLearner.id } });
      } else {
        if (!canonicalLearner) {
          await tx.academyLearner.update({ where: { id: sourceLearner.id }, data: { userId: account.user.id } });
        }
        await tx.academyProgramEnrollment.updateMany({
          where: { academyLearnerId: sourceLearner.id },
          data: { userId: account.user.id },
        });
      }

      return {
        userId: account.user.id,
        name: account.user.displayName,
        accountType: this.accountType(account.user.roles.map((role) => role.role)),
        consolidatedEnrollmentCount: sourceEnrollments.length,
      };
    });
    this.securityAuditService.logAsync({ action: 'academy.programEnrollment.account.link', outcome: SecurityAuditOutcome.SUCCESS, actorUserId: input.actorUserId, actorRoles: [UserRoleType.ADMIN], resourceType: 'AcademyProgramEnrollment', resourceId: input.enrollmentId, targetUserId: result.userId, metadata: { email, consolidatedEnrollmentCount: result.consolidatedEnrollmentCount } });
    return { account: { type: result.accountType, name: result.name, email } };
  }

  async resetPassword(input: { enrollmentId: string; newPassword: string; actorUserId: string }) {
    const passwordHash = await this.hashPasswordUseCase.execute(input.newPassword);
    const result = await this.prisma.$transaction(async (tx) => {
      const enrollment = await this.loadEnrollment(input.enrollmentId, tx);
      const account = enrollment.user;
      if (!account || !account.roles.some((role) => role.role === UserRoleType.TRAINEE) || account.roles.some((role) => PRIVILEGED_ROLES.has(role.role))) {
        throw new ForbiddenException({ messageKey: 'academyProgram.errors.traineeAccountRequired', error: 'ACADEMY_TRAINEE_ACCOUNT_REQUIRED' });
      }
      await tx.authIdentity.updateMany({ where: { userId: account.id, provider: AuthProvider.PASSWORD }, data: { passwordHash, isEnabled: true, lastUsedAt: new Date() } });
      await tx.user.update({ where: { id: account.id }, data: { tokenVersion: { increment: 1 } } });
      await tx.userSession.updateMany({ where: { userId: account.id, revokedAt: null }, data: { revokedAt: new Date() } });
      return { userId: account.id, email: account.emails[0]?.email ?? null };
    });
    this.securityAuditService.logAsync({ action: 'academy.programEnrollment.traineeAccount.passwordReset', outcome: SecurityAuditOutcome.SUCCESS, actorUserId: input.actorUserId, actorRoles: [UserRoleType.ADMIN], resourceType: 'User', resourceId: result.userId, targetUserId: result.userId, metadata: { email: result.email, passwordReturned: false } });
    return { account: { type: 'TRAINEE', email: result.email }, reset: true };
  }

  private async findAccountByEmail(email: string) {
    return this.prisma.userEmail.findUnique({ where: { email: this.normalizeEmail(email) }, include: { user: { include: { roles: true, emails: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } } } } });
  }

  private async loadEnrollment(id: string, tx?: DbClient): Promise<any> {
    return (tx ?? this.prisma).academyProgramEnrollment.findUnique({ where: { id }, include: { academyLearner: true, user: { include: { roles: true, emails: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } } }, academyProgram: { include: { sessions: { select: { endsAt: true } } } } } });
  }

  private assertEligible(enrollment: any): void {
    if (!enrollment) throw new NotFoundException({ messageKey: 'academyProgram.errors.enrollmentNotFound', error: 'ACADEMY_PROGRAM_ENROLLMENT_NOT_FOUND' });
    if (!this.isEligible(enrollment)) throw new ForbiddenException({ messageKey: 'academyProgram.errors.accountNotEligible', error: 'ACADEMY_ACCOUNT_NOT_ELIGIBLE' });
  }

  private isEligible(enrollment: any): boolean {
    return enrollment.status === 'CONFIRMED' && (enrollment.paymentStatus === PaymentStatus.CAPTURED || (!enrollment.paymentId && enrollment.paymentStatus === PaymentStatus.CREATED));
  }

  private isSupportedAccount(roles: UserRoleType[]) { return (roles.includes(UserRoleType.PATIENT) || roles.includes(UserRoleType.TRAINEE)) && !roles.some((role) => PRIVILEGED_ROLES.has(role)); }
  private accountType(roles: UserRoleType[]) { return roles.includes(UserRoleType.TRAINEE) ? 'TRAINEE' : roles.includes(UserRoleType.PATIENT) ? 'PATIENT' : 'NONE'; }
  private normalizeEmail(email: string) { return email.trim().toLowerCase(); }
  private generateTemporaryPassword() { return `Sawiyaa-${randomBytes(9).toString('base64url')}`; }
}

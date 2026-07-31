import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditOutcome } from '@prisma/client';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';

@Injectable()
export class UpdateMyBookingSettingsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
  ) {}

  async execute(input: {
    userId: string;
    acceptsNormalBookings: boolean;
    currentUser: AuthenticatedUser;
  }) {
    const profile = await this.prisma.practitionerProfile.findUnique({
      where: { userId: input.userId },
      select: { id: true, acceptsNormalBookings: true },
    });

    if (!profile) {
      throw new NotFoundException({
        messageKey: 'practitioners.errors.profileNotFound',
        error: 'PRACTITIONER_PROFILE_NOT_FOUND',
      });
    }

    const updated = await this.prisma.practitionerProfile.update({
      where: { id: profile.id },
      data: { acceptsNormalBookings: input.acceptsNormalBookings },
      select: {
        acceptsNormalBookings: true,
        presence: { select: { isInstantBookingEnabled: true } },
      },
    });

    this.securityAuditService?.logAsync({
      action: 'practitioner.booking-settings.update',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: input.currentUser.id,
      actorRoles: input.currentUser.roles,
      resourceType: 'PractitionerProfile',
      resourceId: profile.id,
      targetUserId: input.currentUser.id,
      metadata: {
        previousAcceptsNormalBookings: profile.acceptsNormalBookings,
        acceptsNormalBookings: updated.acceptsNormalBookings,
      },
    });

    return {
      message: 'Booking settings updated successfully',
      acceptsNormalBookings: updated.acceptsNormalBookings,
      isInstantBookingEnabled: updated.presence?.isInstantBookingEnabled ?? false,
    };
  }
}

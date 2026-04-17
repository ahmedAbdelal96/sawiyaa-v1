import { Injectable } from '@nestjs/common';
import { PractitionerPresence, PresenceStatus } from '@prisma/client';
import { PractitionerPresenceViewModel } from '../types/presence.types';

/**
 * PresenceMapper isolates stable API contracts from persistence field names.
 */
@Injectable()
export class PresenceMapper {
  toViewModel(
    presence: PractitionerPresence | null,
  ): PractitionerPresenceViewModel {
    if (!presence) {
      return {
        status: PresenceStatus.OFFLINE,
        isInstantBookingEnabled: false,
        lastSeenAt: null,
        lastHeartbeatAt: null,
        manuallySetAt: null,
        updatedAt: null,
      };
    }

    return {
      status: presence.status,
      isInstantBookingEnabled: presence.isInstantBookingEnabled,
      lastSeenAt: presence.lastSeenAtUtc?.toISOString() ?? null,
      lastHeartbeatAt: presence.lastHeartbeatAtUtc?.toISOString() ?? null,
      manuallySetAt: presence.manuallySetAtUtc?.toISOString() ?? null,
      updatedAt: presence.updatedAt.toISOString(),
    };
  }

  toPublicViewModel(presence: PractitionerPresence | null) {
    const viewModel = this.toViewModel(presence);

    return {
      status: viewModel.status,
      isInstantBookingEnabled: viewModel.isInstantBookingEnabled,
      lastSeenAt: viewModel.lastSeenAt,
    };
  }
}

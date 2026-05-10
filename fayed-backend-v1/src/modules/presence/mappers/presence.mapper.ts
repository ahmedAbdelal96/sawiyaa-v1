import { Injectable } from '@nestjs/common';
import { PractitionerPresence, PresenceStatus } from '@prisma/client';
import { PractitionerPresenceViewModel } from '../types/presence.types';
import { resolveEffectivePresenceStatus } from '../utils/presence-liveness';

/**
 * PresenceMapper isolates stable API contracts from persistence field names.
 */
@Injectable()
export class PresenceMapper {
  toViewModel(
    presence: PractitionerPresence | null,
    referenceTime = new Date(),
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
      status: resolveEffectivePresenceStatus(presence, referenceTime),
      isInstantBookingEnabled: presence.isInstantBookingEnabled,
      lastSeenAt: presence.lastSeenAtUtc?.toISOString() ?? null,
      lastHeartbeatAt: presence.lastHeartbeatAtUtc?.toISOString() ?? null,
      manuallySetAt: presence.manuallySetAtUtc?.toISOString() ?? null,
      updatedAt: presence.updatedAt.toISOString(),
    };
  }

  toPublicViewModel(
    presence: PractitionerPresence | null,
    referenceTime = new Date(),
  ) {
    const viewModel = this.toViewModel(presence, referenceTime);

    return {
      status: viewModel.status,
      isInstantBookingEnabled: viewModel.isInstantBookingEnabled,
      lastSeenAt: viewModel.lastSeenAt,
    };
  }
}

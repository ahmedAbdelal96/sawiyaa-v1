import { PresenceStatus } from '@prisma/client';
import { PractitionerPresenceRepository } from './practitioner-presence.repository';

type PresenceRecord = {
  practitionerId: string;
  status: PresenceStatus;
  manuallySetAtUtc: Date | null;
};

type PresenceUpdateArgs = {
  where: {
    practitionerId: string;
  };
  data: {
    status: PresenceStatus;
    lastSeenAtUtc: Date;
    lastHeartbeatAtUtc: Date;
  };
};

describe('PractitionerPresenceRepository', () => {
  const practitionerPresence = {
    findUnique: jest.fn<Promise<PresenceRecord | null>, [unknown]>(),
    create: jest.fn<Promise<PresenceRecord>, [unknown]>(),
    update: jest.fn<Promise<PresenceRecord>, [unknown]>(),
  };

  const prisma = {
    practitionerPresence,
  } as never;

  const repository = new PractitionerPresenceRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('promotes a seeded offline presence to online on heartbeat', async () => {
    const seededOfflinePresence: PresenceRecord = {
      practitionerId: 'practitioner-1',
      status: PresenceStatus.OFFLINE,
      manuallySetAtUtc: null,
    };
    const promotedPresence: PresenceRecord = {
      practitionerId: 'practitioner-1',
      status: PresenceStatus.ONLINE,
      manuallySetAtUtc: null,
    };
    practitionerPresence.findUnique.mockResolvedValue(seededOfflinePresence);
    practitionerPresence.update.mockResolvedValue(promotedPresence);

    await repository.touchHeartbeat('practitioner-1');

    const updateArgs = practitionerPresence.update.mock
      .calls[0][0] as PresenceUpdateArgs;

    expect(updateArgs.where).toEqual({
      practitionerId: 'practitioner-1',
    });
    expect(updateArgs.data.status).toBe(PresenceStatus.ONLINE);
    expect(updateArgs.data.lastSeenAtUtc).toBeInstanceOf(Date);
    expect(updateArgs.data.lastHeartbeatAtUtc).toBeInstanceOf(Date);
  });

  it('keeps an explicitly offline presence offline on heartbeat', async () => {
    const manuallyOfflinePresence: PresenceRecord = {
      practitionerId: 'practitioner-1',
      status: PresenceStatus.OFFLINE,
      manuallySetAtUtc: new Date('2026-05-07T10:00:00.000Z'),
    };
    const persistedOfflinePresence: PresenceRecord = {
      practitionerId: 'practitioner-1',
      status: PresenceStatus.OFFLINE,
      manuallySetAtUtc: new Date('2026-05-07T10:00:00.000Z'),
    };
    practitionerPresence.findUnique.mockResolvedValue(manuallyOfflinePresence);
    practitionerPresence.update.mockResolvedValue(persistedOfflinePresence);

    await repository.touchHeartbeat('practitioner-1');

    const updateArgs = practitionerPresence.update.mock
      .calls[0][0] as PresenceUpdateArgs;

    expect(updateArgs.where).toEqual({
      practitionerId: 'practitioner-1',
    });
    expect(updateArgs.data.status).toBe(PresenceStatus.OFFLINE);
    expect(updateArgs.data.lastSeenAtUtc).toBeInstanceOf(Date);
    expect(updateArgs.data.lastHeartbeatAtUtc).toBeInstanceOf(Date);
  });
});

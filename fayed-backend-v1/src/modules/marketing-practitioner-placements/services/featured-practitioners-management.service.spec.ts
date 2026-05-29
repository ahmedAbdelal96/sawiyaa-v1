import { PractitionerMarketingPlacementManagementService } from './practitioner-marketing-placement-management.service';

describe('featured-practitioners management smoke', () => {
  it('constructs service with repository dependency', () => {
    const repository = {
      list: jest.fn(),
      findById: jest.fn(),
      findEligiblePractitioner: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      createHistory: jest.fn(),
      listHistory: jest.fn(),
      toSnapshot: jest.fn(),
    };

    const service = new PractitionerMarketingPlacementManagementService(
      repository as never,
    );

    expect(service).toBeDefined();
  });
});


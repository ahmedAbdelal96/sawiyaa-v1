import { ConflictException } from '@nestjs/common';
import {
  ReviewCaseStatus,
  ReviewRequirementStatus,
  ReviewSectionStatus,
} from '@prisma/client';
import { PractitionerReviewCaseService } from './practitioner-review-case.service';

describe('PractitionerReviewCaseService', () => {
  it('allows the canonical review transitions and rejects terminal shortcuts', () => {
    const service = new PractitionerReviewCaseService({} as never);

    expect(() => service.assertTransition(ReviewCaseStatus.PENDING_REVIEW, ReviewCaseStatus.UNDER_REVIEW)).not.toThrow();
    expect(() => service.assertTransition(ReviewCaseStatus.CHANGES_REQUESTED, ReviewCaseStatus.RESUBMITTED)).not.toThrow();
    expect(() => service.assertTransition(ReviewCaseStatus.APPROVED, ReviewCaseStatus.CHANGES_REQUESTED)).toThrow(ConflictException);
  });

  it('allows an existing changes-requested case to receive merged requirements', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'case-1' });
    const findUnique = jest.fn().mockResolvedValue({ status: ReviewCaseStatus.CHANGES_REQUESTED });
    const findFirst = jest.fn().mockResolvedValue(null);
    const create = jest.fn().mockResolvedValue({ id: 'requirement-1' });
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const db = {
      practitionerReviewCase: { findUnique, update },
      practitionerReviewRequirement: { findFirst, create, update },
      practitionerReviewSection: { updateMany },
    };
    const service = new PractitionerReviewCaseService(db as never);

    await service.requestChanges({
      caseId: 'case-1',
      adminUserId: 'admin-1',
      reason: 'Please replace the document',
      requirements: [{
        section: 'PROFESSIONAL_CREDENTIALS',
        credentialType: 'LICENSE',
        title: 'Practice license',
        reason: 'The license is not readable',
      }],
    });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'case-1' },
      data: expect.objectContaining({ status: ReviewCaseStatus.CHANGES_REQUESTED }),
    }));
    expect(create).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { caseId: 'case-1', section: 'PROFESSIONAL_CREDENTIALS' },
    }));
  });

  it('keeps a changes-requested case pending until explicit resubmission', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'case-1', status: ReviewCaseStatus.CHANGES_REQUESTED });
    const findFirst = jest.fn().mockResolvedValue({
      id: 'case-1',
      status: ReviewCaseStatus.CHANGES_REQUESTED,
    });
    const upsert = jest.fn().mockResolvedValue({});
    const db = {
      $executeRaw: jest.fn().mockResolvedValue(0),
      practitionerReviewCase: { findFirst, update },
      practitionerReviewSection: { upsert },
    };
    const service = new PractitionerReviewCaseService(db as never);

    await service.upsertChangeCase({
      practitionerId: 'practitioner-1',
      proposedSnapshot: { profile: { professionalTitle: 'PSYCHOLOGIST' } },
      sections: ['PROFILE'],
    });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: ReviewCaseStatus.CHANGES_REQUESTED }),
    }));
  });

  it('marks the professional title requirement submitted without creating a duplicate requirement', async () => {
    const requirementUpdate = jest.fn().mockResolvedValue({});
    const sectionUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const db = {
      practitionerReviewRequirement: {
        findFirst: jest.fn().mockResolvedValue({ id: 'requirement-1' }),
        update: requirementUpdate,
      },
      practitionerReviewSection: { updateMany: sectionUpdateMany },
    };
    const service = new PractitionerReviewCaseService(db as never);

    await service.markRequirementSubmitted({
      caseId: 'case-1',
      section: 'PROFILE',
      fieldPath: 'professionalTitle',
    });

    expect(requirementUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'requirement-1' },
      data: expect.objectContaining({ status: ReviewRequirementStatus.SUBMITTED }),
    }));
    expect(sectionUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: ReviewSectionStatus.PENDING },
    }));
  });
});

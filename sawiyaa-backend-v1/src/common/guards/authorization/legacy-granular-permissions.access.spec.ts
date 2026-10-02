import { GUARDS_METADATA } from '@nestjs/common/constants';
import {
  PERMISSIONS_KEY,
  ROLES_KEY,
} from '@common/constants/auth-metadata.constants';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RolesGuard } from './roles.guard';
import { AdminArticlesController } from '@modules/articles/controllers/admin-articles.controller';
import { AdminArticleCategoriesController } from '@modules/articles/controllers/admin-article-categories.controller';
import { AdminHelpController } from '@modules/help/controllers/admin-help.controller';
import { AdminReviewsController } from '@modules/reviews/controllers/admin-reviews.controller';
import { SpecialtiesAdminController } from '@modules/specialties/controllers/specialties-admin.controller';
import { AdminPackagePlansController } from '@modules/package-plans/controllers/admin-package-plans.controller';
import { AdminAssessmentsAuthoringController } from '@modules/assessments/admin-authoring/controllers/admin-assessments-authoring.controller';
import { AdminCustomerWalletController } from '@modules/customer-wallets/controllers/admin-customer-wallet.controller';
import { AdminCouponsController } from '@modules/financial-rules/controllers/admin-coupons.controller';

const method = (controller: any, name: string) => controller.prototype[name];

describe('P1 granular controller access contracts', () => {
  const contracts: Array<[any, AppRole[], Record<string, PermissionKey[]>]> = [
    [
      AdminArticlesController,
      [AppRole.ADMIN, AppRole.SUPER_ADMIN, AppRole.CONTENT_REVIEWER],
      {
        uploadCover: [PermissionKey.ARTICLES_MANAGE],
        create: [PermissionKey.ARTICLES_MANAGE],
        list: [PermissionKey.ARTICLES_READ],
        getById: [PermissionKey.ARTICLES_READ],
        update: [PermissionKey.ARTICLES_MANAGE],
        publish: [PermissionKey.ARTICLES_MANAGE],
        archive: [PermissionKey.ARTICLES_MANAGE],
      },
    ],
    [
      AdminArticleCategoriesController,
      [AppRole.ADMIN, AppRole.SUPER_ADMIN, AppRole.CONTENT_REVIEWER],
      {
        create: [PermissionKey.ARTICLES_MANAGE],
        list: [PermissionKey.ARTICLES_READ],
        getById: [PermissionKey.ARTICLES_READ],
        update: [PermissionKey.ARTICLES_MANAGE],
      },
    ],
    [
      AdminHelpController,
      [AppRole.ADMIN, AppRole.SUPER_ADMIN, AppRole.CONTENT_REVIEWER],
      {
        listCategories: [PermissionKey.HELP_READ],
        createCategory: [PermissionKey.HELP_MANAGE],
        updateCategory: [PermissionKey.HELP_MANAGE],
        deleteCategory: [PermissionKey.HELP_MANAGE],
        reorderCategories: [PermissionKey.HELP_MANAGE],
        listQuestions: [PermissionKey.HELP_READ],
        createQuestion: [PermissionKey.HELP_MANAGE],
        updateQuestion: [PermissionKey.HELP_MANAGE],
        deleteQuestion: [PermissionKey.HELP_MANAGE],
        reorderQuestions: [PermissionKey.HELP_MANAGE],
      },
    ],
    [
      AdminReviewsController,
      [AppRole.ADMIN, AppRole.SUPER_ADMIN, AppRole.CONTENT_REVIEWER],
      {
        list: [PermissionKey.REVIEWS_READ],
        getById: [PermissionKey.REVIEWS_READ],
        moderate: [PermissionKey.REVIEWS_MODERATE],
      },
    ],
    [
      SpecialtiesAdminController,
      [
        AppRole.ADMIN,
        AppRole.SUPER_ADMIN,
        AppRole.CONTENT_REVIEWER,
        AppRole.PRACTITIONER_REVIEWER,
      ],
      {
        list: [PermissionKey.SPECIALTIES_READ],
        listCategories: [PermissionKey.SPECIALTIES_READ],
        createCategory: [PermissionKey.SPECIALTIES_MANAGE],
        updateCategory: [PermissionKey.SPECIALTIES_MANAGE],
        create: [PermissionKey.SPECIALTIES_MANAGE],
        update: [PermissionKey.SPECIALTIES_MANAGE],
        toggleStatus: [PermissionKey.SPECIALTIES_MANAGE],
      },
    ],
    [
      AdminPackagePlansController,
      [AppRole.ADMIN, AppRole.SUPER_ADMIN, AppRole.FINANCE_STAFF],
      {
        list: [PermissionKey.PACKAGE_PLANS_READ],
        detail: [PermissionKey.PACKAGE_PLANS_READ],
        update: [PermissionKey.PACKAGE_PLANS_MANAGE],
        enable: [PermissionKey.PACKAGE_PLANS_MANAGE],
        disable: [PermissionKey.PACKAGE_PLANS_MANAGE],
      },
    ],
    [
      AdminAssessmentsAuthoringController,
      [
        AppRole.ADMIN,
        AppRole.SUPER_ADMIN,
        AppRole.FINANCE_STAFF,
        AppRole.MARKETING_STAFF,
        AppRole.PRACTITIONER_REVIEWER,
        AppRole.PATIENT_OPERATIONS,
        AppRole.SUPPORT_AGENT,
        AppRole.CONTENT_REVIEWER,
      ],
      {
        list: [PermissionKey.ASSESSMENTS_AUTHORING_READ],
        details: [PermissionKey.ASSESSMENTS_AUTHORING_READ],
        previewScore: [PermissionKey.ASSESSMENTS_AUTHORING_READ],
        create: [PermissionKey.ASSESSMENTS_AUTHORING_MANAGE],
        updateMetadata: [PermissionKey.ASSESSMENTS_AUTHORING_MANAGE],
        forkDraft: [PermissionKey.ASSESSMENTS_AUTHORING_MANAGE],
        createQuestion: [PermissionKey.ASSESSMENTS_AUTHORING_MANAGE],
        reorderQuestions: [PermissionKey.ASSESSMENTS_AUTHORING_MANAGE],
        updateQuestion: [PermissionKey.ASSESSMENTS_AUTHORING_MANAGE],
        deleteQuestion: [PermissionKey.ASSESSMENTS_AUTHORING_MANAGE],
        createOption: [PermissionKey.ASSESSMENTS_AUTHORING_MANAGE],
        reorderOptions: [PermissionKey.ASSESSMENTS_AUTHORING_MANAGE],
        updateOption: [PermissionKey.ASSESSMENTS_AUTHORING_MANAGE],
        deleteOption: [PermissionKey.ASSESSMENTS_AUTHORING_MANAGE],
        updateScoringConfig: [PermissionKey.ASSESSMENTS_AUTHORING_MANAGE],
        publish: [PermissionKey.ASSESSMENTS_AUTHORING_MANAGE],
        unpublish: [PermissionKey.ASSESSMENTS_AUTHORING_MANAGE],
      },
    ],
    [
      AdminCustomerWalletController,
      [AppRole.ADMIN, AppRole.SUPER_ADMIN, AppRole.FINANCE_STAFF],
      {
        summary: [PermissionKey.CUSTOMER_WALLETS_READ],
        entries: [PermissionKey.CUSTOMER_WALLETS_READ],
      },
    ],
    [
      AdminCouponsController,
      [
        AppRole.ADMIN,
        AppRole.SUPER_ADMIN,
        AppRole.FINANCE_STAFF,
        AppRole.MARKETING_STAFF,
        AppRole.PRACTITIONER_REVIEWER,
        AppRole.PATIENT_OPERATIONS,
        AppRole.SUPPORT_AGENT,
        AppRole.CONTENT_REVIEWER,
      ],
      { create: [PermissionKey.COUPONS_MANAGE] },
    ],
  ];

  it.each(contracts)(
    '%p has auth, role and permission guards with exact method permissions',
    (controller, roles, permissions) => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, controller) ?? [];
      expect(guards).toEqual(
        expect.arrayContaining([JwtAccessAuthGuard, PermissionsGuard]),
      );
      expect(guards).toContain(RolesGuard);
      expect(Reflect.getMetadata(ROLES_KEY, controller)).toEqual(roles);
      for (const [name, expected] of Object.entries(permissions)) {
        const target = method(controller, name);
        expect(
          Reflect.getMetadata(PERMISSIONS_KEY, target) ??
            Reflect.getMetadata(PERMISSIONS_KEY, controller),
        ).toEqual(expected);
      }
    },
  );
});

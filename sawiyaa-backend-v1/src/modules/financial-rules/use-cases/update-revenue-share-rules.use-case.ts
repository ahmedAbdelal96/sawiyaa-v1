import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { CommissionRuleScope, MarketType, Prisma, SecurityAuditOutcome } from '@prisma/client';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { SecurityAuditActorType, SecurityAuditSource } from '@common/security-audit/security-audit.types';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { CommissionRuleRepository } from '../repositories/commission-rule.repository';
import { MoneyMathService } from '../services/money-math.service';
import { ValidateCommissionRuleDefinitionService } from '../services/validate-commission-rule-definition.service';
import { UpdateRevenueShareRulesDto } from '../dto/revenue-share-rules.dto';
import {
  CROSS_BORDER_DEFAULT_SLUG,
  LOCAL_DEFAULT_SLUG,
} from './get-revenue-share-rules.use-case';

@Injectable()
export class UpdateRevenueShareRulesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commissionRuleRepository: CommissionRuleRepository,
    private readonly validateCommissionRuleDefinitionService: ValidateCommissionRuleDefinitionService,
    private readonly moneyMathService: MoneyMathService,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async execute(body: UpdateRevenueShareRulesDto, actor: AuthenticatedUser) {
    const platformRate = this.normalizePlatformRate(body.platformCommissionPercent);
    const practitionerRate = this.moneyMathService
      .toDecimal(100)
      .sub(platformRate)
      .toFixed(2);
    this.validateCommissionRuleDefinitionService.validate({
      platformRatePercent: platformRate,
      practitionerRatePercent: practitionerRate,
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const [currentLocal, currentCrossBorder] = await Promise.all([
        this.commissionRuleRepository.findBySlug(LOCAL_DEFAULT_SLUG, tx),
        this.commissionRuleRepository.findBySlug(CROSS_BORDER_DEFAULT_SLUG, tx),
      ]);
      if (!currentLocal?.isActive || !currentCrossBorder?.isActive) {
        throw new BadRequestException({
          messageKey: 'financialRules.errors.commissionRuleNotFound',
          error: 'FINANCIAL_RULE_COMMISSION_RULE_NOT_FOUND',
        });
      }
      const expectedVersion = this.buildVersion(
        currentLocal.updatedAt,
        currentCrossBorder.updatedAt,
      );
      if (
        body.expectedUpdatedAt !== undefined &&
        body.expectedUpdatedAt !== null &&
        body.expectedUpdatedAt !== expectedVersion
      ) {
        throw new ConflictException({
          error: 'FINANCIAL_RULE_CONFIGURATION_CHANGED',
          message: 'Commission settings changed since they were read. Reload and try again.',
        });
      }

      const [local, crossBorder] = await Promise.all([
        this.commissionRuleRepository.updateById(currentLocal.id, {
          platformRatePercent: platformRate,
          practitionerRatePercent: practitionerRate,
          isDefault: true,
          isActive: true,
        }, tx),
        this.commissionRuleRepository.updateById(currentCrossBorder.id, {
          platformRatePercent: platformRate,
          practitionerRatePercent: practitionerRate,
          isDefault: true,
          isActive: true,
        }, tx),
      ]);
      const effectiveAt = new Date(
        Math.max(local.updatedAt.getTime(), crossBorder.updatedAt.getTime()),
      );

      await Promise.all([
        this.commissionRuleRepository.unsetOtherGlobalDefaults({
          marketType: MarketType.LOCAL,
          keepSlug: LOCAL_DEFAULT_SLUG,
        }, tx),
        this.commissionRuleRepository.unsetOtherGlobalDefaults({
          marketType: MarketType.CROSS_BORDER,
          keepSlug: CROSS_BORDER_DEFAULT_SLUG,
        }, tx),
      ]);

      await this.securityAuditService.recordRequired(tx, {
        action: 'financial.platformCommission.update.success',
        outcome: SecurityAuditOutcome.SUCCESS,
        actorType: SecurityAuditActorType.USER,
        source: SecurityAuditSource.HTTP_REQUEST,
        actorUserId: actor.id,
        actorRoles: actor.roles,
        resourceType: 'CommissionRule',
        resourceId: local.id,
        reason: body.reason.trim(),
        metadata: {
          setting: 'platformCommissionPercent',
          oldLocalPlatformRatePercent: this.toPercent(currentLocal.platformRatePercent),
          oldLocalPractitionerRatePercent: this.toPercent(currentLocal.practitionerRatePercent),
          oldCrossBorderPlatformRatePercent: this.toPercent(currentCrossBorder.platformRatePercent),
          oldCrossBorderPractitionerRatePercent: this.toPercent(currentCrossBorder.practitionerRatePercent),
          newPlatformCommissionPercent: platformRate,
          newPractitionerSharePercent: practitionerRate,
          effectiveAt: effectiveAt.toISOString(),
        },
      });

      return { local, crossBorder, effectiveAt };
    });

    return {
      item: {
        configurationState: 'READY' as const,
        platformCommissionPercent: platformRate,
        practitionerSharePercent: practitionerRate,
        effectiveAt: result.effectiveAt.toISOString(),
        updatedAt: result.effectiveAt.toISOString(),
        expectedUpdatedAt: this.buildVersion(
          result.local.updatedAt,
          result.crossBorder.updatedAt,
        ),
      },
    };
  }

  private normalizePlatformRate(value: string) {
    try {
      const decimal = this.moneyMathService.toDecimal(value);
      if (decimal.isNegative() || decimal.gt(100) || decimal.decimalPlaces() > 2) {
        throw new Error('invalid');
      }
      return decimal.toFixed(2);
    } catch {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.invalidCommissionSplit',
        error: 'FINANCIAL_RULE_INVALID_COMMISSION_SPLIT',
      });
    }
  }

  private toPercent(value: Prisma.Decimal | string) {
    return this.moneyMathService.toDecimal(value).toFixed(2);
  }

  private buildVersion(localUpdatedAt: Date, crossBorderUpdatedAt: Date) {
    return `${localUpdatedAt.toISOString()}|${crossBorderUpdatedAt.toISOString()}`;
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import {
  CommissionRuleScope,
  MarketType,
  SessionFlowType,
  SessionMode,
} from '@prisma/client';
import { FinancialRulesMapper } from '../mappers/financial-rules.mapper';
import { CommissionRuleRepository } from '../repositories/commission-rule.repository';
import { ValidateCommissionRuleDefinitionService } from '../services/validate-commission-rule-definition.service';
import { normalizeSlug } from '../utils/normalize-financial-identifiers.util';

@Injectable()
export class CreateCommissionRuleUseCase {
  constructor(
    private readonly commissionRuleRepository: CommissionRuleRepository,
    private readonly validateCommissionRuleDefinitionService: ValidateCommissionRuleDefinitionService,
    private readonly financialRulesMapper: FinancialRulesMapper,
  ) {}

  async execute(input: {
    slug: string;
    ruleName: string;
    ruleScope: CommissionRuleScope;
    marketType?: MarketType;
    practitionerCountryId?: string;
    patientCountryId?: string;
    sessionFlowType?: SessionFlowType;
    sessionMode?: SessionMode;
    specialtyId?: string;
    platformRatePercent: string;
    practitionerRatePercent: string;
    priority?: number;
    isDefault?: boolean;
    isActive?: boolean;
    startsAt?: string;
    endsAt?: string;
  }) {
    this.validateCommissionRuleDefinitionService.validate({
      platformRatePercent: input.platformRatePercent,
      practitionerRatePercent: input.practitionerRatePercent,
    });

    const slug = normalizeSlug(input.slug);
    const existing = await this.commissionRuleRepository.listRules({ slug });

    if (existing.length > 0) {
      throw new ConflictException({
        messageKey: 'financialRules.errors.commissionRuleSlugExists',
        error: 'FINANCIAL_RULE_COMMISSION_RULE_SLUG_EXISTS',
      });
    }

    const startsAt = input.startsAt ? new Date(input.startsAt) : null;
    const endsAt = input.endsAt ? new Date(input.endsAt) : null;

    if (
      (startsAt && Number.isNaN(startsAt.getTime())) ||
      (endsAt && Number.isNaN(endsAt.getTime()))
    ) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.invalidDateRange',
        error: 'FINANCIAL_RULE_INVALID_DATE_RANGE',
      });
    }

    if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.invalidDateRange',
        error: 'FINANCIAL_RULE_INVALID_DATE_RANGE',
      });
    }

    const created = await this.commissionRuleRepository.createRule({
      slug,
      ruleName: input.ruleName.trim(),
      ruleScope: input.ruleScope,
      marketType: input.marketType ?? MarketType.ANY,
      practitionerCountryId: input.practitionerCountryId ?? null,
      patientCountryId: input.patientCountryId ?? null,
      sessionFlowType: input.sessionFlowType ?? null,
      sessionMode: input.sessionMode ?? null,
      specialtyId: input.specialtyId ?? null,
      platformRatePercent: input.platformRatePercent,
      practitionerRatePercent: input.practitionerRatePercent,
      priority: input.priority ?? 0,
      isDefault: input.isDefault ?? false,
      isActive: input.isActive ?? true,
      startsAt,
      endsAt,
    });

    return {
      item: this.financialRulesMapper.toCommissionRule(created),
    };
  }
}

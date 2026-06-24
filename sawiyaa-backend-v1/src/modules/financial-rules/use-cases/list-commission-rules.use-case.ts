import { Injectable } from '@nestjs/common';
import { ListCommissionRulesDto } from '../dto/list-commission-rules.dto';
import { FinancialRulesMapper } from '../mappers/financial-rules.mapper';
import { CommissionRuleRepository } from '../repositories/commission-rule.repository';

@Injectable()
export class ListCommissionRulesUseCase {
  constructor(
    private readonly commissionRuleRepository: CommissionRuleRepository,
    private readonly financialRulesMapper: FinancialRulesMapper,
  ) {}

  async execute(query: ListCommissionRulesDto) {
    const items = await this.commissionRuleRepository.listRules({
      ruleScope: query.ruleScope,
      marketType: query.marketType,
      sessionFlowType: query.sessionFlowType,
      sessionMode: query.sessionMode,
      specialtyId: query.specialtyId,
      practitionerCountryId: query.practitionerCountryId,
      patientCountryId: query.patientCountryId,
      isActive:
        query.isActive === undefined ? undefined : query.isActive === 'true',
    });

    return {
      items: items.map((item) =>
        this.financialRulesMapper.toCommissionRule(item),
      ),
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { FinancialSessionRepository } from '../repositories/financial-session.repository';
import { ResolveCommissionRuleService } from '../services/resolve-commission-rule.service';

@Injectable()
export class ResolveCommissionForSessionUseCase {
  constructor(
    private readonly financialSessionRepository: FinancialSessionRepository,
    private readonly resolveCommissionRuleService: ResolveCommissionRuleService,
  ) {}

  async execute(input: { sessionId: string; userId: string }) {
    const session = await this.financialSessionRepository.findPatientOwnedSession(
      input.sessionId,
      input.userId,
    );

    if (!session) {
      throw new NotFoundException({
        messageKey: 'financialRules.errors.sessionNotFound',
        error: 'FINANCIAL_RULE_SESSION_NOT_FOUND',
      });
    }

    const resolved = await this.resolveCommissionRuleService.resolveForSession({
      id: session.id,
      flowType: session.flowType,
      sessionMode: session.sessionMode,
      durationMinutes: session.durationMinutes,
      practitioner: session.practitioner,
      patient: session.patient,
    });

    return {
      item: {
        id: resolved.rule.id,
        slug: resolved.rule.slug,
        ruleName: resolved.rule.ruleName,
        ruleScope: resolved.rule.ruleScope,
        marketType: resolved.rule.marketType,
        platformRatePercent: resolved.platformRatePercent,
        practitionerRatePercent: resolved.practitionerRatePercent,
        priority: resolved.rule.priority,
        isDefault: resolved.rule.isDefault,
        isActive: resolved.rule.isActive,
        practitionerCountryId: resolved.rule.practitionerCountryId ?? null,
        patientCountryId: resolved.rule.patientCountryId ?? null,
        sessionFlowType: resolved.rule.sessionFlowType ?? null,
        sessionMode: resolved.rule.sessionMode ?? null,
        specialtyId: resolved.rule.specialtyId ?? null,
        startsAt: resolved.rule.startsAt?.toISOString() ?? null,
        endsAt: resolved.rule.endsAt?.toISOString() ?? null,
        createdAt: resolved.rule.createdAt.toISOString(),
        updatedAt: resolved.rule.updatedAt.toISOString(),
      },
    };
  }
}

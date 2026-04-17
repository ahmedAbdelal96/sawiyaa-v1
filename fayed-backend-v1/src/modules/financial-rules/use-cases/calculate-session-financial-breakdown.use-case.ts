import { Injectable, NotFoundException } from '@nestjs/common';
import { FinancialRulesMapper } from '../mappers/financial-rules.mapper';
import { FinancialSessionRepository } from '../repositories/financial-session.repository';
import { CalculateSessionFinancialBreakdownService } from '../services/calculate-session-financial-breakdown.service';

@Injectable()
export class CalculateSessionFinancialBreakdownUseCase {
  constructor(
    private readonly financialSessionRepository: FinancialSessionRepository,
    private readonly calculateSessionFinancialBreakdownService: CalculateSessionFinancialBreakdownService,
    private readonly financialRulesMapper: FinancialRulesMapper,
  ) {}

  async execute(input: {
    userId: string;
    sessionId: string;
    couponCode?: string | null;
  }) {
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

    const resolution = await this.calculateSessionFinancialBreakdownService.calculate({
      session: {
        id: session.id,
        flowType: session.flowType,
        sessionMode: session.sessionMode,
        durationMinutes: session.durationMinutes,
        practitioner: session.practitioner,
        patient: session.patient,
      },
      couponCode: input.couponCode ?? null,
    });

    return {
      item: this.financialRulesMapper.toBreakdown(resolution.breakdown),
    };
  }
}

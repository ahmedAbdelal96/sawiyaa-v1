"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.financialRulesSeedModule = void 0;
const client_1 = require("@prisma/client");
exports.financialRulesSeedModule = {
    name: 'financial-rules',
    async run(prisma) {
        const rules = [
            {
                slug: 'session-booking-local-default',
                ruleName: 'Default local scheduled session commission',
                ruleScope: client_1.CommissionRuleScope.GLOBAL,
                marketType: client_1.MarketType.LOCAL,
                sessionFlowType: client_1.SessionFlowType.SCHEDULED,
                sessionMode: client_1.SessionMode.VIDEO,
                platformRatePercent: '20.00',
                practitionerRatePercent: '80.00',
                priority: 100,
                isDefault: true,
            },
            {
                slug: 'session-booking-cross-border-default',
                ruleName: 'Default cross-border scheduled session commission',
                ruleScope: client_1.CommissionRuleScope.GLOBAL,
                marketType: client_1.MarketType.CROSS_BORDER,
                sessionFlowType: client_1.SessionFlowType.SCHEDULED,
                sessionMode: client_1.SessionMode.VIDEO,
                platformRatePercent: '25.00',
                practitionerRatePercent: '75.00',
                priority: 100,
                isDefault: true,
            },
            {
                slug: 'session-booking-any-fallback',
                ruleName: 'Fallback scheduled session commission',
                ruleScope: client_1.CommissionRuleScope.GLOBAL,
                marketType: client_1.MarketType.ANY,
                sessionFlowType: client_1.SessionFlowType.SCHEDULED,
                sessionMode: client_1.SessionMode.VIDEO,
                platformRatePercent: '20.00',
                practitionerRatePercent: '80.00',
                priority: 10,
                isDefault: true,
            },
        ];
        for (const rule of rules) {
            await prisma.commissionRule.upsert({
                where: { slug: rule.slug },
                create: {
                    ...rule,
                    isActive: true,
                },
                update: {
                    ruleName: rule.ruleName,
                    ruleScope: rule.ruleScope,
                    marketType: rule.marketType,
                    sessionFlowType: rule.sessionFlowType,
                    sessionMode: rule.sessionMode,
                    platformRatePercent: rule.platformRatePercent,
                    practitionerRatePercent: rule.practitionerRatePercent,
                    priority: rule.priority,
                    isDefault: rule.isDefault,
                    isActive: true,
                },
            });
        }
    },
};
//# sourceMappingURL=financial-rules.seed.js.map
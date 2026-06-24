"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assessmentsSeedModule = void 0;
const client_1 = require("@prisma/client");
const defaultOptions = [
    { key: 'not_at_all', label: 'Not at all', scoreValue: 0 },
    { key: 'several_days', label: 'Several days', scoreValue: 1 },
    { key: 'more_than_half_days', label: 'More than half the days', scoreValue: 2 },
    { key: 'nearly_every_day', label: 'Nearly every day', scoreValue: 3 },
];
const ASSESSMENTS = [
    {
        slug: 'stress-check',
        title: 'Stress Check',
        description: 'A short check-in to understand your recent stress load.',
        category: 'stress',
        introText: 'Answer based on your experience over the last two weeks.',
        outroText: 'This result is not a diagnosis and can guide your next step.',
        estimatedDurationMinutes: 3,
        questions: [
            { key: 'q1_tension', prompt: 'How often have you felt tense or overwhelmed?', options: defaultOptions },
            { key: 'q2_control', prompt: 'How often have you felt unable to control important things in your life?', options: defaultOptions },
            { key: 'q3_irritability', prompt: 'How often have you felt irritable or emotionally drained?', options: defaultOptions },
            { key: 'q4_relax', prompt: 'How often have you struggled to relax?', options: defaultOptions },
        ],
    },
    {
        slug: 'anxiety-check',
        title: 'Anxiety Check',
        description: 'A quick self-discovery tool for anxiety-related distress.',
        category: 'anxiety',
        introText: 'Choose the answer that best reflects the last two weeks.',
        outroText: 'Use this as guidance for support decisions, not diagnosis.',
        estimatedDurationMinutes: 3,
        questions: [
            { key: 'q1_nervous', prompt: 'How often have you felt nervous or on edge?', options: defaultOptions },
            { key: 'q2_worry', prompt: 'How often have you found it difficult to control worry?', options: defaultOptions },
            { key: 'q3_restless', prompt: 'How often have you felt restless or unable to sit still?', options: defaultOptions },
            { key: 'q4_fear', prompt: 'How often have you felt afraid something bad might happen?', options: defaultOptions },
        ],
    },
    {
        slug: 'depression-check',
        title: 'Depression Check',
        description: 'A brief check-in for low mood and motivation patterns.',
        category: 'depression',
        introText: 'Answer based on your experience during the last two weeks.',
        outroText: 'This does not diagnose a condition and should not replace care.',
        estimatedDurationMinutes: 4,
        questions: [
            { key: 'q1_interest', prompt: 'How often have you had little interest or pleasure in things?', options: defaultOptions },
            { key: 'q2_down', prompt: 'How often have you felt down, depressed, or hopeless?', options: defaultOptions },
            { key: 'q3_energy', prompt: 'How often have you felt low energy or fatigue?', options: defaultOptions },
            { key: 'q4_selfworth', prompt: 'How often have you felt bad about yourself?', options: defaultOptions },
        ],
    },
    {
        slug: 'sleep-check',
        title: 'Sleep Check',
        description: 'A short assessment for sleep quality and disruption.',
        category: 'sleep',
        introText: 'Consider your sleep over the last two weeks.',
        outroText: 'These results are informational and support-oriented.',
        estimatedDurationMinutes: 3,
        questions: [
            { key: 'q1_fall_asleep', prompt: 'How often have you had trouble falling asleep?', options: defaultOptions },
            { key: 'q2_stay_asleep', prompt: 'How often have you had trouble staying asleep?', options: defaultOptions },
            { key: 'q3_tired_day', prompt: 'How often have you felt tired during the day due to sleep issues?', options: defaultOptions },
            { key: 'q4_sleep_worry', prompt: 'How often have you worried about your sleep quality?', options: defaultOptions },
        ],
    },
    {
        slug: 'burnout-check',
        title: 'Burnout Check',
        description: 'A quick assessment for signs of burnout and emotional exhaustion.',
        category: 'burnout',
        introText: 'Reflect on your recent week-to-week experience.',
        outroText: 'Your result can help you decide on supportive next actions.',
        estimatedDurationMinutes: 4,
        questions: [
            { key: 'q1_exhausted', prompt: 'How often have you felt emotionally exhausted?', options: defaultOptions },
            { key: 'q2_detached', prompt: 'How often have you felt detached from your work or responsibilities?', options: defaultOptions },
            { key: 'q3_effectiveness', prompt: 'How often have you felt less effective than usual?', options: defaultOptions },
            { key: 'q4_recovery', prompt: 'How often have you felt you are not recovering after rest?', options: defaultOptions },
        ],
    },
];
async function upsertAssessmentDefinition(prisma, definition) {
    const savedDefinition = await prisma.assessmentDefinition.upsert({
        where: {
            slug: definition.slug,
        },
        create: {
            slug: definition.slug,
            title: definition.title,
            description: definition.description,
            category: definition.category,
            status: client_1.AssessmentDefinitionStatus.ACTIVE,
            version: 1,
            introText: definition.introText,
            outroText: definition.outroText,
            isPublished: true,
            estimatedDurationMinutes: definition.estimatedDurationMinutes,
        },
        update: {
            title: definition.title,
            description: definition.description,
            category: definition.category,
            status: client_1.AssessmentDefinitionStatus.ACTIVE,
            introText: definition.introText,
            outroText: definition.outroText,
            isPublished: true,
            estimatedDurationMinutes: definition.estimatedDurationMinutes,
        },
    });
    for (const [questionIndex, question] of definition.questions.entries()) {
        const savedQuestion = await prisma.assessmentQuestion.upsert({
            where: {
                assessmentDefinitionId_key: {
                    assessmentDefinitionId: savedDefinition.id,
                    key: question.key,
                },
            },
            create: {
                assessmentDefinitionId: savedDefinition.id,
                key: question.key,
                prompt: question.prompt,
                description: null,
                order: questionIndex + 1,
                inputType: client_1.AssessmentQuestionInputType.SINGLE_CHOICE,
                isRequired: true,
            },
            update: {
                prompt: question.prompt,
                order: questionIndex + 1,
                inputType: client_1.AssessmentQuestionInputType.SINGLE_CHOICE,
                isRequired: true,
            },
        });
        for (const [optionIndex, option] of question.options.entries()) {
            await prisma.assessmentOption.upsert({
                where: {
                    assessmentQuestionId_key: {
                        assessmentQuestionId: savedQuestion.id,
                        key: option.key,
                    },
                },
                create: {
                    assessmentQuestionId: savedQuestion.id,
                    key: option.key,
                    label: option.label,
                    scoreValue: option.scoreValue,
                    order: optionIndex + 1,
                },
                update: {
                    label: option.label,
                    scoreValue: option.scoreValue,
                    order: optionIndex + 1,
                },
            });
        }
    }
}
exports.assessmentsSeedModule = {
    name: 'assessments',
    run: async (prisma) => {
        for (const definition of ASSESSMENTS) {
            await upsertAssessmentDefinition(prisma, definition);
        }
    },
};
//# sourceMappingURL=assessments.seed.js.map
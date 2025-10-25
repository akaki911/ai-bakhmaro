export const GURULO_CORE_VERSION = 'gurulo-core/v1';

export const GURULO_CORE_CONFIG = {
  version: GURULO_CORE_VERSION,
  salutation: 'კაკი',
  sectionOrder: ['task', 'plan', 'final', 'verification', 'warnings'] as const,
  sectionLabels: {
    ka: {
      task: 'დავალება',
      plan: 'გეგმა / განმარტება',
      final: 'საბოლოო პასუხი',
      verification: 'გადამოწმება',
      warnings: 'გაფრთხილებები',
    },
    en: {
      task: 'Task',
      plan: 'Plan / Explanation',
      final: 'Final',
      verification: 'Verification',
      warnings: 'Warnings',
    },
  },
  verificationFallback: {
    ka: 'გთხოვ გადაამოწმო ჩამოთვლილი ნაბიჯები და შემატყობინო შედეგი.',
    en: 'Please verify the listed steps and share the outcome.',
  },
  finalGreeting: {
    ka: 'გისმენ და მზად ვარ დაგეხმარო ნებისმიერ საკითხში.',
    en: "I'm ready to support you with the next step.",
  },
};

export type GuruloSectionKey = typeof GURULO_CORE_CONFIG.sectionOrder[number];

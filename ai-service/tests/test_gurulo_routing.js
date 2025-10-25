const { selectRoute, REDACTION_TOKEN } = require('../core/model-router.js');

describe('Gurulo Model Router', () => {
  test('selects deliberate route for deep reasoning and critical safety', () => {
    const decision = selectRoute(
      { reasoning: 'deep', speed: 'deliberate', vision: false, tools: ['code-interpreter', 'browser'] },
      { level: 'critical', allowVision: true, allowTools: true, complianceFlags: ['audit-log'] },
      { tier: 'premium', maxCredits: 40 },
    );

    expect(decision.routeId).toBe('gurulo.reasoning.deliberate');
    expect(decision.reasoning.allocated).toBe('deep');
    expect(decision.safety.escalate).toBe(true);
    expect(decision.adjustments).toEqual(expect.arrayContaining(['safety_review_required']));
    expect(decision.modalities.tools.granted).toEqual(['code-interpreter', 'browser']);
  });

  test('downgrades vision when budget is insufficient', () => {
    const decision = selectRoute(
      { reasoning: 'standard', speed: 'balanced', vision: true },
      { level: 'normal', allowVision: true, allowTools: true },
      { tier: 'economy', maxCredits: 4 },
    );

    expect(decision.routeId).toBe('gurulo.speed.rapid');
    expect(decision.modalities.vision.granted).toBe(false);
    expect(decision.adjustments).toEqual(
      expect.arrayContaining(['downgraded_for_budget', 'vision_downgraded_for_budget']),
    );
  });

  test('honors rapid preference when budget allows only lightweight routes', () => {
    const decision = selectRoute(
      { reasoning: 'minimal', speed: 'fast', vision: false },
      { level: 'normal', allowVision: true, allowTools: false },
      { tier: 'economy', maxCredits: 6 },
    );

    expect(decision.routeId).toBe('gurulo.speed.rapid');
    expect(decision.modalities.tools.allowedByPolicy).toBe(false);
    expect(decision.adjustments).toEqual(expect.arrayContaining(['tools_blocked_by_policy']));
    expect(decision.trace.length).toBeGreaterThan(0);
  });

  test('redacts vendor identifiers from decision payload', () => {
    const decision = selectRoute(
      { reasoning: 'standard', speed: 'balanced', vision: false, tools: ['retrieval', 'browser'] },
      { level: 'normal', allowVision: true, allowTools: true },
      { tier: 'standard', maxCredits: 12 },
    );

    const serialized = JSON.stringify(decision);
    ['openai', 'gpt-4.1', 'groq', 'mixtral', 'anthropic', 'claude'].forEach((token) => {
      expect(serialized.toLowerCase()).not.toContain(token);
    });
    expect(decision.trace.some((entry) => entry.includes(REDACTION_TOKEN))).toBe(true);
  });
});

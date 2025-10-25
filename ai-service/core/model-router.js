'use strict';

const REDACTION_TOKEN = '[redacted-model]';

const ROUTE_DEFINITIONS = {
  deliberate: {
    routeId: 'gurulo.reasoning.deliberate',
    label: 'გურულო — სიღრმისეული მსჯელობა',
    persona: 'gurulo-orchestrator',
    computeClass: 'premium',
    costTier: 'premium',
    estimatedCredits: 18,
    capabilities: {
      reasoning: 'deep',
      speed: 'deliberate',
      vision: true,
      tooling: 'advanced',
      toolLimit: Infinity,
    },
    vendor: 'openai',
    modelName: 'gpt-4.1-diligent',
  },
  vision: {
    routeId: 'gurulo.vision.balanced',
    label: 'გურულო — ხედვით ბალანსი',
    persona: 'gurulo-orchestrator',
    computeClass: 'premium',
    costTier: 'premium',
    estimatedCredits: 16,
    capabilities: {
      reasoning: 'standard',
      speed: 'balanced',
      vision: true,
      tooling: 'basic',
      toolLimit: 2,
    },
    vendor: 'openai',
    modelName: 'gpt-4.1-vision-mini',
  },
  balanced: {
    routeId: 'gurulo.reasoning.balanced',
    label: 'გურულო — ბალანსირებული პასუხი',
    persona: 'gurulo-orchestrator',
    computeClass: 'standard',
    costTier: 'standard',
    estimatedCredits: 8,
    capabilities: {
      reasoning: 'standard',
      speed: 'balanced',
      vision: false,
      tooling: 'basic',
      toolLimit: 2,
    },
    vendor: 'groq',
    modelName: 'mixtral-8x7b-gurulo',
  },
  rapid: {
    routeId: 'gurulo.speed.rapid',
    label: 'გურულო — სწრაფი პასუხი',
    persona: 'gurulo-orchestrator',
    computeClass: 'economy',
    costTier: 'economy',
    estimatedCredits: 4,
    capabilities: {
      reasoning: 'minimal',
      speed: 'fast',
      vision: false,
      tooling: 'none',
      toolLimit: 0,
    },
    vendor: 'anthropic',
    modelName: 'claude-3-haiku-gurulo',
  },
};

const BUDGET_LEVEL = {
  economy: 0,
  standard: 1,
  premium: 2,
};

const ALLOWED_REASONING = new Set(['minimal', 'standard', 'deep']);
const ALLOWED_SPEED = new Set(['fast', 'balanced', 'deliberate']);
const ALLOWED_BUDGET = new Set(['economy', 'standard', 'premium']);
const ALLOWED_SAFETY_LEVELS = new Set(['low', 'normal', 'elevated', 'critical']);

function normalizeTaskProfile(profile) {
  const defaults = {
    reasoning: 'standard',
    speed: 'balanced',
    vision: false,
    tools: [],
  };

  if (!profile || typeof profile !== 'object') {
    return defaults;
  }

  const normalized = { ...defaults };

  if (ALLOWED_REASONING.has(profile.reasoning)) {
    normalized.reasoning = profile.reasoning;
  }

  if (ALLOWED_SPEED.has(profile.speed)) {
    normalized.speed = profile.speed;
  }

  normalized.vision = Boolean(profile.vision);

  if (Array.isArray(profile.tools)) {
    normalized.tools = Array.from(
      new Set(
        profile.tools
          .map((tool) => (typeof tool === 'string' ? tool.trim() : ''))
          .filter(Boolean)
          .slice(0, 8),
      ),
    );
  }

  return normalized;
}

function normalizeSafetyContext(context) {
  const defaults = {
    level: 'normal',
    allowVision: true,
    allowTools: true,
    complianceFlags: [],
  };

  if (!context || typeof context !== 'object') {
    return defaults;
  }

  const normalized = { ...defaults };

  if (ALLOWED_SAFETY_LEVELS.has(context.level)) {
    normalized.level = context.level;
  }

  if (context.allowVision === false) {
    normalized.allowVision = false;
  }

  if (context.allowTools === false) {
    normalized.allowTools = false;
  }

  if (Array.isArray(context.complianceFlags)) {
    normalized.complianceFlags = Array.from(
      new Set(
        context.complianceFlags
          .map((flag) => (typeof flag === 'string' ? flag.trim() : ''))
          .filter(Boolean)
          .slice(0, 10),
      ),
    );
  }

  return normalized;
}

function normalizeCostBudget(budget) {
  const defaults = {
    tier: 'standard',
    maxCredits: Infinity,
  };

  if (!budget || typeof budget !== 'object') {
    return defaults;
  }

  const normalized = { ...defaults };

  if (ALLOWED_BUDGET.has(budget.tier)) {
    normalized.tier = budget.tier;
  }

  if (typeof budget.maxCredits === 'number' && Number.isFinite(budget.maxCredits) && budget.maxCredits >= 0) {
    normalized.maxCredits = budget.maxCredits;
  }

  return normalized;
}

function downgradeRoute(current) {
  if (!current) {
    return ROUTE_DEFINITIONS.balanced;
  }

  switch (current.routeId) {
    case ROUTE_DEFINITIONS.deliberate.routeId:
    case ROUTE_DEFINITIONS.vision.routeId:
      return ROUTE_DEFINITIONS.balanced;
    case ROUTE_DEFINITIONS.balanced.routeId:
      return ROUTE_DEFINITIONS.rapid;
    default:
      return current;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeString(value, tokens) {
  if (typeof value !== 'string') {
    return value;
  }

  return tokens.reduce((acc, token) => {
    if (!token) {
      return acc;
    }

    const pattern = new RegExp(escapeRegExp(token), 'gi');
    return acc.replace(pattern, REDACTION_TOKEN);
  }, value);
}

function sanitizeValue(value, tokens) {
  if (typeof value === 'string') {
    return sanitizeString(value, tokens);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry, tokens));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value).reduce((acc, key) => {
      acc[key] = sanitizeValue(value[key], tokens);
      return acc;
    }, Array.isArray(value) ? [] : {});
  }

  return value;
}

function selectRoute(taskProfile = {}, safetyContext = {}, costBudget = {}) {
  const profile = normalizeTaskProfile(taskProfile);
  const safety = normalizeSafetyContext(safetyContext);
  const budget = normalizeCostBudget(costBudget);

  const adjustmentSet = new Set();
  const rawTrace = [];

  const visionRequested = Boolean(profile.vision);
  const toolsRequested = profile.tools.length > 0;
  const toolsAllowed = safety.allowTools !== false;
  const visionAllowed = safety.allowVision !== false;

  if (visionRequested && !visionAllowed) {
    adjustmentSet.add('vision_blocked_by_policy');
    rawTrace.push('Vision request blocked by policy constraints.');
  }

  if (toolsRequested && !toolsAllowed) {
    adjustmentSet.add('tools_blocked_by_policy');
    rawTrace.push('Tooling request blocked by policy constraints.');
  }

  const requiresDeepReasoning = profile.reasoning === 'deep' || safety.level === 'elevated' || safety.level === 'critical';
  const prefersRapid = profile.speed === 'fast';
  const wantsVision = visionRequested && visionAllowed;
  const wantsTools = toolsRequested && toolsAllowed;

  let candidate;

  if (requiresDeepReasoning) {
    candidate = ROUTE_DEFINITIONS.deliberate;
    rawTrace.push('Reasoning requirement escalated route to deliberate tier.');
  } else if (wantsVision) {
    candidate = ROUTE_DEFINITIONS.vision;
    rawTrace.push('Vision capability requested; selecting vision route.');
  } else if (prefersRapid) {
    candidate = ROUTE_DEFINITIONS.rapid;
    rawTrace.push('Fast response requested; selecting rapid route.');
  } else {
    candidate = ROUTE_DEFINITIONS.balanced;
    rawTrace.push('Falling back to balanced route.');
  }

  if (wantsTools && candidate.capabilities.tooling === 'none') {
    candidate = ROUTE_DEFINITIONS.deliberate;
    rawTrace.push('Upgrading to deliberate route to unlock tool support.');
  }

  let downgraded = false;
  while (
    BUDGET_LEVEL[candidate.costTier] > BUDGET_LEVEL[budget.tier] ||
    candidate.estimatedCredits > budget.maxCredits
  ) {
    const downgradedCandidate = downgradeRoute(candidate);
    if (downgradedCandidate === candidate) {
      break;
    }
    candidate = downgradedCandidate;
    downgraded = true;
    rawTrace.push('Budget constraint triggered route downgrade.');
  }

  if (downgraded) {
    adjustmentSet.add('downgraded_for_budget');
  }

  const grantedVision = candidate.capabilities.vision && wantsVision;
  const toolLimit = typeof candidate.capabilities.toolLimit === 'number' && Number.isFinite(candidate.capabilities.toolLimit)
    ? candidate.capabilities.toolLimit
    : profile.tools.length;

  let grantedTools = [];
  if (toolsAllowed && candidate.capabilities.tooling !== 'none') {
    grantedTools = profile.tools.slice(0, toolLimit);
    if (profile.tools.length > grantedTools.length) {
      adjustmentSet.add('tool_limit_applied');
      rawTrace.push('Applied tool limit to requested tools.');
    }
  } else if (toolsRequested && toolsAllowed && candidate.capabilities.tooling === 'none') {
    adjustmentSet.add('tools_not_supported_by_route');
  }

  if (visionRequested && visionAllowed && !grantedVision) {
    adjustmentSet.add('vision_downgraded_for_budget');
    rawTrace.push('Vision request could not be satisfied after budget downgrade.');
  }

  if (safety.level === 'critical') {
    adjustmentSet.add('safety_review_required');
    rawTrace.push('Critical safety level flagged for human review.');
  }

  rawTrace.push(`Internal candidate uses ${candidate.vendor}/${candidate.modelName}.`);

  const vendorTokens = [candidate.vendor, candidate.modelName].filter(Boolean);
  const sanitizedTrace = rawTrace.map((entry) => sanitizeString(entry, vendorTokens));

  const decision = {
    routeId: candidate.routeId,
    label: candidate.label,
    persona: candidate.persona,
    computeClass: candidate.computeClass,
    reasoning: {
      requested: profile.reasoning,
      allocated: candidate.capabilities.reasoning,
    },
    speed: {
      requested: profile.speed,
      allocated: candidate.capabilities.speed,
    },
    modalities: {
      vision: {
        requested: visionRequested,
        allowedByPolicy: visionAllowed,
        granted: grantedVision,
      },
      tools: {
        requested: profile.tools,
        allowedByPolicy: toolsAllowed,
        granted: grantedTools,
        limit: Number.isFinite(toolLimit) ? toolLimit : null,
      },
    },
    cost: {
      tier: candidate.costTier,
      estimatedCredits: candidate.estimatedCredits,
      budgetTier: budget.tier,
      maxCredits: Number.isFinite(budget.maxCredits) ? budget.maxCredits : null,
    },
    safety: {
      level: safety.level,
      escalate: safety.level === 'critical',
      allowVision: visionAllowed,
      allowTools: toolsAllowed,
      notes: safety.complianceFlags,
    },
    adjustments: Array.from(adjustmentSet),
    trace: sanitizedTrace,
  };

  return sanitizeValue(decision, vendorTokens);
}

module.exports = {
  selectRoute,
  REDACTION_TOKEN,
};

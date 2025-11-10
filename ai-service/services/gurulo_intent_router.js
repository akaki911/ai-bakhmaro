'use strict';

const { isGreetingMessage, normalizeMessageForGreeting } = require('../utils/greeting_utils');

const DEFAULT_CONFIDENCE = 0.75;

const KEYWORD_GROUPS = {
  automation: ['automation', 'ops', 'trusted ops', 'auto-update', 'script execution', 'deploy pipeline'],
  monitoring: ['monitoring', 'metrics', 'watchdog', 'latency', 'health', 'alert'],
  resources: ['cost', 'billing', 'usage', 'quota', 'compute', 'pricing'],
  policies: ['policy', 'rule', 'guideline', 'permission', 'security'],
  support: ['support', 'contact', 'help desk', 'issue'],
  transport: ['transport', 'road', 'travel'],
  attractions: ['attraction', 'tour', 'sightseeing'],
  legacy: ['legacy', 'deprecated', 'old feature', 'archived module', 'removed feature'],
};

const containsKeyword = (text = '', keywords = []) =>
  keywords.some((keyword) => text.includes(keyword));

function detectIntent(message = '', options = {}) {
  const safeMessage = typeof message === 'string' ? message : '';
  const normalized = safeMessage.toLowerCase();
  const normalizedForGreeting = normalizeMessageForGreeting(safeMessage);

  if (isGreetingMessage(safeMessage, normalizedForGreeting)) {
    return { name: 'greeting', confidence: DEFAULT_CONFIDENCE, params: {}, missingParams: [] };
  }

  if (/^(როგორ\s+ხარ|რა\s+ხდება|როგორა|რა\s+ამბავი|how\s+are\s+you)\s*[!?]*$/i.test(normalized)) {
    return { name: 'smalltalk', confidence: DEFAULT_CONFIDENCE, params: {}, missingParams: [] };
  }

  if (containsKeyword(normalized, KEYWORD_GROUPS.automation)) {
    return { name: 'check_availability', confidence: DEFAULT_CONFIDENCE, params: {}, missingParams: [] };
  }

  if (containsKeyword(normalized, KEYWORD_GROUPS.monitoring)) {
    return { name: 'weather_info', confidence: DEFAULT_CONFIDENCE, params: {}, missingParams: [] };
  }

  if (containsKeyword(normalized, KEYWORD_GROUPS.resources)) {
    return { name: 'pricing_info', confidence: DEFAULT_CONFIDENCE, params: {}, missingParams: [] };
  }

  if (containsKeyword(normalized, KEYWORD_GROUPS.policies)) {
    return { name: 'policies_faq', confidence: DEFAULT_CONFIDENCE, params: {}, missingParams: [] };
  }

  if (containsKeyword(normalized, KEYWORD_GROUPS.support)) {
    return { name: 'contact_support', confidence: DEFAULT_CONFIDENCE, params: {}, missingParams: [] };
  }

  if (containsKeyword(normalized, KEYWORD_GROUPS.transport) || containsKeyword(normalized, KEYWORD_GROUPS.attractions)) {
    return { name: 'transport', confidence: DEFAULT_CONFIDENCE, params: {}, missingParams: [] };
  }

  if (containsKeyword(normalized, KEYWORD_GROUPS.legacy)) {
    return { name: 'legacy_feature', confidence: DEFAULT_CONFIDENCE, params: {}, missingParams: [] };
  }

  if (/roadmap|plan|steps|next action|შემდგომი ნაბიჯ/i.test(safeMessage)) {
    return { name: 'trip_plan', confidence: DEFAULT_CONFIDENCE, params: {}, missingParams: [] };
  }

  return { name: 'general_query', confidence: 0.5, params: {}, missingParams: [] };
}

module.exports = {
  detectIntent,
};

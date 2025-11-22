'use strict';

const crypto = require('crypto');

const MEMORY_SCOPES = Object.freeze({
  USER: 'user',
  ORG: 'org',
  SYSTEM: 'system',
});

const ROLE_VISIBILITY = Object.freeze({
  USER: 'user',
  ORG_ADMIN: 'org_admin',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  SYSTEM: 'system',
});

const DEFAULT_RETENTION_POLICIES = Object.freeze({
  [MEMORY_SCOPES.USER]: Object.freeze({
    id: 'user-default',
    ttlDays: 180,
    reviewDays: 30,
    pii: 'user',
  }),
  [MEMORY_SCOPES.ORG]: Object.freeze({
    id: 'org-default',
    ttlDays: 365,
    reviewDays: 90,
    pii: 'mixed',
  }),
  [MEMORY_SCOPES.SYSTEM]: Object.freeze({
    id: 'system-default',
    ttlDays: 1095,
    reviewDays: 365,
    pii: 'system',
  }),
});

function normalizeScope(scope) {
  if (!scope) {
    return MEMORY_SCOPES.USER;
  }

  const normalized = String(scope).toLowerCase();
  if (normalized === 'user' || normalized === MEMORY_SCOPES.USER) {
    return MEMORY_SCOPES.USER;
  }
  if (normalized === 'org' || normalized === 'organisation' || normalized === 'organization') {
    return MEMORY_SCOPES.ORG;
  }
  if (normalized === 'system') {
    return MEMORY_SCOPES.SYSTEM;
  }

  return MEMORY_SCOPES.USER;
}

function resolveRetentionPolicy(scope, overrides = {}) {
  const normalizedScope = normalizeScope(scope);
  const basePolicy = DEFAULT_RETENTION_POLICIES[normalizedScope] || DEFAULT_RETENTION_POLICIES[MEMORY_SCOPES.USER];
  if (!overrides) {
    return { ...basePolicy };
  }
  return {
    ...basePolicy,
    ...overrides,
    id: overrides.id || basePolicy.id,
  };
}

function computeExpiryDate(policy, createdAt = new Date()) {
  const ttlDays = Number(policy?.ttlDays || 0);
  if (!ttlDays || Number.isNaN(ttlDays) || ttlDays <= 0) {
    return null;
  }
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const expires = new Date(created.getTime());
  expires.setUTCDate(expires.getUTCDate() + ttlDays);
  return expires.toISOString();
}

function computeReviewDate(policy, createdAt = new Date()) {
  const reviewDays = Number(policy?.reviewDays || 0);
  if (!reviewDays || Number.isNaN(reviewDays) || reviewDays <= 0) {
    return null;
  }
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const review = new Date(created.getTime());
  review.setUTCDate(review.getUTCDate() + reviewDays);
  return review.toISOString();
}

function isExpired(retention = {}) {
  if (!retention || !retention.expiresAt) {
    return false;
  }
  const expiryDate = new Date(retention.expiresAt);
  if (Number.isNaN(expiryDate.getTime())) {
    return false;
  }
  return expiryDate.getTime() <= Date.now();
}

function createMemoryRecord({
  scope,
  subject,
  payload,
  tags = [],
  visibility,
  retention,
  actor,
  createdAt,
  updatedAt,
  metadata = {},
  id,
}) {
  const normalizedScope = normalizeScope(scope);
  const now = new Date();
  const created = createdAt ? new Date(createdAt) : now;
  const updated = updatedAt ? new Date(updatedAt) : now;

  const policy = resolveRetentionPolicy(normalizedScope, retention?.policy || retention);
  const recordRetention = {
    policyId: policy.id,
    ttlDays: policy.ttlDays,
    reviewDays: policy.reviewDays || null,
    expiresAt: retention?.expiresAt || computeExpiryDate(policy, created),
    reviewAt: retention?.reviewAt || computeReviewDate(policy, created),
  };

  const actorPayload = actor && typeof actor === 'object'
    ? {
        type: actor.type || 'system',
        id: actor.id || null,
        label: actor.label || null,
      }
    : { type: 'system', id: null, label: null };

  const sanitizedTags = Array.isArray(tags)
    ? Array.from(new Set(tags.map(tag => String(tag).trim()).filter(Boolean)))
    : [];

  const allowedVisibility = Array.isArray(visibility) && visibility.length
    ? Array.from(new Set(
        visibility
          .map(role => String(role || '').toLowerCase().trim())
          .filter(Boolean)
      ))
    : [ROLE_VISIBILITY.USER, ROLE_VISIBILITY.ADMIN, ROLE_VISIBILITY.SUPER_ADMIN];

  return {
    id: id || crypto.randomUUID(),
    scope: normalizedScope,
    subject: String(subject || '').trim(),
    payload: payload && typeof payload === 'object' ? { ...payload } : { value: payload },
    tags: sanitizedTags,
    visibility: allowedVisibility,
    retention: recordRetention,
    actor: actorPayload,
    metadata: { ...metadata },
    createdAt: created.toISOString(),
    updatedAt: updated.toISOString(),
  };
}

module.exports = {
  MEMORY_SCOPES,
  ROLE_VISIBILITY,
  DEFAULT_RETENTION_POLICIES,
  normalizeScope,
  resolveRetentionPolicy,
  computeExpiryDate,
  computeReviewDate,
  isExpired,
  createMemoryRecord,
};

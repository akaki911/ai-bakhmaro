'use strict';

const {
  MEMORY_SCOPES,
  ROLE_VISIBILITY,
  DEFAULT_RETENTION_POLICIES,
  normalizeScope,
  resolveRetentionPolicy,
  computeExpiryDate,
  computeReviewDate,
  isExpired,
  createMemoryRecord,
} = require('./memory.contracts.js');

function unique(values = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

class GuruloMemorySDK {
  constructor(adapter, options = {}) {
    if (!adapter || typeof adapter !== 'object') {
      throw new Error('GuruloMemorySDK requires a storage adapter');
    }

    this.adapter = adapter;
    this.retentionPolicies = {
      ...DEFAULT_RETENTION_POLICIES,
      ...(options.retentionPolicies || {}),
    };
  }

  async write(recordInput) {
    const normalizedScope = normalizeScope(recordInput.scope);
    const policy = resolveRetentionPolicy(normalizedScope, recordInput.retention?.policy || recordInput.retention);
    const createdRecord = createMemoryRecord({
      ...recordInput,
      scope: normalizedScope,
      retention: {
        ...recordInput.retention,
        policy,
        expiresAt: recordInput.retention?.expiresAt || computeExpiryDate(policy),
        reviewAt: recordInput.retention?.reviewAt || computeReviewDate(policy),
      },
    });

    await this.adapter.write(createdRecord);
    return createdRecord;
  }

  async read(scope, subject, options = {}) {
    const normalizedScope = normalizeScope(scope);
    const context = this.#normalizeContext(options);
    const records = await this.adapter.read(normalizedScope, subject, context);

    const filtered = context.superAdmin
      ? records
      : records.filter(record => this.#recordMatchesContext(record, context));

    const sorted = filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (typeof context.limit === 'number' && context.limit > 0) {
      return sorted.slice(0, context.limit);
    }

    return sorted;
  }

  async delete(scope, subject, recordId) {
    const normalizedScope = normalizeScope(scope);
    return this.adapter.delete(normalizedScope, subject, recordId);
  }

  async listSubjects(scope) {
    const normalizedScope = normalizeScope(scope);
    return this.adapter.listSubjects(normalizedScope);
  }

  async enforceRetention(scope, subject, options = {}) {
    const normalizedScope = normalizeScope(scope);
    const records = await this.adapter.read(normalizedScope, subject, options);
    const expired = records.filter(item => isExpired(item.retention));

    if (!expired.length) {
      return { purged: 0 };
    }

    await Promise.all(
      expired.map(record => this.adapter.delete(normalizedScope, subject, record.id))
    );

    return { purged: expired.length };
  }

  #normalizeContext(options) {
    const roles = Array.isArray(options.roles)
      ? unique(options.roles.map(role => String(role).toLowerCase()))
      : [];

    return {
      roles,
      tags: Array.isArray(options.tags) ? unique(options.tags.map(tag => String(tag))) : undefined,
      includeExpired: Boolean(options.includeExpired),
      superAdmin: Boolean(options.superAdmin),
      limit: typeof options.limit === 'number' ? options.limit : undefined,
    };
  }

  #recordMatchesContext(record, context) {
    if (!context.includeExpired && isExpired(record.retention)) {
      return false;
    }

    if (context.tags && context.tags.length) {
      const recordTags = Array.isArray(record.tags) ? record.tags.map(tag => String(tag)) : [];
      const hasTag = context.tags.some(tag => recordTags.includes(tag));
      if (!hasTag) {
        return false;
      }
    }

    if (!context.roles.length) {
      return true;
    }

    const visibility = Array.isArray(record.visibility) ? record.visibility : [ROLE_VISIBILITY.USER];
    return visibility.some(role => context.roles.includes(role));
  }
}

module.exports = {
  GuruloMemorySDK,
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

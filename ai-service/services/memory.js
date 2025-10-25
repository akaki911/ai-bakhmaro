'use strict';

const path = require('path');
const {
  GuruloMemorySDK,
  FilesystemMemoryAdapter,
  FirestoreMemoryAdapter,
  MEMORY_SCOPES,
  ROLE_VISIBILITY,
  createMemoryRecord,
  isExpired,
} = require('../../shared/gurulo-memory');

function createAdapter(options = {}) {
  if (options.adapter) {
    return options.adapter;
  }

  const backend = (options.backend || process.env.GURULO_MEMORY_BACKEND || '').toLowerCase();
  if (backend === 'firestore' && options.firestore) {
    return new FirestoreMemoryAdapter({ firestore: options.firestore, collection: options.collection });
  }

  const basePath = options.basePath || process.env.MEMORY_STORAGE_PATH || path.resolve(process.cwd(), 'memory_data');
  return new FilesystemMemoryAdapter({ basePath });
}

class MemoryService {
  constructor(options = {}) {
    this.adapter = createAdapter(options);
    this.superAdminIds = new Set((options.superAdminIds || []).map(String));
    this.sdk = new GuruloMemorySDK(this.adapter, {
      retentionPolicies: options.retentionPolicies,
    });
  }

  async write(entry) {
    return this.sdk.write(entry);
  }

  async read(scope, subject, context = {}) {
    const normalizedContext = this.#normalizeContext(context);
    const records = await this.sdk.read(scope, subject, normalizedContext);
    return {
      records,
      aggregated: this.#aggregate(records),
      hasExpired: records.some(record => isExpired(record.retention)),
    };
  }

  async remove(scope, subject, recordId) {
    return this.sdk.delete(scope, subject, recordId);
  }

  async list(scope) {
    return this.sdk.listSubjects(scope);
  }

  async enforce(scope, subject, context = {}) {
    return this.sdk.enforceRetention(scope, subject, context);
  }

  async appendUserText(userId, text, options = {}) {
    if (!text || typeof text !== 'string') {
      return null;
    }

    const payload = { text: text.trim(), source: options.source || 'conversation' };
    const record = await this.write({
      scope: MEMORY_SCOPES.USER,
      subject: userId,
      payload,
      tags: options.tags || ['conversation'],
      visibility: options.visibility || [ROLE_VISIBILITY.USER, ROLE_VISIBILITY.ADMIN, ROLE_VISIBILITY.SUPER_ADMIN],
      actor: options.actor || { type: 'system', id: null, label: 'ai-service' },
    });

    return record;
  }

  async getUserMemory(userId, context = {}) {
    const result = await this.read(MEMORY_SCOPES.USER, userId, context);
    return {
      data: result.aggregated,
      records: result.records,
      hasExpired: result.hasExpired,
      timestamp: new Date().toISOString(),
    };
  }

  #normalizeContext(context) {
    const roles = new Set();
    const providedRoles = Array.isArray(context.roles) ? context.roles : [];
    for (const role of providedRoles) {
      if (typeof role === 'string' && role.trim()) {
        roles.add(role.toLowerCase());
      }
    }

    if (context.userId && this.superAdminIds.has(String(context.userId))) {
      return { ...context, roles: Array.from(roles), superAdmin: true };
    }

    const superAdmin = Boolean(context.superAdmin);
    return { ...context, roles: Array.from(roles), superAdmin };
  }

  #aggregate(records = []) {
    return records
      .map(record => {
        if (!record?.payload) {
          return '';
        }
        if (typeof record.payload.text === 'string') {
          return record.payload.text;
        }
        if (typeof record.payload.value === 'string') {
          return record.payload.value;
        }
        return JSON.stringify(record.payload);
      })
      .filter(Boolean)
      .join('\n');
  }
}

function createMemoryService(options = {}) {
  return new MemoryService(options);
}

module.exports = {
  MemoryService,
  createMemoryService,
  MEMORY_SCOPES,
  ROLE_VISIBILITY,
  createMemoryRecord,
};

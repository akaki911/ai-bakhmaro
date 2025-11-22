'use strict';

const { normalizeScope } = require('../memory.contracts.js');

class RedisMemoryAdapter {
  constructor(options = {}) {
    this.client = options.client;
    this.namespace = options.namespace || 'gurulo:memory';
    if (!this.client) {
      throw new Error('RedisMemoryAdapter requires a Redis client');
    }
  }

  #key(scope, subject) {
    const normalizedScope = normalizeScope(scope);
    return `${this.namespace}:${normalizedScope}:${subject}`;
  }

  async read(scope, subject) {
    const key = this.#key(scope, subject);
    const raw = await this.client.get(key);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('RedisMemoryAdapter: failed to parse payload, resetting key', { key, error: error.message });
      await this.client.del(key);
      return [];
    }
  }

  async write(record) {
    const key = this.#key(record.scope, record.subject);
    const existing = await this.read(record.scope, record.subject);
    const index = existing.findIndex(item => item.id === record.id);

    if (index >= 0) {
      existing[index] = record;
    } else {
      existing.push(record);
    }

    await this.client.set(key, JSON.stringify(existing));
  }

  async delete(scope, subject, recordId) {
    const key = this.#key(scope, subject);
    const existing = await this.read(scope, subject);
    const filtered = existing.filter(item => item.id !== recordId);
    await this.client.set(key, JSON.stringify(filtered));
    return filtered.length !== existing.length;
  }

  async listSubjects(scope) {
    const normalizedScope = normalizeScope(scope);
    const pattern = `${this.namespace}:${normalizedScope}:*`;
    const keys = await this.client.keys(pattern);
    return keys.map(key => key.split(':').pop());
  }
}

module.exports = {
  RedisMemoryAdapter,
};

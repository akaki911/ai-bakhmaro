'use strict';

const fs = require('fs').promises;
const path = require('path');
const { normalizeScope } = require('../memory.contracts.js');

class FilesystemMemoryAdapter {
  constructor(options = {}) {
    this.basePath = options.basePath || path.resolve(process.cwd(), 'memory_data');
    this.encoding = options.encoding || 'utf8';
    this.fs = options.fs || fs;
  }

  async #ensureScopeDir(scope) {
    const scopeDir = path.join(this.basePath, scope);
    await this.fs.mkdir(scopeDir, { recursive: true });
    return scopeDir;
  }

  #resolveFilePath(scope, subject) {
    const normalizedScope = normalizeScope(scope);
    const sanitizedSubject = String(subject || 'unknown').replace(/[^a-zA-Z0-9_-]+/g, '_');
    return path.join(this.basePath, normalizedScope, `${sanitizedSubject}.json`);
  }

  async read(scope, subject) {
    const filePath = this.#resolveFilePath(scope, subject);

    try {
      const raw = await this.fs.readFile(filePath, this.encoding);
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      if (Array.isArray(parsed?.records)) {
        return parsed.records;
      }
      return [];
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async write(record) {
    const filePath = this.#resolveFilePath(record.scope, record.subject);
    await this.#ensureScopeDir(record.scope);

    const existing = await this.read(record.scope, record.subject);
    const index = existing.findIndex(item => item.id === record.id);

    if (index >= 0) {
      existing[index] = record;
    } else {
      existing.push(record);
    }

    await this.fs.writeFile(filePath, JSON.stringify(existing, null, 2), this.encoding);
  }

  async delete(scope, subject, recordId) {
    const filePath = this.#resolveFilePath(scope, subject);
    try {
      const existing = await this.read(scope, subject);
      const filtered = existing.filter(item => item.id !== recordId);
      await this.fs.writeFile(filePath, JSON.stringify(filtered, null, 2), this.encoding);
      return filtered.length !== existing.length;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  async listSubjects(scope) {
    const scopeDir = await this.#ensureScopeDir(scope);
    const files = await this.fs.readdir(scopeDir);
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace(/\.json$/i, ''));
  }
}

module.exports = {
  FilesystemMemoryAdapter,
};

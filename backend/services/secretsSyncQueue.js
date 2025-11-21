const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

const STORAGE_PATH = path.join(__dirname, '..', 'data', 'secrets_sync_queue.json');

class SecretsSyncQueue {
  constructor() {
    this.pending = new Set();
    // Only load if not in production
    if (!isProduction) {
      this.load();
    }
  }

  load() {
    try {
      if (!fs.existsSync(STORAGE_PATH)) {
        // Only create directory/file if not in production
        if (!isProduction) {
          fs.mkdirSync(path.dirname(STORAGE_PATH), { recursive: true });
          fs.writeFileSync(STORAGE_PATH, JSON.stringify({ pending: [] }, null, 2));
        }
        this.pending = new Set();
        return;
      }

      const payload = fs.readFileSync(STORAGE_PATH, 'utf8');
      if (!payload.trim()) {
        this.pending = new Set();
        return;
      }

      const data = JSON.parse(payload);
      if (data && Array.isArray(data.pending)) {
        this.pending = new Set(data.pending.filter((key) => typeof key === 'string'));
      } else {
        this.pending = new Set();
      }
    } catch (error) {
      // Only warn if not in production
      if (!isProduction) {
        console.warn('⚠️ [SecretsSyncQueue] Failed to load queue:', error.message);
      }
      this.pending = new Set();
    }
  }

  async persist() {
    // Only persist if not in production
    if (isProduction) {
      return;
    }
    const serialised = JSON.stringify({ pending: Array.from(this.pending) }, null, 2);
    await fsp.writeFile(STORAGE_PATH, `${serialised}\n`, 'utf8');
  }

  async add(key) {
    if (isProduction || !key) return; // No-op in production
    this.pending.add(key);
    await this.persist();
  }

  async remove(keys = []) {
    if (isProduction) return; // No-op in production
    let mutated = false;
    for (const key of keys) {
      if (this.pending.delete(key)) {
        mutated = true;
      }
    }
    if (mutated) {
      await this.persist();
    }
  }

  async clear() {
    if (isProduction || this.pending.size === 0) { // No-op in production
      return;
    }
    this.pending = new Set();
    await this.persist();
  }

  list() {
    return Array.from(this.pending);
  }
}

if (isProduction) {
  module.exports = {
    add: async () => {},
    remove: async () => {},
    clear: async () => {},
    list: () => []
  };
} else {
  module.exports = new SecretsSyncQueue();
}
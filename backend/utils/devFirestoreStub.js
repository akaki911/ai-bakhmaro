const fs = require('fs');
const path = require('path');

const DOC_DATA_KEY = '__data';
const DOC_COLLECTIONS_KEY = '__collections';

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const sanitizeForStorage = (value) => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value && typeof value.toDate === 'function') {
    try {
      return value.toDate().toISOString();
    } catch (error) {
      return new Date().toISOString();
    }
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeForStorage);
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value).map(([key, entryValue]) => [key, sanitizeForStorage(entryValue)]);
    return Object.fromEntries(entries);
  }

  return value;
};

const deepMerge = (target, source) => {
  if (!target || typeof target !== 'object') {
    return sanitizeForStorage(source);
  }

  const merged = Array.isArray(target) ? target.slice() : { ...target };

  Object.entries(source || {}).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      merged[key] = deepMerge(merged[key], value);
    } else {
      merged[key] = sanitizeForStorage(value);
    }
  });

  return merged;
};

const loadState = (storagePath) => {
  if (!storagePath || !fs.existsSync(storagePath)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(storagePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[DevFirestore] Failed to load persisted state:', error.message);
    return {};
  }
};

const persistState = (storagePath, state) => {
  if (!storagePath) {
    return;
  }

  try {
    ensureDir(path.dirname(storagePath));
    fs.writeFileSync(storagePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  } catch (error) {
    console.warn('[DevFirestore] Failed to persist state:', error.message);
  }
};

const getDocContainer = (state, segments, create = false) => {
  if (!Array.isArray(segments) || segments.length % 2 !== 0 || segments.length === 0) {
    return null;
  }

  let cursor = state;
  for (let i = 0; i < segments.length; i += 2) {
    const collectionName = segments[i];
    const docId = segments[i + 1];
    if (!collectionName || !docId) {
      return null;
    }

    if (!cursor[collectionName]) {
      if (!create) {
        return null;
      }
      cursor[collectionName] = {};
    }

    const collection = cursor[collectionName];
    if (!collection[docId]) {
      if (!create) {
        return null;
      }
      collection[docId] = { [DOC_DATA_KEY]: {}, [DOC_COLLECTIONS_KEY]: {} };
    }

    if (i + 2 >= segments.length) {
      return collection[docId];
    }

    cursor = collection[docId][DOC_COLLECTIONS_KEY];
  }

  return null;
};

const getCollectionContainer = (state, segments, create = false) => {
  if (!Array.isArray(segments) || segments.length === 0) {
    return null;
  }

  if (segments.length === 1) {
    const name = segments[0];
    if (!state[name]) {
      if (!create) {
        return null;
      }
      state[name] = {};
    }
    return state[name];
  }

  const docSegments = segments.slice(0, -1);
  const collectionName = segments[segments.length - 1];
  const docContainer = getDocContainer(state, docSegments, create);

  if (!docContainer) {
    return null;
  }

  if (!docContainer[DOC_COLLECTIONS_KEY][collectionName]) {
    if (!create) {
      return null;
    }
    docContainer[DOC_COLLECTIONS_KEY][collectionName] = {};
  }

  return docContainer[DOC_COLLECTIONS_KEY][collectionName];
};

class DevDocumentSnapshot {
  constructor(ref, data) {
    this.ref = ref;
    this.id = ref.id;
    this._data = data ? clone(data) : null;
    this.exists = Boolean(data);
  }

  data() {
    return this._data ? clone(this._data) : undefined;
  }
}

const toComparable = (value) => {
  if (value === undefined || value === null) {
    return 0;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
    return value;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (value && typeof value.toDate === 'function') {
    try {
      return value.toDate().getTime();
    } catch (error) {
      return Date.now();
    }
  }

  return value;
};

class DevQuerySnapshot {
  constructor(docs) {
    this.docs = docs;
    this.size = docs.length;
    this.empty = docs.length === 0;
  }

  forEach(callback) {
    this.docs.forEach(callback);
  }
}

class DevDocumentReference {
  constructor(db, segments) {
    this._db = db;
    this._segments = segments;
    this.id = segments[segments.length - 1];
  }

  collection(name) {
    const collectionSegments = this._segments.concat(name);
    this._db._ensureCollection(collectionSegments);
    return new DevCollectionReference(this._db, collectionSegments);
  }

  async set(data, options = {}) {
    const container = this._db._ensureDoc(this._segments);
    const sanitized = sanitizeForStorage(data);

    if (options && options.merge) {
      container[DOC_DATA_KEY] = deepMerge(container[DOC_DATA_KEY], sanitized);
    } else {
      container[DOC_DATA_KEY] = sanitizeForStorage(sanitized);
    }

    this._db._persist();
  }

  async get() {
    const container = this._db._getDoc(this._segments);
    const data = container ? container[DOC_DATA_KEY] : null;
    return new DevDocumentSnapshot(this, data);
  }

  async delete() {
    const collectionSegments = this._segments.slice(0, -1);
    const docId = this.id;
    const container = this._db._getCollection(collectionSegments);

    if (container && container[docId]) {
      delete container[docId];
      this._db._persist();
    }
  }
}

class DevCollectionReference {
  constructor(db, segments, constraints = {}) {
    this._db = db;
    this._segments = segments;
    this._constraints = constraints;
  }

  doc(id) {
    this._db._ensureCollection(this._segments);
    const docSegments = this._segments.concat(id);
    return new DevDocumentReference(this._db, docSegments);
  }

  orderBy(field, direction = 'asc') {
    const nextConstraints = { ...this._constraints, orderBy: { field, direction } };
    return new DevCollectionReference(this._db, this._segments, nextConstraints);
  }

  limit(count) {
    const nextConstraints = { ...this._constraints, limit: count };
    return new DevCollectionReference(this._db, this._segments, nextConstraints);
  }

  async get() {
    const container = this._db._getCollection(this._segments) || {};
    const docs = Object.entries(container).map(([id, payload]) => {
      const docRef = new DevDocumentReference(this._db, this._segments.concat(id));
      return new DevDocumentSnapshot(docRef, payload[DOC_DATA_KEY]);
    });

    const { orderBy, limit } = this._constraints;
    let sorted = docs;

    if (orderBy && orderBy.field) {
      const { field, direction } = orderBy;
      sorted = docs.slice().sort((a, b) => {
        const aValue = toComparable(a.data()?.[field]);
        const bValue = toComparable(b.data()?.[field]);
        if (aValue < bValue) return direction === 'desc' ? 1 : -1;
        if (aValue > bValue) return direction === 'desc' ? -1 : 1;
        return 0;
      });
    }

    if (Number.isFinite(limit) && limit > 0) {
      sorted = sorted.slice(0, limit);
    }

    return new DevQuerySnapshot(sorted);
  }
}

class DevFirestore {
  constructor(options = {}) {
    this._storagePath = options.storagePath || null;
    this._state = loadState(this._storagePath);
    this.__isDevFirestoreStub = true;
  }

  collection(name) {
    return new DevCollectionReference(this, [name]);
  }

  _ensureCollection(segments) {
    return getCollectionContainer(this._state, segments, true);
  }

  _getCollection(segments) {
    return getCollectionContainer(this._state, segments, false);
  }

  _ensureDoc(segments) {
    return getDocContainer(this._state, segments, true);
  }

  _getDoc(segments) {
    return getDocContainer(this._state, segments, false);
  }

  _persist() {
    persistState(this._storagePath, this._state);
  }
}

const createDevFirestore = (options = {}) => new DevFirestore(options);

module.exports = {
  createDevFirestore,
};

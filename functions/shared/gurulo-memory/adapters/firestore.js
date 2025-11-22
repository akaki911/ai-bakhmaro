'use strict';

const { normalizeScope } = require('../memory.contracts.js');

class FirestoreMemoryAdapter {
  constructor(options = {}) {
    this.firestore = options.firestore;
    this.collection = options.collection || 'gurulo_memories';

    if (!this.firestore) {
      throw new Error('FirestoreMemoryAdapter requires a Firestore instance');
    }
  }

  #collectionRef() {
    return this.firestore.collection(this.collection);
  }

  async write(record) {
    const docId = `${record.scope}:${record.subject}:${record.id}`;
    await this.#collectionRef().doc(docId).set({ ...record }, { merge: false });
  }

  async read(scope, subject) {
    const normalizedScope = normalizeScope(scope);
    const snapshot = await this.#collectionRef()
      .where('scope', '==', normalizedScope)
      .where('subject', '==', subject)
      .get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map(doc => doc.data());
  }

  async delete(scope, subject, recordId) {
    const normalizedScope = normalizeScope(scope);
    const docId = `${normalizedScope}:${subject}:${recordId}`;
    await this.#collectionRef().doc(docId).delete();
    return true;
  }

  async listSubjects(scope) {
    const normalizedScope = normalizeScope(scope);
    const snapshot = await this.#collectionRef().where('scope', '==', normalizedScope).get();
    const subjects = new Set();
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data?.subject) {
        subjects.add(data.subject);
      }
    });
    return Array.from(subjects);
  }
}

module.exports = {
  FirestoreMemoryAdapter,
};

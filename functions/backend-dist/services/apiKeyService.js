
const crypto = require('crypto');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const admin = require('../firebase'); // Added admin import
const auditService = require('./audit_service');

class ApiKeyService {
  constructor() {
    this.db = getFirestore();
    this.COLLECTION = 'api_keys';
  }

  /**
   * Generate a new API key
   * @param {string} userId - User ID
   * @param {string} name - Key name/description
   * @param {string[]} scopes - Permissions array
   * @returns {Promise<{key: string, keyId: string}>}
   */
  async generateKey(userId, name, scopes = ['mail:send']) {
    const keyId = crypto.randomUUID();
    const apiKey = `gur_${crypto.randomBytes(32).toString('base64url')}`;
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

    const keyDoc = {
      keyId,
      userId,
      name,
      hashedKey,
      scopes,
      createdAt: FieldValue.serverTimestamp(),
      lastUsedAt: null,
      usageCount: 0,
      isActive: true,
    };

    await this.db.collection(this.COLLECTION).doc(keyId).set(keyDoc);

    await auditService.logSecretsEvent({
      actorId: userId,
      action: 'api_key.create',
      key: keyId,
      hasValue: true,
      metadata: { name, scopes },
    });

    return { key: apiKey, keyId };
  }

  /**
   * Validate API key
   * @param {string} apiKey - Raw API key
   * @returns {Promise<{valid: boolean, keyDoc?: any}>}
   */
  async validateKey(apiKey) {
    if (!apiKey || !apiKey.startsWith('gur_')) {
      return { valid: false };
    }

    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
    const snapshot = await this.db
      .collection(this.COLLECTION)
      .where('hashedKey', '==', hashedKey)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { valid: false };
    }

    const keyDoc = snapshot.docs[0].data();
    
    // Update usage stats
    await snapshot.docs[0].ref.update({
      lastUsedAt: FieldValue.serverTimestamp(),
      usageCount: FieldValue.increment(1),
    });

    return { valid: true, keyDoc };
  }

  /**
   * Revoke API key
   * @param {string} userId - User ID
   * @param {string} keyId - Key ID to revoke
   */
  async revokeKey(userId, keyId) {
    const keyRef = this.db.collection(this.COLLECTION).doc(keyId);
    const keySnap = await keyRef.get();

    if (!keySnap.exists || keySnap.data().userId !== userId) {
      throw new Error('Key not found or unauthorized');
    }

    await keyRef.update({ isActive: false, revokedAt: FieldValue.serverTimestamp() });

    await auditService.logSecretsEvent({
      actorId: userId,
      action: 'api_key.revoke',
      key: keyId,
      hasValue: false,
      metadata: { keyId },
    });
  }

  /**
   * List user's API keys
   * @param {string} userId - User ID
   * @returns {Promise<any[]>}
   */
  async listKeys(userId) {
    const snapshot = await this.db
      .collection(this.COLLECTION)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        keyId: doc.id,
        name: data.name,
        scopes: data.scopes,
        createdAt: data.createdAt?.toDate(),
        lastUsedAt: data.lastUsedAt?.toDate(),
        usageCount: data.usageCount,
        isActive: data.isActive,
      };
    });
  }
}

if (admin.disabled) {
  console.warn('⚠️ [ApiKeyService] Firebase Admin is disabled, API Key Service will be a no-op.');
  module.exports = {
    generateKey: async () => ({ key: 'mock_key', keyId: 'mock_key_id' }),
    validateKey: async () => ({ valid: false }),
    revokeKey: async () => {},
    listKeys: async () => [],
    __disabled: true
  };
} else {
  module.exports = new ApiKeyService();
}

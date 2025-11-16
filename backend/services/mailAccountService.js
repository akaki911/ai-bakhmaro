const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { encryptSecret, decryptSecret } = require('../utils/secretEncryption');

class MailAccountService {
  constructor() {
    this.db = getFirestore();
    this.collectionName = 'users';
    this.subCollectionName = 'mail_accounts';
  }

  collection(userId) {
    if (!userId) {
      throw new Error('userId is required');
    }
    return this.db.collection(this.collectionName).doc(userId).collection(this.subCollectionName);
  }

  normaliseDoc(doc) {
    if (!doc.exists) {
      return null;
    }

    const data = doc.data() || {};
    const config = data.config || {};
    return {
      id: doc.id,
      name: data.name,
      email: data.email,
      isDefault: Boolean(data.isDefault),
      config: {
        imapHost: config.imapHost,
        imapPort: config.imapPort,
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        user: config.user,
        hasPassword: Boolean(config.pass),
      },
      createdAt: data.createdAt?.toDate?.() || null,
      updatedAt: data.updatedAt?.toDate?.() || null,
    };
  }

  validatePayload(payload, { requireConfig = true } = {}) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload must be an object');
    }
    if (!payload.name || typeof payload.name !== 'string') {
      throw new Error('Account name is required');
    }
    if (!payload.email || typeof payload.email !== 'string') {
      throw new Error('Account email is required');
    }

    if (!requireConfig && payload.config === undefined) {
      return;
    }

    const config = payload.config;
    if (!config || typeof config !== 'object') {
      throw new Error('Configuration is required');
    }

    const requiredFields = ['imapHost', 'imapPort', 'smtpHost', 'smtpPort', 'user'];
    requiredFields.forEach((field) => {
      if (config[field] === undefined || config[field] === null || config[field] === '') {
        throw new Error(`config.${field} is required`);
      }
    });

    if (Number.isNaN(Number(config.imapPort)) || Number.isNaN(Number(config.smtpPort))) {
      throw new Error('IMAP/SMTP ports must be numeric');
    }
  }

  prepareConfig(config, existingConfig = null) {
    if (!config) {
      return existingConfig ? { ...existingConfig } : {};
    }

    const prepared = { ...(existingConfig || {}), ...config };
    if (config.pass !== undefined) {
      prepared.pass = encryptSecret(config.pass);
    } else if (!existingConfig) {
      prepared.pass = null;
    }

    if (prepared.passDecrypted) {
      delete prepared.passDecrypted;
    }

    prepared.imapPort = Number(prepared.imapPort);
    prepared.smtpPort = Number(prepared.smtpPort);
    return prepared;
  }

  async resetDefault(userId, exceptId = null) {
    const snapshot = await this.collection(userId).where('isDefault', '==', true).get();
    const batch = this.db.batch();

    snapshot.forEach((doc) => {
      if (doc.id !== exceptId) {
        batch.update(doc.ref, { isDefault: false, updatedAt: FieldValue.serverTimestamp() });
      }
    });

    if (!snapshot.empty) {
      await batch.commit();
    }
  }

  async listAccounts(userId) {
    const snapshot = await this.collection(userId).orderBy('name').get();
    return snapshot.docs.map((doc) => this.normaliseDoc(doc));
  }

  async createAccount(userId, payload) {
    this.validatePayload(payload, { requireConfig: false });

    const accountRef = this.collection(userId).doc();
    const preparedConfig = this.prepareConfig(payload.config);

    if (payload.isDefault) {
      await this.resetDefault(userId);
    }

    const document = {
      name: payload.name,
      email: payload.email,
      isDefault: Boolean(payload.isDefault),
      config: preparedConfig,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await accountRef.set(document);
    const snapshot = await accountRef.get();
    return this.normaliseDoc(snapshot);
  }

  async getAccount(userId, accountId, { includeDecryptedPass = false } = {}) {
    const docRef = this.collection(userId).doc(accountId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return null;
    }

    const data = snapshot.data();
    if (includeDecryptedPass && data?.config?.pass) {
      data.config.passDecrypted = decryptSecret(data.config.pass);
    }

    return { id: snapshot.id, ...data };
  }

  async getDefaultAccount(userId, options = {}) {
    const snapshot = await this.collection(userId).where('isDefault', '==', true).limit(1).get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    const data = doc.data();
    if (options.includeDecryptedPass && data?.config?.pass) {
      data.config.passDecrypted = decryptSecret(data.config.pass);
    }
    return { id: doc.id, ...data };
  }

  async updateAccount(userId, accountId, payload) {
    const existing = await this.getAccount(userId, accountId, { includeDecryptedPass: true });
    if (!existing) {
      throw new Error('Account not found');
    }

    this.validatePayload(payload, { requireConfig: payload.config !== undefined });

    const updatedConfig = this.prepareConfig(payload.config, existing.config);
    const updates = {
      name: payload.name ?? existing.name,
      email: payload.email ?? existing.email,
      config: updatedConfig,
      isDefault: payload.isDefault ?? existing.isDefault,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (payload.isDefault) {
      await this.resetDefault(userId, accountId);
    }

    await this.collection(userId).doc(accountId).set(updates, { merge: true });
    const snapshot = await this.collection(userId).doc(accountId).get();
    return this.normaliseDoc(snapshot);
  }

  async deleteAccount(userId, accountId) {
    await this.collection(userId).doc(accountId).delete();
  }

  buildRuntimeConfig(account) {
    if (!account || !account.config) {
      throw new Error('Invalid account payload');
    }

    return {
      imapHost: account.config.imapHost,
      imapPort: Number(account.config.imapPort),
      smtpHost: account.config.smtpHost,
      smtpPort: Number(account.config.smtpPort),
      user: account.config.user || account.email,
      pass: account.config.passDecrypted
        ? account.config.passDecrypted
        : account.config.pass
          ? decryptSecret(account.config.pass)
          : null,
      email: account.email,
      useSecureImap: account.config.useSecureImap !== false,
      useSecureSmtp: account.config.useSecureSmtp !== false,
    };
  }
}

module.exports = new MailAccountService();

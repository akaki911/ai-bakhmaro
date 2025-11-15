const crypto = require('crypto');

const resolveKeyBuffer = () => {
  if (resolveKeyBuffer.cachedKey) {
    return resolveKeyBuffer.cachedKey;
  }

  const rawKey = process.env.MAIL_ACCOUNT_SECRET_KEY || process.env.SECRETS_ENC_KEY;
  if (!rawKey) {
    const error = new Error('MAIL_ACCOUNT_SECRET_KEY (or SECRETS_ENC_KEY) must be configured');
    error.code = 'CONFIG_ERROR';
    throw error;
  }

  const candidates = [];
  candidates.push(Buffer.from(rawKey, 'utf8'));
  try {
    candidates.push(Buffer.from(rawKey, 'base64'));
  } catch (error) {
    // ignore base64 decoding errors
  }

  const key = candidates.find((buffer) => buffer.length === 32);
  if (!key) {
    const error = new Error('Encryption key must be 32 bytes when decoded');
    error.code = 'CONFIG_ERROR';
    throw error;
  }

  resolveKeyBuffer.cachedKey = key;
  return key;
};

const encodePayload = (iv, data, authTag) =>
  [iv.toString('base64'), data.toString('base64'), authTag.toString('base64')].join('.');

const decodePayload = (payload) => {
  if (!payload || typeof payload !== 'string') {
    const error = new Error('Encrypted payload missing');
    error.code = 'INVALID_PAYLOAD';
    throw error;
  }

  const [iv, data, authTag] = payload.split('.');
  if (!iv || !data || !authTag) {
    const error = new Error('Encrypted payload is malformed');
    error.code = 'INVALID_PAYLOAD';
    throw error;
  }

  return {
    iv: Buffer.from(iv, 'base64'),
    data: Buffer.from(data, 'base64'),
    authTag: Buffer.from(authTag, 'base64'),
  };
};

const encryptSecret = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const key = resolveKeyBuffer();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return encodePayload(iv, encrypted, authTag);
};

const decryptSecret = (payload) => {
  if (!payload) {
    return null;
  }

  const key = resolveKeyBuffer();
  const { iv, data, authTag } = decodePayload(payload);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
};

module.exports = {
  encryptSecret,
  decryptSecret,
};

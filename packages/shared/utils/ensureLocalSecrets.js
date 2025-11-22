const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DEFAULT_DEV_TOKEN } = require('../internalToken');

const DEFAULT_ALLOWED_IPS = '127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16';

const generateToken = (bytes = 48) => crypto.randomBytes(bytes).toString('base64url');
const generateHex = (bytes = 16) => crypto.randomBytes(bytes).toString('hex');
const generateNumericString = (digits = 12) => {
  const max = BigInt('1' + '0'.repeat(digits));
  let num = crypto.randomBytes(digits).reduce((acc, byte) => (acc << 8n) + BigInt(byte), 0n);
  num = num % max;
  return num.toString().padStart(digits, '0');
};

const buildLocalServiceAccount = (projectId) => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  const privateKeyId = generateHex(16);
  const clientId = generateNumericString(21);
  const clientEmail = `firebase-adminsdk-local@${projectId}.iam.gserviceaccount.com`;

  return {
    type: 'service_account',
    project_id: projectId,
    private_key_id: privateKeyId,
    private_key: privateKey,
    client_email: clientEmail,
    client_id: clientId,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-local%40${projectId}.iam.gserviceaccount.com`
  };
};

const ensureDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

function ensureLocalSecrets(options = {}) {
  const cwd = options.cwd ? path.resolve(options.cwd) : process.cwd();
  const configDir = path.join(cwd, 'config');
  const secretsFile = path.join(configDir, 'local-secrets.json');
  const shouldPersist = options.persist ?? (process.env.NODE_ENV !== 'production');
  const silent = Boolean(options.silent);
  const isProduction = process.env.NODE_ENV === 'production';

  let stored = {};
  if (fs.existsSync(secretsFile)) {
    try {
      const raw = fs.readFileSync(secretsFile, 'utf8');
      stored = JSON.parse(raw);
    } catch (error) {
      if (!silent) {
        console.warn('⚠️  [dev-secrets] Failed to parse local secrets file. Regenerating...');
      }
    }
  }

  const appliedKeys = new Set();
  const rememberValue = (key, value) => {
    if (value !== undefined) {
      process.env[key] = value;
      appliedKeys.add(key);
    }
  };

  const ensureValue = (key, generator, options = {}) => {
    const { persist = false, allowInProduction = false } = options;
    if (isProduction && !allowInProduction) return;
    let value = process.env[key];
    if (!value) {
      value = generator();
      rememberValue(key, value);
      if (persist) stored[key] = value;
    } else {
      rememberValue(key, value);
    }
    return value;
  };

  let updated = false;
  const updateStored = () => { updated = true; };

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || stored.FIREBASE_PROJECT_ID;

  const sessionSecret = ensureValue('SESSION_SECRET', () => generateHex(32), { persist: true });
  const internalToken = ensureValue('AI_INTERNAL_TOKEN', () => stored.AI_INTERNAL_TOKEN || DEFAULT_DEV_TOKEN, { persist: true });

  ensureValue('AI_SERVICE_URL', () => stored.AI_SERVICE_URL || 'http://127.0.0.1:5001', { persist: true });
  ensureValue('ALLOWED_BACKEND_IPS', () => stored.ALLOWED_BACKEND_IPS || DEFAULT_ALLOWED_IPS, { persist: true, allowInProduction: true });

  ensureValue('GROQ_API_KEY', () => stored.GROQ_API_KEY || 'gsk_local_dev_placeholder_key_please_override');

  if (projectId) {
    const appSuffix = ensureValue(
      'VITE_FIREBASE_APP_ID',
      () => stored.VITE_FIREBASE_APP_ID || `1:${generateNumericString(12)}:web:${generateHex(12)}`
    );
    rememberValue('VITE_FIREBASE_APP_ID', appSuffix);

    const measurementId = ensureValue(
      'VITE_FIREBASE_MEASUREMENT_ID',
      () => stored.VITE_FIREBASE_MEASUREMENT_ID || `G-${generateHex(6).toUpperCase()}`
    );
    rememberValue('VITE_FIREBASE_MEASUREMENT_ID', measurementId);

    ensureValue('VITE_FIREBASE_API_KEY', () => stored.VITE_FIREBASE_API_KEY || `${projectId}-local-api-key`);
    ensureValue(
      'VITE_FIREBASE_AUTH_DOMAIN',
      () => stored.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`
    );
    ensureValue('VITE_FIREBASE_PROJECT_ID', () => projectId);
    ensureValue(
      'VITE_FIREBASE_STORAGE_BUCKET',
      () => stored.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`
    );
  }

  if (projectId) {
    const serviceAccount = ensureValue(
      'FIREBASE_SERVICE_ACCOUNT_KEY',
      () => JSON.stringify(buildLocalServiceAccount(projectId)),
      { persist: true }
    );

    if (serviceAccount) {
      // Assuming synchroniseServiceAccountArtifacts is defined elsewhere or remove if not needed
      // synchroniseServiceAccountArtifacts(serviceAccount);

      try {
        const parsed = JSON.parse(serviceAccount);
        ensureValue('FIREBASE_CLIENT_EMAIL', () => parsed.client_email, { persist: true });
        ensureValue('FIREBASE_PRIVATE_KEY', () => parsed.private_key, { persist: true });
      } catch (error) {
        if (!silent) {
          console.warn('⚠️  [dev-secrets] Failed to parse stored FIREBASE_SERVICE_ACCOUNT_KEY for derived fields.');
        }
      }
    }
  }

  if (shouldPersist && updated) {
    ensureDirectory(configDir);
    fs.writeFileSync(secretsFile, `${JSON.stringify(stored, null, 2)}\n`, 'utf8');
    if (!silent) {
      console.log(`💾 [dev-secrets] Saved local secrets to ${path.relative(cwd, secretsFile)}`);
    }
  }

  return {
    applied: Array.from(appliedKeys),
    sessionSecret,
    internalToken,
    storedPath: shouldPersist ? secretsFile : null,
  };
}

module.exports = {
  ensureLocalSecrets,
};

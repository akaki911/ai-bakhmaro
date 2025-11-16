const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { encryptSecret } = require('../utils/secretEncryption');

const GURULO_USER_ID = 'Tj4gYW6hlDSjkUIwHx4gqcxRb9u1';

const GURULO_MAIL_CONFIG = {
  name: 'Gurulo AI Mail',
  email: 'gurulo@bakhmaro.co',
  isDefault: true,
  config: {
    imapHost: 'mail.privateemail.com',
    imapPort: 993,
    smtpHost: 'mail.privateemail.com',
    smtpPort: 465,
    user: 'gurulo@bakhmaro.co',
    pass: process.env.GURULO_EMAIL_PASSWORD,
    useSecureImap: true,
    useSecureSmtp: true,
  },
};

async function setupGuruloMailAccount() {
  console.log('🔧 Setting up Gurulo mail account...');

  if (!process.env.GURULO_EMAIL_PASSWORD) {
    throw new Error('GURULO_EMAIL_PASSWORD environment variable is required');
  }

  const db = getFirestore();
  const collection = db.collection('users').doc(GURULO_USER_ID).collection('mail_accounts');

  const existingSnapshot = await collection.where('email', '==', GURULO_MAIL_CONFIG.email).limit(1).get();

  if (!existingSnapshot.empty) {
    console.log('✅ Gurulo mail account already exists. Updating...');
    const docRef = existingSnapshot.docs[0].ref;

    await docRef.update({
      name: GURULO_MAIL_CONFIG.name,
      isDefault: true,
      config: {
        ...GURULO_MAIL_CONFIG.config,
        pass: encryptSecret(GURULO_MAIL_CONFIG.config.pass),
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`✅ Updated existing account: ${docRef.id}`);
    return docRef.id;
  }

  await collection.where('isDefault', '==', true).get().then((snapshot) => {
    const batch = db.batch();
    snapshot.forEach((doc) => {
      batch.update(doc.ref, { isDefault: false });
    });
    return batch.commit();
  });

  const accountRef = collection.doc();
  await accountRef.set({
    name: GURULO_MAIL_CONFIG.name,
    email: GURULO_MAIL_CONFIG.email,
    isDefault: true,
    config: {
      ...GURULO_MAIL_CONFIG.config,
      pass: encryptSecret(GURULO_MAIL_CONFIG.config.pass),
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`✅ Created new Gurulo mail account: ${accountRef.id}`);
  return accountRef.id;
}

module.exports = { setupGuruloMailAccount };

if (require.main === module) {
  const admin = require('firebase-admin');
  
  if (!admin.apps.length) {
    admin.initializeApp();
  }

  setupGuruloMailAccount()
    .then((accountId) => {
      console.log('✅ Setup complete! Account ID:', accountId);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

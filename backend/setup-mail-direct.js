const admin = require('firebase-admin');
const { encryptSecret } = require('./utils/secretEncryption');
const { FieldValue } = require('firebase-admin/firestore');

const GURULO_USER_ID = 'Tj4gYW6hlDSjkUIwHx4gqcxRb9u1';

async function setupGuruloMail() {
  console.log('🔧 Setting up Gurulo mail account...');

  if (!process.env.GURULO_EMAIL_PASSWORD) {
    console.error('❌ GURULO_EMAIL_PASSWORD not found in environment');
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp();
  }

  const db = admin.firestore();
  const collection = db.collection('users').doc(GURULO_USER_ID).collection('mail_accounts');

  const gurulo_email = 'gurulo@bakhmaro.co';
  const snapshot = await collection.where('email', '==', gurulo_email).limit(1).get();

  const accountData = {
    name: 'Gurulo AI Mail',
    email: gurulo_email,
    isDefault: true,
    config: {
      imapHost: 'mail.privateemail.com',
      imapPort: 993,
      smtpHost: 'mail.privateemail.com',
      smtpPort: 465,
      user: gurulo_email,
      pass: encryptSecret(process.env.GURULO_EMAIL_PASSWORD),
      useSecureImap: true,
      useSecureSmtp: true,
    },
  };

  if (!snapshot.empty) {
    const docRef = snapshot.docs[0].ref;
    console.log(`✅ Account exists. Updating: ${docRef.id}`);
    
    await collection.where('isDefault', '==', true).get().then((snap) => {
      const batch = db.batch();
      snap.forEach((doc) => {
        if (doc.id !== docRef.id) {
          batch.update(doc.ref, { isDefault: false });
        }
      });
      return batch.commit();
    });

    await docRef.update({
      ...accountData,
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    console.log('✅ Gurulo mail account updated successfully!');
    return docRef.id;
  } else {
    await collection.where('isDefault', '==', true).get().then((snap) => {
      const batch = db.batch();
      snap.forEach((doc) => {
        batch.update(doc.ref, { isDefault: false });
      });
      return batch.commit();
    });

    const docRef = collection.doc();
    await docRef.set({
      ...accountData,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`✅ Gurulo mail account created: ${docRef.id}`);
    return docRef.id;
  }
}

async function testConnection() {
  console.log('\n🔍 Testing SMTP connection...');
  
  const mailRuntime = require('./services/mailRuntimeService');
  
  const config = {
    smtpHost: 'mail.privateemail.com',
    smtpPort: 465,
    user: 'gurulo@bakhmaro.co',
    pass: process.env.GURULO_EMAIL_PASSWORD,
    email: 'gurulo@bakhmaro.co',
    useSecureSmtp: true,
  };

  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: true,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    await transporter.verify();
    console.log('✅ SMTP connection successful!');
    return true;
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    return false;
  }
}

async function sendTestEmail() {
  console.log('\n📧 Sending test email...');
  
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: 'mail.privateemail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'gurulo@bakhmaro.co',
      pass: process.env.GURULO_EMAIL_PASSWORD,
    },
  });

  const emailData = {
    from: 'Gurulo AI <gurulo@bakhmaro.co>',
    to: 'akaki.cincadze@gmail.com',
    subject: '🤖 გამარჯობა Gurulo-დან!',
    text: `გამარჯობა!

ეს არის ტესტური შეტყობინება Gurulo AI-ს მაილის სისტემიდან.

მაილის ინტეგრაცია წარმატებით მუშაობს! ახლა გურულოს შეუძლია:
✅ IMAP/SMTP ანგარიშების მართვა
✅ Inbox-ის სინქრონიზაცია და წაკითხვა
✅ Email-ების გაგზავნა
✅ ავტომატური შეტყობინებები და daily summaries

--
Gurulo AI
gurulo@bakhmaro.co
https://ai-bakhmaro.co`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #0a1628 0%, #1a2642 100%); color: white; border-radius: 16px;">
  <h2 style="color: #06b6d4; margin-bottom: 20px;">🤖 გამარჯობა Gurulo-დან!</h2>
  
  <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
    ეს არის ტესტური შეტყობინება <strong>Gurulo AI</strong>-ს მაილის სისტემიდან.
  </p>
  
  <div style="background: rgba(6, 182, 212, 0.1); border-left: 3px solid #06b6d4; padding: 15px; margin: 20px 0; border-radius: 8px;">
    <p style="margin: 0; font-size: 15px;"><strong>✅ მაილის ინტეგრაცია წარმატებით მუშაობს!</strong></p>
  </div>
  
  <p style="font-size: 15px; line-height: 1.6;">ახლა გურულოს შეუძლია:</p>
  <ul style="font-size: 15px; line-height: 1.8;">
    <li>✅ IMAP/SMTP ანგარიშების მართვა</li>
    <li>✅ Inbox-ის სინქრონიზაცია და წაკითხვა</li>
    <li>✅ Email-ების გაგზავნა</li>
    <li>✅ ავტომატური შეტყობინებები და daily summaries</li>
  </ul>
  
  <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 30px 0;">
  
  <p style="font-size: 13px; color: #94a3b8; margin: 0;">
    <strong>Gurulo AI</strong><br>
    <a href="mailto:gurulo@bakhmaro.co" style="color: #06b6d4; text-decoration: none;">gurulo@bakhmaro.co</a><br>
    <a href="https://ai-bakhmaro.co" style="color: #06b6d4; text-decoration: none;">https://ai-bakhmaro.co</a>
  </p>
</div>`,
  };

  try {
    const info = await transporter.sendMail(emailData);
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    return info;
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    throw error;
  }
}

async function main() {
  try {
    const accountId = await setupGuruloMail();
    console.log(`\n✅ Setup complete! Account ID: ${accountId}`);
    
    const connected = await testConnection();
    if (connected) {
      await sendTestEmail();
      console.log('\n🎉 All done! Check akaki.cincadze@gmail.com for the test email.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();

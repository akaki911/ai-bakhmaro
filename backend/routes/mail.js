
// Development session status check
router.get('/dev/session-status', (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      authenticated: false,
      error: 'Development endpoint only'
    });
  }

  const session = req.session;
  
  if (session && session.user) {
    return res.json({
      authenticated: true,
      user: {
        userId: session.user.userId || session.user.id,
        email: session.user.email,
        role: session.user.role,
        personalId: session.user.personalId,
        displayName: session.user.displayName
      }
    });
  }

  return res.json({
    authenticated: false
  });
});


const express = require('express');
const router = express.Router();

const { requireAuthentication } = require('../middleware/role_guards');
const mailAccounts = require('../services/mailAccountService');
const mailRuntime = require('../services/mailRuntimeService');

router.post('/test/setup-gurulo', async (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, error: 'Test endpoint disabled in production' });
  }
  
  try {
    const { getFirestore, FieldValue } = require('firebase-admin/firestore');
    const { encryptSecret } = require('../utils/secretEncryption');
    
    const GURULO_USER_ID = 'Tj4gYW6hlDSjkUIwHx4gqcxRb9u1';
    const gurulo_email = 'gurulo@bakhmaro.co';
    
    if (!process.env.GURULO_EMAIL_PASSWORD) {
      return res.status(500).json({ success: false, error: 'GURULO_EMAIL_PASSWORD not configured' });
    }
    
    const db = getFirestore();
    const collection = db.collection('users').doc(GURULO_USER_ID).collection('mail_accounts');
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
    
    let accountId;
    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      accountId = docRef.id;
      
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
    } else {
      await collection.where('isDefault', '==', true).get().then((snap) => {
        const batch = db.batch();
        snap.forEach((doc) => {
          batch.update(doc.ref, { isDefault: false });
        });
        return batch.commit();
      });
      
      const docRef = collection.doc();
      accountId = docRef.id;
      await docRef.set({
        ...accountData,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    
    res.json({ success: true, accountId, message: 'Gurulo mail account configured' });
  } catch (error) {
    next(error);
  }
});

router.post('/test/send-email', async (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, error: 'Test endpoint disabled in production' });
  }
  
  try {
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
    
    const info = await transporter.sendMail({
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
    });
    
    res.json({ 
      success: true, 
      messageId: info.messageId,
      response: info.response,
      message: 'Test email sent to akaki.cincadze@gmail.com' 
    });
  } catch (error) {
    next(error);
  }
});

router.post('/dev/init-session', async (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, error: 'Dev endpoint disabled in production' });
  }
  
  try {
    const GURULO_USER_ID = 'Tj4gYW6hlDSjkUIwHx4gqcxRb9u1';
    
    req.session.user = {
      id: GURULO_USER_ID,
      role: 'SUPER_ADMIN',
      personalId: '01019062020',
      email: 'admin@bakhmaro.co',
      displayName: 'სუპერ ადმინისტრატორი',
      authMethod: 'dev_init'
    };
    req.session.isAuthenticated = true;
    req.session.isSuperAdmin = true;
    req.session.userRole = 'SUPER_ADMIN';
    req.session.userId = GURULO_USER_ID;
    
    req.session.save((err) => {
      if (err) {
        console.error('❌ Dev session save error:', err);
        return res.status(500).json({ success: false, error: 'Session save failed' });
      }
      
      console.log('✅ [DEV] Backend session initialized for Gurulo user');
      
      res.json({ 
        success: true, 
        message: 'Dev session initialized',
        user: req.session.user,
        sessionId: req.sessionID?.substring(0, 8)
      });
    });
  } catch (error) {
    next(error);
  }
});

router.use(requireAuthentication);

const ensureUser = (req) => {
  const userId = req.session?.user?.id;
  if (!userId) {
    const error = new Error('Authenticated session required');
    error.statusCode = 401;
    throw error;
  }
  return userId;
};

router.get('/accounts', async (req, res, next) => {
  try {
    const userId = ensureUser(req);
    const accounts = await mailAccounts.listAccounts(userId);
    res.json({ success: true, accounts });
  } catch (error) {
    next(error);
  }
});

router.post('/accounts', async (req, res, next) => {
  try {
    const userId = ensureUser(req);
    const account = await mailAccounts.createAccount(userId, req.body);
    res.status(201).json({ success: true, account });
  } catch (error) {
    next(error);
  }
});

router.put('/accounts/:accountId', async (req, res, next) => {
  try {
    const userId = ensureUser(req);
    const { accountId } = req.params;
    const account = await mailAccounts.updateAccount(userId, accountId, req.body);
    res.json({ success: true, account });
  } catch (error) {
    next(error);
  }
});

router.delete('/accounts/:accountId', async (req, res, next) => {
  try {
    const userId = ensureUser(req);
    const { accountId } = req.params;
    await mailAccounts.deleteAccount(userId, accountId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/accounts/:accountId/test', async (req, res, next) => {
  try {
    const userId = ensureUser(req);
    const { accountId } = req.params;
    const account = await mailAccounts.getAccount(userId, accountId, { includeDecryptedPass: true });
    if (!account) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }
    const config = mailAccounts.buildRuntimeConfig(account);
    const result = await mailRuntime.testConnection(config);
    res.json({ success: true, result });
  } catch (error) {
    next(error);
  }
});

router.get('/sync/:folder', async (req, res, next) => {
  try {
    const userId = ensureUser(req);
    const { folder } = req.params;
    const { accountId, limit } = req.query;
    let account;
    if (accountId) {
      account = await mailAccounts.getAccount(userId, accountId, { includeDecryptedPass: true });
    } else {
      account = await mailAccounts.getDefaultAccount(userId, { includeDecryptedPass: true });
    }

    if (!account) {
      return res.status(404).json({ success: false, error: 'Mail account not found' });
    }

    const config = mailAccounts.buildRuntimeConfig(account);
    const messages = await mailRuntime.fetchEmails(config, folder, Number(limit) || 20);
    res.json({ success: true, folder, accountId: account.id, messages });
  } catch (error) {
    next(error);
  }
});

router.post('/send', async (req, res, next) => {
  try {
    const userId = ensureUser(req);
    const { accountId, email } = req.body;
    if (!accountId) {
      return res.status(400).json({ success: false, error: 'accountId is required' });
    }
    if (!email || !email.to) {
      return res.status(400).json({ success: false, error: 'email payload must include recipient' });
    }

    const account = await mailAccounts.getAccount(userId, accountId, { includeDecryptedPass: true });
    if (!account) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    const config = mailAccounts.buildRuntimeConfig(account);
    const result = await mailRuntime.sendEmail(config, email);
    res.json({ success: true, result });
  } catch (error) {
    next(error);
  }
});

router.post('/move', async (req, res, next) => {
  try {
    const userId = ensureUser(req);
    const { accountId, emailId, targetFolder } = req.body;
    if (!accountId || !emailId || !targetFolder) {
      return res.status(400).json({
        success: false,
        error: 'accountId, emailId and targetFolder are required',
      });
    }

    const account = await mailAccounts.getAccount(userId, accountId, { includeDecryptedPass: true });
    if (!account) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    const config = mailAccounts.buildRuntimeConfig(account);
    await mailRuntime.moveEmail(config, emailId, targetFolder);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/setup-gurulo', async (req, res, next) => {
  try {
    const userId = ensureUser(req);
    const { setupGuruloMailAccount } = require('../scripts/setup-gurulo-mail');
    const accountId = await setupGuruloMailAccount();
    res.json({ success: true, accountId, message: 'Gurulo mail account configured' });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/send-test', async (req, res, next) => {
  try {
    const userId = ensureUser(req);
    const { sendTestEmail } = require('../scripts/send-test-email');
    const result = await sendTestEmail();
    res.json({ success: true, result, message: 'Test email sent successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

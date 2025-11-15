const express = require('express');
const router = express.Router();

const { requireAuthentication } = require('../middleware/role_guards');
const mailAccounts = require('../services/mailAccountService');
const mailRuntime = require('../services/mailRuntimeService');

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

module.exports = router;

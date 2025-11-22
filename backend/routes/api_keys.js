
const express = require('express');
const router = express.Router();
const apiKeyService = require('../services/apiKeyService');
const { requireRole } = require('@ouranos/shared/gurulo-auth');

// Create new API key
router.post(
  '/create',
  requireRole(['ADMIN', 'DEVELOPER']),
  async (req, res) => {
    try {
      const { name, scopes } = req.body;
      const userId = req.guruloClaims?.personalId;

      if (!name) {
        return res.status(400).json({ error: 'Key name is required' });
      }

      const result = await apiKeyService.generateKey(userId, name, scopes);
      
      res.json({
        success: true,
        apiKey: result.key,
        keyId: result.keyId,
        endpoint: process.env.API_ENDPOINT || 'https://api.gurulo.co/v1',
        warning: 'Save this key securely. It will not be shown again.',
      });
    } catch (error) {
      console.error('API Key creation error:', error);
      res.status(500).json({ error: 'Failed to create API key' });
    }
  }
);

// List user's keys
router.get(
  '/list',
  requireRole(['ADMIN', 'DEVELOPER']),
  async (req, res) => {
    try {
      const userId = req.guruloClaims?.personalId;
      const keys = await apiKeyService.listKeys(userId);
      res.json({ success: true, keys });
    } catch (error) {
      console.error('API Key listing error:', error);
      res.status(500).json({ error: 'Failed to list API keys' });
    }
  }
);

// Revoke key
router.delete(
  '/revoke/:keyId',
  requireRole(['ADMIN', 'DEVELOPER']),
  async (req, res) => {
    try {
      const userId = req.guruloClaims?.personalId;
      const { keyId } = req.params;
      
      await apiKeyService.revokeKey(userId, keyId);
      res.json({ success: true, message: 'Key revoked successfully' });
    } catch (error) {
      console.error('API Key revocation error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;


const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { generateTokenForRegularAPI, authenticateJWT, requireRole, allowSuperAdmin, refreshTokenLogic } = require('../utils/jwt');

const loginLimiter = rateLimit({
  // რომ ავიღოთ უფრო მკაცრი ლიმიტი: შემოხაზვა მოკლე ფანჯრით
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: process.env.NODE_ENV === 'development' ? 5 : 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts',
    code: 'AUTH_RATE_LIMITED',
    retryAfter: '10 minutes'
  }
});

// Login endpoint for regular users (returns JWT)
router.post('/login', loginLimiter, generateTokenForRegularAPI);

// Token refresh endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required',
        code: 'MISSING_REFRESH_TOKEN'
      });
    }

    const tokens = await refreshTokenLogic(refreshToken);
    res.json({
      success: true,
      ...tokens
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      error: 'Token refresh failed',
      code: 'REFRESH_FAILED'
    });
  }
});

// Protected endpoint example
router.get('/profile', authenticateJWT, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Admin-only endpoint example
router.get('/admin-only', authenticateJWT, allowSuperAdmin(), (req, res) => {
  res.json({
    success: true,
    message: 'Admin access granted',
    user: req.user
  });
});

module.exports = router;

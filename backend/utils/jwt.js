
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const auditService = require('../services/audit_service');
const superAdminService = require('../services/super_admin_service');
const { getFirestore } = require('firebase-admin/firestore');
const {
  requireRole: guruloRequireRole,
  allowSuperAdmin: guruloAllowSuperAdmin,
  extractExpressClaims,
  SUPER_ADMIN_PERSONAL_ID,
} = require('../../shared/gurulo-auth');

let bcrypt;
try {
  // bcryptjs is pure JS and avoids native compilation in constrained environments
  bcrypt = require('bcryptjs');
} catch (error) {
  console.error('⚠️ [AUTH] bcryptjs dependency missing - password verification disabled', error.message);
}

let db;
const getDb = () => {
  if (db) return db;
  try {
    db = getFirestore();
  } catch (error) {
    console.warn('⚠️ [AUTH] Firestore unavailable for credential checks:', error.message);
    db = null;
  }
  return db;
};

const normalizeString = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Generate JWT token for API access
const generateApiToken = (userId, role, permissions = [], personalId = null) => {
  const payload = {
    userId,
    personalId: normalizeString(personalId),
    role,
    permissions,
    type: 'api_access',
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'bakhmaro-api',
    audience: 'bakhmaro-clients'
  });
};

// Generate refresh token
const generateRefreshToken = (userId, role = 'USER', personalId = null, permissions = []) => {
  const payload = {
    userId,
    personalId: normalizeString(personalId),
    role,
    permissions,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'bakhmaro-api',
    audience: 'bakhmaro-clients'
  });
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'bakhmaro-api',
      audience: 'bakhmaro-clients'
    });
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

// Extract token from request
const extractTokenFromRequest = (req) => {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check X-API-Key header
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    return apiKey;
  }

  // Check query parameter
  if (req.query.token) {
    return req.query.token;
  }

  return null;
};

// JWT Middleware for API routes
const authenticateJWT = (req, res, next) => {
  const token = extractTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({
      error: 'Access token required',
      code: 'MISSING_TOKEN'
    });
  }

  try {
    const decoded = verifyToken(token);
    
    // Check token type
    if (decoded.type !== 'api_access') {
      return res.status(401).json({
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    if (
      decoded.role === 'SUPER_ADMIN' &&
      (!superAdminService.matchesKnownId(decoded.personalId || decoded.userId) ||
        decoded.personalId !== SUPER_ADMIN_PERSONAL_ID)
    ) {
      return res.status(403).json({
        error: 'Super admin identity mismatch',
        code: 'SUPER_ADMIN_ID_MISMATCH'
      });
    }

    // Attach user info to request
    req.user = {
      id: decoded.userId,
      role: decoded.role,
      personalId: decoded.personalId,
      permissions: decoded.permissions || []
    };

    req.claims = {
      personalId: decoded.personalId,
      roles: [decoded.role].filter(Boolean),
      userId: decoded.userId,
    };

    next();
  } catch (error) {
    console.error('JWT verification error:', error.message);
    return res.status(401).json({
      error: 'Invalid or expired token',
      code: 'TOKEN_INVALID'
    });
  }
};

const backendAuditHook = async (event, req) => {
  await auditService.logSecurityEvent({
    action: event.action,
    userId: event.claims?.personalId || 'unknown',
    role: event.claims?.roles?.[0] || 'unknown',
    req,
    success: event.allowed,
    details: {
      destructive: event.destructive,
      reason: event.reason,
      route: event.route,
      method: event.method,
      confirmationProvided: event.confirmationProvided,
      service: event.service,
    },
  });
};

const applyBackendGuardOptions = (options = {}) => {
  const { audit: customAudit, ...rest } = options || {};
  const combinedAudit = async (event, req) => {
    try {
      await backendAuditHook(event, req);
    } finally {
      if (typeof customAudit === 'function') {
        await customAudit(event, req);
      }
    }
  };

  return {
    service: 'backend',
    ...rest,
    audit: combinedAudit,
  };
};

const enforceKnownIdentities = (allowedRoles = []) => (req, res, next) => {
  const normalizedRoles = Array.isArray(allowedRoles)
    ? allowedRoles.map((role) => String(role || '').toUpperCase())
    : [];

  if (normalizedRoles.includes('SUPER_ADMIN')) {
    const claims = extractExpressClaims(req);
    const personalId = normalizeString(claims.personalId || req.body?.personalId || req.user?.personalId);
    const hasSuperAdminRole = claims.roles.some((role) => String(role).toUpperCase() === 'SUPER_ADMIN');

    if (
      !hasSuperAdminRole ||
      !superAdminService.matchesKnownId(personalId) ||
      personalId !== SUPER_ADMIN_PERSONAL_ID
    ) {
      return res.status(403).json({
        error: 'Super admin identity required',
        code: 'SUPER_ADMIN_ID_REQUIRED',
      });
    }
  }

  return next();
};

const wrapGuardWithIdentityCheck = (guard, allowedRoles = []) => (req, res, next) => {
  const postCheck = (err) => {
    if (err) return next(err);
    return enforceKnownIdentities(allowedRoles)(req, res, next);
  };

  return guard(req, res, postCheck);
};

const requireRole = (allowedRoles = [], options = {}) => {
  const guardOptions = applyBackendGuardOptions(options);
  return wrapGuardWithIdentityCheck(
    guruloRequireRole(allowedRoles, guardOptions),
    allowedRoles,
  );
};

const allowSuperAdmin = (options = {}) => {
  const guardOptions = applyBackendGuardOptions(options);
  return wrapGuardWithIdentityCheck(
    guruloAllowSuperAdmin(guardOptions),
    ['SUPER_ADMIN'],
  );
};

// Permission-based authorization middleware
const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!req.user.permissions.includes(requiredPermission)) {
      return res.status(403).json({
        error: 'Missing required permission',
        code: 'MISSING_PERMISSION',
        required: requiredPermission,
        available: req.user.permissions
      });
    }

    next();
  };
};

const findUserRecord = async ({ email, personalId, userId }) => {
  const database = getDb();
  if (!database) {
    return null;
  }

  const usersRef = database.collection('users');

  const attemptDocLookup = async (id) => {
    if (!id) return null;
    const doc = await usersRef.doc(id).get();
    if (doc.exists) {
      return { id: doc.id, ...doc.data() };
    }
    return null;
  };

  const byId = await attemptDocLookup(userId);
  if (byId) return byId;

  const queries = [
    { field: 'email', value: typeof email === 'string' ? email.trim().toLowerCase() : null },
    { field: 'personalId', value: typeof personalId === 'string' ? personalId.trim() : null },
    { field: 'userId', value: typeof userId === 'string' ? userId.trim() : null },
  ];

  for (const { field, value } of queries) {
    if (!value) continue;
    const snapshot = await usersRef.where(field, '==', value).limit(1).get();
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
  }

  return null;
};

// Token refresh endpoint logic
const refreshTokenLogic = async (refreshToken) => {
  try {
    const decoded = verifyToken(refreshToken);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token type');
    }

    const personalId = normalizeString(decoded.personalId) || normalizeString(decoded.userId);
    const role = decoded.role || 'USER';
    const permissions = Array.isArray(decoded.permissions) ? decoded.permissions : [];

    if (
      role === 'SUPER_ADMIN' &&
      (!superAdminService.matchesKnownId(personalId) || personalId !== SUPER_ADMIN_PERSONAL_ID)
    ) {
      throw new Error('Super admin identity mismatch');
    }

    const newAccessToken = generateApiToken(decoded.userId, role, permissions, personalId);
    const newRefreshToken = generateRefreshToken(decoded.userId, role, personalId, permissions);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: JWT_EXPIRES_IN
    };
  } catch (error) {
    throw new Error(`Token refresh failed: ${error.message}`);
  }
};

// Regular API token endpoint
const generateTokenForRegularAPI = async (req, res) => {
  try {
    const { email, password, personalId, userId } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : null;
    const normalizedPersonalId = typeof personalId === 'string' ? personalId.trim() : null;
    const normalizedUserId = typeof userId === 'string' ? userId.trim() : null;
    const loginIdentifier = normalizedEmail || normalizedUserId || normalizedPersonalId || '';

    const logFailure = async (reason, status = 401, code = 'NOT_AUTHORIZED', auditUserId = loginIdentifier) => {
      await auditService.logLoginFail(auditUserId, reason, req, 'password');
      return res.status(status).json({ error: 'Not authorized', code });
    };

    if (!bcrypt) {
      return logFailure('Password verifier unavailable', 503, 'AUTH_DEPENDENCY_MISSING');
    }

    if (!password || (!normalizedEmail && !normalizedPersonalId && !normalizedUserId)) {
      return res.status(400).json({
        error: 'Email, personalId or userId and password required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    const isSuperAdminLogin = superAdminService.matchesKnownId(loginIdentifier);
    let resolvedUserId = loginIdentifier;
    let resolvedRole = 'USER';
    let resolvedPersonalId = normalizedPersonalId;
    let permissions = [];
    let userRecord = null;

    if (isSuperAdminLogin) {
      const profile = superAdminService.getProfileClone();
      resolvedUserId = profile.userId;
      const personalIdMatches = !normalizedPersonalId || normalizedPersonalId === profile.personalId;
      const emailMatches = !normalizedEmail || normalizedEmail === profile.email.toLowerCase();

      if (!personalIdMatches || !emailMatches) {
        return logFailure('Super admin identity mismatch', 401, 'NOT_AUTHORIZED', profile.userId);
      }

      userRecord = await findUserRecord({
        email: profile.email,
        personalId: profile.personalId,
        userId: profile.userId,
      });

      const hashedPassword = process.env.SUPER_ADMIN_HASHED_PASSWORD || userRecord?.hashedPassword || userRecord?.passwordHash;
      if (!hashedPassword) {
        return logFailure('Super admin password not configured', 401, 'NOT_AUTHORIZED', profile.userId);
      }

      const passwordValid = await bcrypt.compare(password, hashedPassword);
      if (!passwordValid) {
        return logFailure('Invalid super admin credentials', 401, 'NOT_AUTHORIZED', profile.userId);
      }

      resolvedRole = 'SUPER_ADMIN';
      resolvedPersonalId = profile.personalId;
      permissions = Array.isArray(userRecord?.permissions) ? userRecord.permissions : ['*'];
      userRecord = { ...profile, permissions };
    } else {
      userRecord = await findUserRecord({ email: normalizedEmail, personalId: normalizedPersonalId, userId: normalizedUserId });

      if (!userRecord) {
        return logFailure('User not found', 401, 'NOT_AUTHORIZED', loginIdentifier || normalizedEmail || normalizedUserId);
      }

      const storedHash = userRecord.hashedPassword || userRecord.passwordHash;
      if (!storedHash) {
        return logFailure('Missing stored credentials', 401, 'NOT_AUTHORIZED', userRecord.id || userRecord.userId);
      }

      const personalIdMatches = !normalizedPersonalId || normalizedPersonalId === userRecord.personalId;
      if (!personalIdMatches) {
        return logFailure('Personal ID mismatch', 401, 'NOT_AUTHORIZED', userRecord.id || userRecord.userId);
      }

      const passwordValid = await bcrypt.compare(password, storedHash);
      if (!passwordValid) {
        return logFailure('Invalid credentials', 401, 'NOT_AUTHORIZED', userRecord.id || userRecord.userId);
      }

      resolvedUserId = userRecord.userId || userRecord.id || normalizedEmail || normalizedUserId;
      resolvedRole = userRecord.role || 'USER';
      resolvedPersonalId = userRecord.personalId || normalizedPersonalId;
      permissions = Array.isArray(userRecord.permissions) ? userRecord.permissions : [];
    }

    const accessToken = generateApiToken(resolvedUserId, resolvedRole, permissions, resolvedPersonalId);
    const refreshToken = generateRefreshToken(resolvedUserId, resolvedRole, resolvedPersonalId, permissions);

    await auditService.logLoginSuccess(resolvedUserId, resolvedRole, null, req, 'password');

    res.json({
      success: true,
      accessToken,
      refreshToken,
      expiresIn: JWT_EXPIRES_IN,
      user: {
        id: resolvedUserId,
        email: userRecord?.email || normalizedEmail,
        personalId: resolvedPersonalId,
        role: resolvedRole,
        permissions,
      }
    });
  } catch (error) {
    console.error('Token generation error:', error);
    await auditService.logLoginFail('unknown', error.message, req, 'password');
    res.status(500).json({
      error: 'Token generation failed',
      code: 'TOKEN_GENERATION_ERROR'
    });
  }
};

module.exports = {
  generateApiToken,
  generateRefreshToken,
  verifyToken,
  extractTokenFromRequest,
  authenticateJWT,
  requireRole,
  allowSuperAdmin,
  requirePermission,
  refreshTokenLogic,
  generateTokenForRegularAPI,
  JWT_SECRET,
  JWT_EXPIRES_IN
};

const express = require('express');
const rateLimit = require('express-rate-limit');
const { randomUUID } = require('crypto');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const { getWebAuthnConfig, validateWebAuthnRequest } = require('../config/webauthn');
const credentialService = require('../services/credential_service');
const superAdminService = require('../services/super_admin_service');
const auditService = require('../services/audit_service');
const deviceService = require('../services/device_service');
const { isSuperAdmin } = require('@ouranos/shared/gurulo-auth/gurulo.auth.js');

const normalisePersonalId = (raw, fallback = null) => {
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }
  return typeof fallback === 'string' && fallback.trim().length > 0 ? fallback.trim() : null;
};

const router = express.Router();

const telemetryEnabled = process.env.NODE_ENV !== 'production';
const logTelemetry = (message, meta = {}) => {
  if (!telemetryEnabled) {
    return;
  }
  console.log(`🛰️ [Passkey API] ${message}`, meta);
};

const persistSession = (req) => new Promise((resolve, reject) => {
  if (!req.session?.save) {
    return resolve();
  }

  req.session.save((err) => {
    if (err) {
      return reject(err);
    }
    resolve();
  });
});

const respondWithServerError = (res, scope, error, message) => {
  const errorId = randomUUID();
  console.error(`❌ [Passkey API] ${scope} failed`, {
    errorId,
    message: error?.message,
    cause: error?.cause,
    stack: error?.stack
  });

  res.status(500).json({
    success: false,
    error: message,
    errorId
  });
};

const verifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many Passkey verification attempts',
    code: 'PASSKEY_RATE_LIMITED',
    retryAfter: '10 minutes',
  },
});

router.post('/register-options', async (req, res) => {
  try {
    const { userId, email, displayName, personalId } = req.body || {};

    if (!userId || !email) {
      return res.status(400).json({
        success: false,
        error: 'userId and email are required',
      });
    }

    const normalizedPersonalId = normalisePersonalId(personalId, userId);

    if (!normalizedPersonalId) {
      return res.status(400).json({
        success: false,
        error: 'personalId is required for passkey registration',
      });
    }

    const config = getWebAuthnConfig(req);
    const originValidation = validateWebAuthnRequest(req, config);

    if (!originValidation.valid) {
      console.warn('⚠️ [Passkey Register] Origin validation failed', originValidation);
      return res.status(400).json({
        success: false,
        error: 'Invalid request origin',
        code: 'INVALID_RP_ORIGIN',
        expected: originValidation.expected,
        received: originValidation.received,
      });
    }

    logTelemetry('Issuing registration options', { userId, email, rpID: config.rpID });

    let existingCredentials = [];
    try {
      existingCredentials = await credentialService.getUserCredentials(userId);
    } catch (error) {
      console.warn('⚠️ [Passkey Register] Failed to load existing credentials', error.message);
    }
    const excludeCredentials = existingCredentials.map((cred) => {
      const storedId = cred.credentialId || cred.credentialID;
      if (!storedId) {
        return null;
      }
      return {
        id: Buffer.from(storedId, 'base64url'),
        type: 'public-key',
        transports: cred.transports || ['internal', 'hybrid'],
      };
    }).filter(Boolean);

    const options = await generateRegistrationOptions({
      rpName: config.rpName,
      rpID: config.rpID,
      userID: userId,
      userName: email,
      userDisplayName: displayName || email,
      attestationType: 'none',
      authenticatorSelection: {
        userVerification: 'preferred',
        residentKey: 'required',
        requireResidentKey: true,
      },
      supportedAlgorithmIDs: [-7, -35, -36, -257, -258, -259],
      excludeCredentials,
    });

    req.session.passkeyRegistration = {
      challenge: options.challenge,
      userId,
      email,
      displayName: displayName || email,
      personalId: normalizedPersonalId,
      createdAt: Date.now(),
    };

    await persistSession(req);

    res.json({
      success: true,
      publicKey: options,
    });
  } catch (error) {
    respondWithServerError(res, 'generate registration options', error, 'Failed to generate registration options');
  }
});

router.post('/register-verify', verifyLimiter, async (req, res) => {
  try {
    const { credential, deviceFingerprint, clientId, uaInfo } = req.body || {};
    const sessionData = req.session.passkeyRegistration;

    if (!credential || !sessionData?.challenge) {
      return res.status(400).json({
        success: false,
        error: 'Invalid registration data',
      });
    }

    const config = getWebAuthnConfig(req);
    const originValidation = validateWebAuthnRequest(req, config);

    if (!originValidation.valid) {
      console.warn('⚠️ [Passkey Login] Origin validation failed', originValidation);
      return res.status(400).json({
        success: false,
        error: 'Invalid request origin',
        code: 'INVALID_RP_ORIGIN',
        expected: originValidation.expected,
        received: originValidation.received,
      });
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: sessionData.challenge,
      expectedOrigin: config.origin,
      expectedRPID: config.rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({
        success: false,
        error: 'Registration verification failed',
      });
    }

    const { credentialID, credentialPublicKey, counter, aaguid } = verification.registrationInfo;
    const credentialId = Buffer.from(credentialID).toString('base64url');
    const publicKey = Buffer.from(credentialPublicKey).toString('base64');

    const personalId = normalisePersonalId(sessionData.personalId, sessionData.userId);

    if (!personalId) {
      return res.status(400).json({
        success: false,
        error: 'Registration session missing personalId',
      });
    }

    const existingUser = await superAdminService.getUser(sessionData.userId).catch(() => null);
    if (!existingUser) {
      await superAdminService.createUser({
        userId: sessionData.userId,
        personalId,
        email: sessionData.email,
        role: 'SUPER_ADMIN',
        status: 'active',
      });
    }

    await credentialService.storeCredential({
      credentialId,
      userId: sessionData.userId,
      personalId,
      publicKey,
      counter,
      aaguid: aaguid ? Buffer.from(aaguid).toString('hex') : null,
      transports: credential.response?.transports || ['internal', 'hybrid'],
    });

    await auditService.logPasskeyVerification(
      personalId,
      credentialId,
      req,
      true,
    );

    if (deviceFingerprint && clientId && uaInfo) {
      try {
        await deviceService.registerDevice({
          userId: sessionData.userId,
          clientId,
          fingerprint: deviceFingerprint,
          uaInfo,
          credentialId,
          ip: req.ip || req.connection?.remoteAddress,
          aaguid: aaguid ? Buffer.from(aaguid).toString('hex') : null,
        });
      } catch (deviceError) {
        console.warn('⚠️ [Passkey Register] Device registration failed', deviceError);
      }
    }

    delete req.session.passkeyRegistration;

    logTelemetry('Passkey registered', { userId: sessionData.userId });

    res.json({
      success: true,
      verified: true,
    });
  } catch (error) {
    respondWithServerError(res, 'registration verification', error, 'Registration verification failed');
  }
});

router.post('/login-options', async (req, res) => {
  try {
    const { identifier } = req.body || {};
    const loginIdentifier = typeof identifier === 'string' ? identifier.trim() : '';
    const config = getWebAuthnConfig(req);
    const originValidation = validateWebAuthnRequest(req, config);

    if (!originValidation.valid) {
      console.warn('⚠️ [Passkey Login] Origin validation failed', originValidation);
      return res.status(400).json({
        success: false,
        error: 'Invalid request origin',
        code: 'INVALID_RP_ORIGIN',
        expected: originValidation.expected,
        received: originValidation.received,
      });
    }

    if (!loginIdentifier) {
      return res.status(400).json({
        success: false,
        error: 'Passkey შესასვლელად საჭიროა ელფოსტა ან პირადი ნომერი',
        code: 'LOGIN_IDENTIFIER_REQUIRED',
      });
    }

    if (!superAdminService.matchesKnownId(loginIdentifier)) {
      return res.status(404).json({
        success: false,
        error: 'მითითებული მომხმარებელი ვერ მოიძებნა Passkey ავტორიზაციისთვის',
        code: 'UNKNOWN_USER',
      });
    }

    const superAdminProfile = superAdminService.getProfileClone();
    const credentials = await credentialService.getUserCredentials(superAdminProfile.userId);

    if (!credentials.length) {
      return res.status(404).json({
        success: false,
        error: 'მომხმარებლისთვის Passkey არ არის დარეგისტრირებული',
        code: 'NO_CREDENTIALS',
      });
    }

    const allowCredentials = credentials.map((cred) => ({
      id: Buffer.from(cred.credentialId || cred.credentialID, 'base64url'),
      type: 'public-key',
      transports: cred.transports || ['internal', 'hybrid'],
    }));

    const options = await generateAuthenticationOptions({
      rpID: config.rpID,
      userVerification: 'preferred',
      timeout: 120000,
      allowCredentials,
    });

    req.session.passkeyLogin = {
      challenge: options.challenge,
      expectedUserId: superAdminProfile.userId,
      expectedPersonalId: superAdminProfile.personalId,
      expectedEmail: superAdminProfile.email,
      createdAt: Date.now(),
    };

    await persistSession(req);

    res.json({
      success: true,
      publicKey: options,
    });
  } catch (error) {
    respondWithServerError(res, 'generate authentication options', error, 'Failed to generate authentication options');
  }
});

router.post('/login-verify', verifyLimiter, async (req, res) => {
  try {
    const { credential, deviceFingerprint, clientId, uaInfo } = req.body || {};
    const loginState = req.session.passkeyLogin;
    const challenge = loginState?.challenge;

    if (!credential || !challenge) {
      return res.status(400).json({
        success: false,
        error: 'Invalid authentication data',
      });
    }

    const config = getWebAuthnConfig(req);
    const credentialId = Buffer.from(credential.rawId, 'base64url').toString('base64url');
    const storedCredential = await credentialService.findByCredentialId(credentialId);

    if (!storedCredential) {
      return res.status(404).json({
        success: false,
        error: 'Credential not found on this device',
      });
    }

    const storedCredentialId = storedCredential.credentialId || storedCredential.credentialID;
    const storedPublicKey = storedCredential.publicKey || storedCredential.credentialPublicKey;

    if (!storedCredentialId || !storedPublicKey) {
      return res.status(400).json({
        success: false,
        error: 'Stored credential is missing required properties',
      });
    }

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedRPID: config.rpID,
      expectedOrigin: config.origin,
      authenticator: {
        credentialID: Buffer.from(storedCredentialId, 'base64url'),
        credentialPublicKey: Buffer.from(storedPublicKey, 'base64'),
        counter: storedCredential.counter,
        transports: storedCredential.transports || ['internal', 'hybrid'],
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      return res.status(400).json({
        success: false,
        error: 'Authentication verification failed',
      });
    }

    if (typeof verification.authenticationInfo?.newCounter === 'number') {
      await credentialService.updateCounter(storedCredential.id, verification.authenticationInfo.newCounter);
    }

    const credentialPersonalId = normalisePersonalId(storedCredential.personalId, storedCredential.userId);

    if (loginState?.expectedUserId && storedCredential.userId !== loginState.expectedUserId) {
      await auditService.logPasskeyVerification(storedCredential.userId, credentialId, req, false);
      return res.status(403).json({
        success: false,
        error: 'Credential does not belong to requested user',
        code: 'USER_MISMATCH',
      });
    }

    if (loginState?.expectedPersonalId) {
      const normalizedExpected = normalisePersonalId(loginState.expectedPersonalId, loginState.expectedUserId);
      if (normalizedExpected && credentialPersonalId && credentialPersonalId !== normalizedExpected) {
        await auditService.logPasskeyVerification(credentialPersonalId, credentialId, req, false);
        return res.status(403).json({
          success: false,
          error: 'Credential does not match requested personal ID',
          code: 'PERSONAL_ID_MISMATCH',
        });
      }
    }

    await auditService.logPasskeyVerification(
      credentialPersonalId || storedCredential.userId,
      credentialId,
      req,
      true,
    );

    if (deviceFingerprint && clientId && uaInfo) {
      try {
        const recognition = await deviceService.recognizeDevice(clientId, deviceFingerprint, uaInfo);
        if (recognition.recognized && recognition.device) {
          await deviceService.updateDeviceLogin(
            recognition.device.deviceId,
            req.ip || req.connection?.remoteAddress,
            credentialId,
          );
        } else {
          await deviceService.registerDevice({
            userId: storedCredential.userId,
            clientId,
            fingerprint: deviceFingerprint,
            uaInfo,
            credentialId,
            ip: req.ip || req.connection?.remoteAddress,
            aaguid: storedCredential.aaguid || null,
          });
        }
      } catch (deviceError) {
        console.warn('⚠️ [Passkey Login] Device reconciliation failed', deviceError);
      }
    }

    const user = await superAdminService.getUser(storedCredential.userId);
    const userPersonalId = normalisePersonalId(user?.personalId, credentialPersonalId);
    const resolvedRole = isSuperAdmin(userPersonalId) ? 'SUPER_ADMIN' : (user?.role || 'SUPER_ADMIN');

    const resolvedUser = {
      id: storedCredential.userId,
      personalId: userPersonalId,
      email: user?.email || storedCredential.email || 'user@bakhmaro.co',
      role: resolvedRole,
      authenticatedViaPasskey: true,
      displayName: user?.displayName || user?.email || storedCredential.email || 'Passkey User',
    };

    req.session.user = {
      id: resolvedUser.id,
      personalId: resolvedUser.personalId,
      email: resolvedUser.email,
      role: resolvedUser.role,
      authenticatedViaPasskey: true,
    };
    req.session.isAuthenticated = true;
    req.session.authMethod = 'passkey';
    req.session.isSuperAdmin = isSuperAdmin(resolvedUser.personalId);

    delete req.session.passkeyLogin;

    logTelemetry('Passkey login verified', {
      userId: resolvedUser.id,
      personalId: resolvedUser.personalId,
      role: resolvedUser.role,
    });

    res.json({
      success: true,
      user: resolvedUser,
    });
  } catch (error) {
    respondWithServerError(res, 'authentication verification', error, 'Authentication verification failed');
  }
});

module.exports = router;

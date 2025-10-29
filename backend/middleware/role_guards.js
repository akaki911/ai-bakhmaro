
// Unified Role-based Access Control Guards
// SOL-424: Role leakage prevention and proper route protection

const { requireRole, allowSuperAdmin } = require('../utils/jwt');

const requireSuperAdmin = allowSuperAdmin({ action: 'backend.guard.superAdmin' });

const requireAnyRole = (allowedRoles, options = {}) =>
  requireRole(allowedRoles, {
    action: 'backend.guard.multiRole',
    allowSuperAdminOverride: true,
    ...options,
  });

// Authentication check (any valid session)
const requireAuthentication = (req, res, next) => {
  console.log('🔐 [Guard] Authentication check:', {
    hasSession: !!req.session,
    hasUser: !!req.session?.user,
    route: req.originalUrl
  });

  if (!req.session?.user) {
    console.log('❌ [Guard] Authentication required:', {
      route: req.originalUrl
    });

    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
  }

  console.log('✅ [Guard] Authentication verified');
  next();
};

// Role derivation helper - determines deviceTrust based on role and device
const deriveRolePermissions = (user, deviceInfo = null) => {
  const permissions = {
    role: user.role,
    userId: user.id,
    deviceTrust: false,
    canAccessAdmin: false
  };

  switch (user.role) {
    case 'SUPER_ADMIN':
      permissions.canAccessAdmin = true;
      // SOL-422: deviceTrust მხოლოდ Super Admin + Trusted Device
      permissions.deviceTrust = deviceInfo?.trusted === true;
      break;
  }

  return permissions;
};

module.exports = {
  requireSuperAdmin,
  requireAnyRole,
  requireAuthentication,
  deriveRolePermissions
};

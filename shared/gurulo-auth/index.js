'use strict';

const {
  SUPER_ADMIN_PERSONAL_ID,
  SUPER_ADMIN_CONFIRMATION_HEADER,
  normalizeClaims,
  extractExpressClaims,
  extractFastifyClaims,
  isSuperAdmin,
  requireRole,
  allowSuperAdmin,
  hasSuperAdminConfirmation,
} = require('./gurulo.auth.js');

module.exports = {
  SUPER_ADMIN_PERSONAL_ID,
  SUPER_ADMIN_CONFIRMATION_HEADER,
  normalizeClaims,
  extractExpressClaims,
  extractFastifyClaims,
  isSuperAdmin,
  requireRole,
  allowSuperAdmin,
  hasSuperAdminConfirmation,
};

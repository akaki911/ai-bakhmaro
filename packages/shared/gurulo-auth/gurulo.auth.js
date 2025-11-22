'use strict';

const SUPER_ADMIN_PERSONAL_ID = '01019062020';
const SUPER_ADMIN_CONFIRMATION_HEADER = 'x-gurulo-super-admin-confirmed';
const CONFIRMATION_HEADER_ALIASES = [
  SUPER_ADMIN_CONFIRMATION_HEADER,
  'x-super-admin-confirmed',
  'x-gurulo-confirmed',
];
const BODY_CONFIRMATION_KEYS = [
  'superAdminConfirmed',
  'confirmSuperAdmin',
  'super_admin_confirmed',
  'super_admin_confirmation',
];
const QUERY_CONFIRMATION_KEYS = [
  'superAdminConfirmed',
  'confirmSuperAdmin',
  'super_admin_confirmed',
];

const defaultAuditLogger = (event) => {
  const redactedPersonalId = maskPersonalId(event.claims?.personalId || null);
  const safeEvent = {
    action: event.action,
    allowed: event.allowed,
    destructive: event.destructive,
    reason: event.reason,
    service: event.service,
    route: event.route,
    method: event.method,
    confirmationProvided: event.confirmationProvided,
    correlationId: event.correlationId,
    personalId: redactedPersonalId,
    roles: event.claims?.roles || [],
    orgs: (event.claims?.orgs || []).length,
    riskFlags: event.claims?.riskFlags || [],
    timestamp: event.timestamp,
  };

  const payload = JSON.stringify(safeEvent);
  if (event.allowed) {
    console.info(`🧾 [GURULO AUTH] ${payload}`);
  } else {
    console.warn(`🚨 [GURULO AUTH] ${payload}`);
  }
};

function maskPersonalId(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length <= 4) {
    return '***';
  }
  return `${trimmed.slice(0, 3)}******${trimmed.slice(-2)}`;
}

function toArray(value) {
  if (!value && value !== 0) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [value];
}

function uniqueStringArray(values = []) {
  const result = [];
  const seen = new Set();
  for (const entry of values) {
    if (typeof entry !== 'string') {
      continue;
    }
    const normalized = entry.trim();
    if (!normalized) {
      continue;
    }
    const upper = normalized.toUpperCase();
    if (seen.has(upper)) {
      continue;
    }
    seen.add(upper);
    result.push(normalized);
  }
  return result;
}

function normalizeClaims(raw = {}) {
  if (raw && typeof raw !== 'object') {
    return {
      personalId: null,
      roles: [],
      orgs: [],
      riskFlags: [],
    };
  }

  const candidatePersonalIds = [];
  const candidateRoles = [];
  const candidateOrgs = [];
  const candidateRiskFlags = [];

  const pushValues = (values, target) => {
    for (const value of toArray(values)) {
      if (typeof value === 'string') {
        target.push(value);
      }
    }
  };

  const addFromObject = (obj) => {
    if (!obj || typeof obj !== 'object') {
      return;
    }
    const { personalId, id, userId, uid, roles, role, orgs, org, organizations, organisation, riskFlags, riskFlag, risk } = obj;
    pushValues([personalId, id, userId, uid], candidatePersonalIds);
    pushValues(roles, candidateRoles);
    pushValues(role, candidateRoles);
    pushValues(orgs, candidateOrgs);
    pushValues(org, candidateOrgs);
    pushValues(organizations, candidateOrgs);
    pushValues(organisation, candidateOrgs);
    pushValues(riskFlags, candidateRiskFlags);
    pushValues(riskFlag, candidateRiskFlags);
    pushValues(risk, candidateRiskFlags);

    if (Array.isArray(obj.claims)) {
      pushValues(obj.claims, candidateRoles);
    }
    if (Array.isArray(obj.permissions)) {
      // Some legacy payloads store roles inside permissions prefixed with ROLE_
      for (const permission of obj.permissions) {
        if (typeof permission === 'string' && permission.startsWith('ROLE_')) {
          candidateRoles.push(permission.replace('ROLE_', ''));
        }
      }
    }
  };

  addFromObject(raw);
  addFromObject(raw.claims);

  const personalId = candidatePersonalIds.find((value) => typeof value === 'string' && value.trim().length > 0) || null;
  const roles = uniqueStringArray(candidateRoles);
  const orgs = uniqueStringArray(candidateOrgs);
  const riskFlags = uniqueStringArray(candidateRiskFlags);

  if (isSuperAdmin(personalId) && !roles.includes('SUPER_ADMIN')) {
    roles.push('SUPER_ADMIN');
  }

  return {
    personalId,
    roles,
    orgs,
    riskFlags,
  };
}

function extractHeaderValue(headers = {}, keys = []) {
  if (!headers) {
    return null;
  }
  for (const key of keys) {
    const value = headers[key];
    if (Array.isArray(value)) {
      const candidate = value.find((entry) => typeof entry === 'string' && entry.trim().length > 0);
      if (candidate) {
        return candidate.trim();
      }
    } else if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function splitList(value) {
  if (typeof value !== 'string') {
    return [];
  }
  return value
    .split(/[,\s]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function extractExpressClaims(req = {}) {
  const sources = [
    req.guruloClaims,
    req.claims,
    req.user,
    req.auth,
    req.session?.user,
    req.session,
    req.headers,
    req.body,
  ].filter(Boolean);

  const candidateIds = [];
  const candidateRoles = [];
  const candidateOrgs = [];
  const candidateRisk = [];

  for (const source of sources) {
    if (source && typeof source === 'object') {
      const normalized = normalizeClaims(source);
      if (normalized.personalId) {
        candidateIds.push(normalized.personalId);
      }
      candidateRoles.push(...normalized.roles);
      candidateOrgs.push(...normalized.orgs);
      candidateRisk.push(...normalized.riskFlags);
    }
  }

  const headerPersonalId = extractHeaderValue(req.headers, [
    'x-personal-id',
    'x-user-id',
    'x-gurulo-personal-id',
    'x-admin-id',
  ]);
  if (headerPersonalId) {
    candidateIds.unshift(headerPersonalId);
  }

  const headerRoles = splitList(
    extractHeaderValue(req.headers, ['x-user-role', 'x-user-roles', 'x-gurulo-roles']) || '',
  );
  candidateRoles.push(...headerRoles);

  const headerOrgs = splitList(
    extractHeaderValue(req.headers, ['x-user-orgs', 'x-gurulo-orgs']) || '',
  );
  candidateOrgs.push(...headerOrgs);

  const headerRiskFlags = splitList(
    extractHeaderValue(req.headers, ['x-risk-flags', 'x-gurulo-risk']) || '',
  );
  candidateRisk.push(...headerRiskFlags);

  const queryPersonalId = extractHeaderValue(req.query, ['personalId', 'userId', 'adminId']);
  if (queryPersonalId) {
    candidateIds.push(queryPersonalId);
  }

  const claims = normalizeClaims({
    personalId: candidateIds.find((value) => typeof value === 'string' && value.trim().length > 0) || null,
    roles: candidateRoles,
    orgs: candidateOrgs,
    riskFlags: candidateRisk,
  });

  req.guruloClaims = claims;
  if (req.res && typeof req.res === 'object') {
    req.res.locals = req.res.locals || {};
    req.res.locals.guruloClaims = claims;
  }

  return claims;
}

function extractFastifyClaims(request = {}) {
  const sources = [
    request.guruloClaims,
    request.claims,
    request.user,
    request.auth,
    request.session?.user,
    request.headers,
    request.body,
  ].filter(Boolean);

  const candidateIds = [];
  const candidateRoles = [];
  const candidateOrgs = [];
  const candidateRisk = [];

  for (const source of sources) {
    if (source && typeof source === 'object') {
      const normalized = normalizeClaims(source);
      if (normalized.personalId) {
        candidateIds.push(normalized.personalId);
      }
      candidateRoles.push(...normalized.roles);
      candidateOrgs.push(...normalized.orgs);
      candidateRisk.push(...normalized.riskFlags);
    }
  }

  const headerPersonalId = extractHeaderValue(request.headers, [
    'x-personal-id',
    'x-user-id',
    'x-gurulo-personal-id',
    'x-admin-id',
  ]);
  if (headerPersonalId) {
    candidateIds.unshift(headerPersonalId);
  }

  const headerRoles = splitList(
    extractHeaderValue(request.headers, ['x-user-role', 'x-user-roles', 'x-gurulo-roles']) || '',
  );
  candidateRoles.push(...headerRoles);

  const headerOrgs = splitList(
    extractHeaderValue(request.headers, ['x-user-orgs', 'x-gurulo-orgs']) || '',
  );
  candidateOrgs.push(...headerOrgs);

  const headerRiskFlags = splitList(
    extractHeaderValue(request.headers, ['x-risk-flags', 'x-gurulo-risk']) || '',
  );
  candidateRisk.push(...headerRiskFlags);

  const claims = normalizeClaims({
    personalId: candidateIds.find((value) => typeof value === 'string' && value.trim().length > 0) || null,
    roles: candidateRoles,
    orgs: candidateOrgs,
    riskFlags: candidateRisk,
  });

  request.guruloClaims = claims;
  return claims;
}

function isSuperAdmin(personalId) {
  if (typeof personalId !== 'string') {
    return false;
  }
  return personalId.trim() === SUPER_ADMIN_PERSONAL_ID;
}

function valueToBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['1', 'true', 'yes', 'y', 'ok', 'confirm', 'confirmed'].includes(normalized);
  }
  return false;
}

function hasSuperAdminConfirmation(container = {}) {
  const headers = container.headers || container.req?.headers || container.request?.headers || {};
  for (const key of CONFIRMATION_HEADER_ALIASES) {
    if (valueToBoolean(extractHeaderValue(headers, [key]))) {
      return true;
    }
  }

  const body = container.body || container.req?.body || container.request?.body || {};
  for (const key of BODY_CONFIRMATION_KEYS) {
    if (valueToBoolean(body?.[key])) {
      return true;
    }
  }

  const query = container.query || container.req?.query || container.request?.query || {};
  for (const key of QUERY_CONFIRMATION_KEYS) {
    if (valueToBoolean(query?.[key])) {
      return true;
    }
  }

  return false;
}

function normalizeRoles(roles) {
  if (!roles && roles !== 0) {
    return [];
  }
  const entries = Array.isArray(roles) ? roles : [roles];
  return uniqueStringArray(entries);
}

function createAuditEvent({ req, claims, options, allowed, reason, confirmationProvided }) {
  return {
    action: options.action || `${req.method || 'UNKNOWN'} ${req.originalUrl || req.url || 'unknown'}`,
    allowed,
    destructive: Boolean(options.destructive),
    reason,
    service: options.service || 'shared',
    route: req.originalUrl || req.url || null,
    method: req.method || null,
    confirmationProvided,
    correlationId:
      extractHeaderValue(req.headers, ['x-correlation-id', 'x-request-id', 'x-trace-id']) || null,
    claims,
    timestamp: new Date().toISOString(),
  };
}

async function runAudit(auditFn, event, req) {
  if (typeof auditFn !== 'function') {
    defaultAuditLogger(event);
    return;
  }
  try {
    await auditFn(event, req);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('⚠️ [GURULO AUTH] Audit hook failed:', message);
    defaultAuditLogger(event);
  }
}

function determineFailureResponse({
  reason,
  destructive,
  confirmationProvided,
  requiredRoles,
  allowSuperAdminOverride,
}) {
  switch (reason) {
    case 'unauthenticated':
      return {
        status: 401,
        payload: {
          error: 'AUTH_REQUIRED',
          message: 'ავტორიზაცია აუცილებელია.',
        },
      };
    case 'super_admin_confirmation_missing':
      return {
        status: 428,
        payload: {
          error: 'SUPER_ADMIN_CONFIRMATION_REQUIRED',
          message: 'გთხოვთ დაადასტუროთ სუპერ ადმინისტრატორის ქმედება.',
          confirmationHeader: SUPER_ADMIN_CONFIRMATION_HEADER,
        },
      };
    case 'super_admin_required':
      return {
        status: 403,
        payload: {
          error: 'SUPER_ADMIN_REQUIRED',
          message: 'მოქმედება შესაძლებელია მხოლოდ სუპერ ადმინისტრატორისთვის.',
        },
      };
    case 'role_missing':
    default:
      return {
        status: 403,
        payload: {
          error: 'INSUFFICIENT_ROLE',
          message: 'გთხოვთ გადაამოწმოთ საჭირო როლები.',
          requiredRoles,
          destructive,
          allowSuperAdminOverride,
          confirmationProvided,
        },
      };
  }
}

function createExpressGuard(requiredRoles = [], guardOptions = {}, superAdminOnly = false) {
  const normalizedRoles = normalizeRoles(requiredRoles);
  const options = {
    allowSuperAdminOverride: true,
    destructive: false,
    audit: null,
    action: undefined,
    service: 'shared',
    getClaims: null,
    ...guardOptions,
  };

  return async function guruloExpressGuard(req, res, next) {
    try {
      const resolveClaims = typeof options.getClaims === 'function' ? options.getClaims : extractExpressClaims;
      const claims = normalizeClaims(resolveClaims(req));
      const superAdmin = isSuperAdmin(claims.personalId);
      const confirmationProvided = hasSuperAdminConfirmation(req);

      const hasAnyIdentity = Boolean(claims.personalId || claims.roles.length > 0 || claims.orgs.length > 0);
      if (!hasAnyIdentity) {
        const event = createAuditEvent({
          req,
          claims,
          options,
          allowed: false,
          reason: 'unauthenticated',
          confirmationProvided,
        });
        await runAudit(options.audit, event, req);
        const { status, payload } = determineFailureResponse({
          reason: 'unauthenticated',
          destructive: options.destructive,
          confirmationProvided,
          requiredRoles: normalizedRoles,
          allowSuperAdminOverride: options.allowSuperAdminOverride,
        });
        res.status(status).json(payload);
        return;
      }

      const roles = new Set(claims.roles.map((role) => role.toUpperCase()));
      const hasRequiredRole = normalizedRoles.length === 0
        ? !superAdminOnly
        : normalizedRoles.some((role) => roles.has(role.toUpperCase()));

      let allowed = false;
      let reason = null;

      if (superAdminOnly) {
        if (superAdmin) {
          allowed = true;
        } else {
          allowed = false;
          reason = 'super_admin_required';
        }
      } else if (hasRequiredRole) {
        allowed = true;
      } else if (options.allowSuperAdminOverride !== false && superAdmin) {
        allowed = true;
      } else {
        allowed = false;
        reason = 'role_missing';
      }

      if (allowed && options.destructive) {
        if (!superAdmin) {
          allowed = false;
          reason = 'super_admin_required';
        } else if (!confirmationProvided) {
          allowed = false;
          reason = 'super_admin_confirmation_missing';
        }
      }

      const event = createAuditEvent({
        req,
        claims,
        options,
        allowed,
        reason,
        confirmationProvided,
      });
      await runAudit(options.audit, event, req);

      if (!allowed) {
        const { status, payload } = determineFailureResponse({
          reason: reason || 'role_missing',
          destructive: options.destructive,
          confirmationProvided,
          requiredRoles: normalizedRoles,
          allowSuperAdminOverride: options.allowSuperAdminOverride,
        });
        res.status(status).json(payload);
        return;
      }

      req.guruloClaims = claims;
      res.locals = res.locals || {};
      res.locals.guruloClaims = claims;
      next();
    } catch (error) {
      console.error('❌ [GURULO AUTH] Guard failure:', error instanceof Error ? error.message : error);
      res.status(500).json({
        error: 'AUTH_GUARD_FAILURE',
        message: 'ავტორიზაციის შემოწმება ვერ შესრულდა.',
      });
    }
  };
}

function createFastifyGuard(requiredRoles = [], guardOptions = {}, superAdminOnly = false) {
  const normalizedRoles = normalizeRoles(requiredRoles);
  const options = {
    allowSuperAdminOverride: true,
    destructive: false,
    audit: null,
    action: undefined,
    service: 'shared',
    getClaims: null,
    ...guardOptions,
  };

  return async function guruloFastifyGuard(request, reply) {
    try {
      const resolveClaims = typeof options.getClaims === 'function' ? options.getClaims : extractFastifyClaims;
      const claims = normalizeClaims(resolveClaims(request));
      const superAdmin = isSuperAdmin(claims.personalId);
      const confirmationProvided = hasSuperAdminConfirmation(request);

      const hasAnyIdentity = Boolean(claims.personalId || claims.roles.length > 0 || claims.orgs.length > 0);
      if (!hasAnyIdentity) {
        const event = createAuditEvent({
          req: request,
          claims,
          options,
          allowed: false,
          reason: 'unauthenticated',
          confirmationProvided,
        });
        await runAudit(options.audit, event, request);
        reply.code(401).send({
          error: 'AUTH_REQUIRED',
          message: 'ავტორიზაცია აუცილებელია.',
        });
        return;
      }

      const roles = new Set(claims.roles.map((role) => role.toUpperCase()));
      const hasRequiredRole = normalizedRoles.length === 0
        ? !superAdminOnly
        : normalizedRoles.some((role) => roles.has(role.toUpperCase()));

      let allowed = false;
      let reason = null;

      if (superAdminOnly) {
        allowed = superAdmin;
        if (!allowed) {
          reason = 'super_admin_required';
        }
      } else if (hasRequiredRole) {
        allowed = true;
      } else if (options.allowSuperAdminOverride !== false && superAdmin) {
        allowed = true;
      } else {
        allowed = false;
        reason = 'role_missing';
      }

      if (allowed && options.destructive) {
        if (!superAdmin) {
          allowed = false;
          reason = 'super_admin_required';
        } else if (!confirmationProvided) {
          allowed = false;
          reason = 'super_admin_confirmation_missing';
        }
      }

      const event = createAuditEvent({
        req: request,
        claims,
        options,
        allowed,
        reason,
        confirmationProvided,
      });
      await runAudit(options.audit, event, request);

      if (!allowed) {
        const { status, payload } = determineFailureResponse({
          reason: reason || 'role_missing',
          destructive: options.destructive,
          confirmationProvided,
          requiredRoles: normalizedRoles,
          allowSuperAdminOverride: options.allowSuperAdminOverride,
        });
        reply.code(status).send(payload);
        return;
      }

      request.guruloClaims = claims;
    } catch (error) {
      console.error('❌ [GURULO AUTH] Fastify guard failure:', error instanceof Error ? error.message : error);
      reply.code(500).send({
        error: 'AUTH_GUARD_FAILURE',
        message: 'ავტორიზაციის შემოწმება ვერ შესრულდა.',
      });
    }
  };
}

function requireRoleExpress(requiredRoles = [], options = {}) {
  return createExpressGuard(requiredRoles, options, false);
}

function requireRoleFastify(requiredRoles = [], options = {}) {
  return createFastifyGuard(requiredRoles, options, false);
}

function allowSuperAdminExpress(options = {}) {
  return createExpressGuard(['SUPER_ADMIN'], { ...options, allowSuperAdminOverride: true }, true);
}

function allowSuperAdminFastify(options = {}) {
  return createFastifyGuard(['SUPER_ADMIN'], { ...options, allowSuperAdminOverride: true }, true);
}

const requireRole = Object.assign(requireRoleExpress, { fastify: requireRoleFastify });
const allowSuperAdmin = Object.assign(allowSuperAdminExpress, { fastify: allowSuperAdminFastify });

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

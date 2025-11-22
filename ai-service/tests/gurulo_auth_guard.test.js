const {
  requireRole,
  allowSuperAdmin,
  SUPER_ADMIN_PERSONAL_ID,
  SUPER_ADMIN_CONFIRMATION_HEADER,
} = require('../shared/gurulo-auth');

const createResponse = () => {
  const res = {
    statusCode: 200,
    payload: null,
    locals: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
    set() {
      return this;
    },
  };
  return res;
};

describe('Gurulo auth guards', () => {
  test('requireRole denies unauthenticated requests', async () => {
    const guard = requireRole(['ADMIN']);
    const req = { headers: {}, user: null };
    const res = createResponse();
    const next = jest.fn();

    await guard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.payload?.error).toBe('AUTH_REQUIRED');
  });

  test('allowSuperAdmin enforces confirmation for destructive actions', async () => {
    const guard = allowSuperAdmin({ destructive: true, action: 'test.destructive' });
    const req = {
      headers: {},
      user: {
        personalId: SUPER_ADMIN_PERSONAL_ID,
        role: 'SUPER_ADMIN',
        authenticated: true,
      },
    };
    const res = createResponse();
    const next = jest.fn();

    await guard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(428);
    expect(res.payload?.error).toBe('SUPER_ADMIN_CONFIRMATION_REQUIRED');
  });

  test('allowSuperAdmin passes when confirmation header is provided', async () => {
    const guard = allowSuperAdmin({ destructive: true, action: 'test.confirmed' });
    const req = {
      headers: {
        [SUPER_ADMIN_CONFIRMATION_HEADER]: 'true',
      },
      user: {
        personalId: SUPER_ADMIN_PERSONAL_ID,
        role: 'SUPER_ADMIN',
        authenticated: true,
      },
    };
    const res = createResponse();
    const next = jest.fn();

    await guard(req, res, next);

    expect(res.statusCode).toBe(200);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.guruloClaims?.personalId).toBe(SUPER_ADMIN_PERSONAL_ID);
  });
});

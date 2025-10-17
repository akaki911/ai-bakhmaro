import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getEnv } from '../env';

const env = getEnv();

type JwtPayload = jwt.JwtPayload & {
  iss: string;
  sub: string;
  aud: string | string[];
};

export type VerifiedServiceToken = {
  id: string;
  issuedAt: number;
  expiresAt: number;
  subject: string;
  issuer: string;
  audience: string;
};

const isBearer = (value: string | string[] | undefined): string | null => {
  if (!value) {
    return null;
  }

  const raw = Array.isArray(value) ? value[0] : value;

  if (typeof raw !== 'string') {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  return trimmed.slice(7);
};

export const requireServiceToken = () =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.method === 'OPTIONS') {
      next();
      return;
    }

    try {
      const headerToken = isBearer(req.headers.authorization);

      if (!headerToken) {
        res.status(401).json({ error: 'Missing service authorization token' });
        return;
      }

      const decoded = jwt.verify(headerToken, env.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: env.SERVICE_JWT_ISSUER,
        subject: env.SERVICE_JWT_SUBJECT,
      }) as JwtPayload;

      const audience = Array.isArray(decoded.aud) ? decoded.aud[0] : decoded.aud;
      if (audience !== env.SERVICE_JWT_AUDIENCE) {
        res.status(403).json({ error: 'Invalid service audience' });
        return;
      }

      res.locals.serviceToken = {
        id: typeof decoded.jti === 'string' ? decoded.jti : 'unknown',
        issuedAt: typeof decoded.iat === 'number' ? decoded.iat : 0,
        expiresAt: typeof decoded.exp === 'number' ? decoded.exp : 0,
        subject: decoded.sub,
        issuer: decoded.iss,
        audience,
      } satisfies VerifiedServiceToken;

      next();
    } catch (error) {
      console.error('❌ Invalid service token', error);
      res.status(401).json({ error: 'Invalid service authorization token' });
    }
  };

export const extractForwardedBearer = (req: Request): string | null => {
  const forwarded = req.headers['x-forwarded-authorization'];
  return isBearer(forwarded) ?? isBearer(req.headers.authorization);
};

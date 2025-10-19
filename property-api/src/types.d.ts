import type { VerifiedServiceToken } from './middleware/serviceAuth.js';

declare global {
  namespace Express {
    interface Locals {
      serviceToken?: VerifiedServiceToken;
    }
  }
}

export {};

import type { VerifiedServiceToken } from './middleware/serviceAuth';

declare global {
  namespace Express {
    interface Locals {
      serviceToken?: VerifiedServiceToken;
    }
  }
}

export {};

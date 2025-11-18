import { buildApiUrl } from '../lib/apiBase';
import { rateLimitedJsonFetch } from '../utils/rateLimitedFetch';

const BASE_KEY = 'gurulo:apiKeys';

export interface ApiKey {
  keyId: string;
  name: string;
  scopes: string[];
  createdAt: Date;
  lastUsedAt: Date | null;
  usageCount: number;
  isActive: boolean;
}

export interface CreateKeyRequest {
  name: string;
  scopes?: string[];
}

export interface CreateKeyResponse {
  success: boolean;
  apiKey: string;
  keyId: string;
  endpoint: string;
  warning: string;
}

export interface ListKeysResponse {
  success: boolean;
  keys: ApiKey[];
}

export interface RevokeKeyResponse {
  success: boolean;
  message: string;
}

class ApiKeysService {
  private readonly baseUrl = '/api/keys';

  async createKey(request: CreateKeyRequest): Promise<CreateKeyResponse> {
    const response = await rateLimitedJsonFetch<CreateKeyResponse>(buildApiUrl(`${this.baseUrl}/create`), {
      key: `${BASE_KEY}:create`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return response;
  }

  async listKeys(): Promise<ApiKey[]> {
    const response = await rateLimitedJsonFetch<ListKeysResponse>(buildApiUrl(`${this.baseUrl}/list`), {
      key: `${BASE_KEY}:list`,
      method: 'GET',
    });
    return response.keys.map(key => ({
      ...key,
      createdAt: new Date(key.createdAt),
      lastUsedAt: key.lastUsedAt ? new Date(key.lastUsedAt) : null,
    }));
  }

  async revokeKey(keyId: string): Promise<void> {
    await rateLimitedJsonFetch<RevokeKeyResponse>(buildApiUrl(`${this.baseUrl}/revoke/${keyId}`), {
      key: `${BASE_KEY}:revoke:${keyId}`,
      method: 'DELETE',
    });
  }
}

export const apiKeysService = new ApiKeysService();

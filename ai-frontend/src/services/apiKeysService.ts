
import { apiBase } from '../lib/apiBase';

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
    const response = await apiBase<CreateKeyResponse>(`${this.baseUrl}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return response;
  }

  async listKeys(): Promise<ApiKey[]> {
    const response = await apiBase<ListKeysResponse>(`${this.baseUrl}/list`, {
      method: 'GET',
    });
    return response.keys.map(key => ({
      ...key,
      createdAt: new Date(key.createdAt),
      lastUsedAt: key.lastUsedAt ? new Date(key.lastUsedAt) : null,
    }));
  }

  async revokeKey(keyId: string): Promise<void> {
    await apiBase<RevokeKeyResponse>(`${this.baseUrl}/revoke/${keyId}`, {
      method: 'DELETE',
    });
  }
}

export const apiKeysService = new ApiKeysService();

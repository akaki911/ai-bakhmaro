import { RedisMemoryAdapter as RuntimeRedisMemoryAdapter } from './redis.js';

export interface RedisAdapterOptions {
  client: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    del(key: string): Promise<void>;
    keys(pattern: string): Promise<string[]>;
  };
  namespace?: string;
}

export const RedisMemoryAdapter: {
  new (options: RedisAdapterOptions): RuntimeRedisMemoryAdapter;
} = RuntimeRedisMemoryAdapter as unknown as {
  new (options: RedisAdapterOptions): RuntimeRedisMemoryAdapter;
};

import { FilesystemMemoryAdapter as RuntimeFilesystemMemoryAdapter } from './filesystem.js';

export interface FilesystemAdapterOptions {
  basePath?: string;
  encoding?: BufferEncoding;
  fs?: typeof import('fs').promises;
}

export const FilesystemMemoryAdapter: {
  new (options?: FilesystemAdapterOptions): RuntimeFilesystemMemoryAdapter;
} = RuntimeFilesystemMemoryAdapter as unknown as {
  new (options?: FilesystemAdapterOptions): RuntimeFilesystemMemoryAdapter;
};

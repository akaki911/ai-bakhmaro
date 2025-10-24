import path from 'node:path';
import frontendConfig from './ai-frontend/eslint.config.mjs';
import gatewayConfig from './gateway/eslint.config.mjs';

function prefixConfigs(configs, baseDir) {
  return configs.map((config) => {
    const prefixed = { ...config };

    if (config.files) {
      prefixed.files = config.files.map((pattern) =>
        path.posix.join(baseDir, pattern)
      );
    }

    if (config.ignores) {
      prefixed.ignores = config.ignores.map((pattern) => {
        const isNegated = pattern.startsWith('!');
        const target = isNegated ? pattern.slice(1) : pattern;
        const joined = path.posix.join(baseDir, target);
        return isNegated ? `!${joined}` : joined;
      });
    }

    if (config.languageOptions) {
      prefixed.languageOptions = { ...config.languageOptions };
      const existingParserOptions = config.languageOptions.parserOptions ?? {};
      prefixed.languageOptions.parserOptions = {
        ...existingParserOptions,
        tsconfigRootDir: path.resolve(process.cwd(), baseDir),
      };
    }

    return prefixed;
  });
}

const baseIgnores = [
  '**/node_modules/**',
  'backup_attached_assets/**',
  'backup_before_restore/**',
  'dist/**',
  'docs/**',
  'functions/**',
  'scripts/**',
  'tests/**',
  'ai-service/**',
  'knowledge_source/**',
  'shared/**',
  'backend/**',
];

export default [
  { ignores: baseIgnores },
  ...prefixConfigs(frontendConfig, 'ai-frontend'),
  ...prefixConfigs(gatewayConfig, 'gateway'),
];

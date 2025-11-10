const fs = require('fs').promises;
const path = require('path');

const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..');
const ALLOWED_SERVICES = new Set([
  'ai-service',
  'ai-frontend',
  'backend',
  'gateway',
  'shared',
  'functions',
  'frontend',
  'tests',
  'scripts',
  'docs'
]);
const IGNORED_DIRS = ['node_modules', '.git', '.replit', 'build', 'dist', '.assistant_backups', 'tmp', 'logs'];
const SENSITIVE_PATTERNS = [
  /\.env/i,                              // Environment files
  /\.key$/,                               // Key files
  /firebase-service-account/,             // Firebase credentials
  /backend[/\\]data[/\\]/,                // Backend data folder
  /secrets/i,                             // Secret configs
  /\.pem$/,                               // Certificate files
  /audit[_-]?log/i,                       // Audit logs
  /database\.json$/,                      // Database dumps
  /config[/\\].*\.key/                    // Config keys
];
const loggedSensitiveFiles = new Set();
let cachedProjectFiles = null;
let lastProjectScan = 0;
const PROJECT_CACHE_TTL = 30000; // 30 seconds

const containsIgnoredSegment = (normalizedRel) => {
  const segments = normalizedRel.split('/');
  return segments.some(segment => IGNORED_DIRS.includes(segment));
};

async function getProjectStructure(forceRefresh = false) {
  try {
    const now = Date.now();

    if (!forceRefresh && cachedProjectFiles && (now - lastProjectScan) < PROJECT_CACHE_TTL) {
      return cachedProjectFiles;
    }

    const files = await walkDirectory(WORKSPACE_ROOT);
    cachedProjectFiles = files;
    lastProjectScan = now;
    return files;
  } catch (error) {
    console.error('Error getting project structure:', error);
    return [];
  }
}

// Fallback function for manual directory walking
async function walkDirectory(dir, relativePath = '') {
  const files = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relativePath, entry.name);

      const normalizedRel = relPath.replace(/\\/g, '/');
      const firstSegment = normalizedRel.split('/')[0];

      if (entry.isDirectory()) {
        // Respect ignore list at directory level
        if (
          containsIgnoredSegment(normalizedRel) ||
          normalizedRel.startsWith('.') && !ALLOWED_SERVICES.has(firstSegment)
        ) {
          continue;
        }

        if (!ALLOWED_SERVICES.has(firstSegment) || containsIgnoredSegment(normalizedRel)) {
          continue;
        }

        if (SENSITIVE_PATTERNS.some(pattern => pattern.test(`${normalizedRel}/`))) {
          if (!loggedSensitiveFiles.has(normalizedRel)) {
            console.warn(`🔒 [SECURITY] Excluding sensitive directory from scan: ${normalizedRel}`);
            loggedSensitiveFiles.add(normalizedRel);
          }
          continue;
        }

        // Recursively walk subdirectories
        const subFiles = await walkDirectory(fullPath, relPath);
        files.push(...subFiles);
      } else {
        if (!ALLOWED_SERVICES.has(firstSegment)) {
          continue;
        }

        if (SENSITIVE_PATTERNS.some(pattern => pattern.test(normalizedRel))) {
          if (!loggedSensitiveFiles.has(normalizedRel)) {
            console.warn(`🔒 [SECURITY] Excluding sensitive file from scan: ${normalizedRel}`);
            loggedSensitiveFiles.add(normalizedRel);
          }
          continue;
        }

        // Add file to list (normalized)
        files.push(normalizedRel);
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }

  return files;
}

/**
 * Read file content with size and encoding options
 * UPDATED: Supports cross-service reads within workspace
 * @param {string} filePath - Relative path to file (workspace-relative)
 * @param {Object} options - Reading options
 * @returns {Promise<string>} File content
 */
async function readFileContent(filePath, options = {}) {
  const { maxBytes = 8000, encoding = 'utf8' } = options;

  try {
    const absolutePath = path.resolve(WORKSPACE_ROOT, filePath);

    // SECURITY: Ensure file is within workspace boundaries
    const relativeToWorkspace = path.relative(WORKSPACE_ROOT, absolutePath);
    if (relativeToWorkspace.startsWith('..') || path.isAbsolute(relativeToWorkspace)) {
      throw new Error('File access outside workspace is not permitted');
    }

    // SECURITY: Ensure file resides in an allowed service directory
    const normalizedRelative = relativeToWorkspace.replace(/\\/g, '/');
    const serviceSegment = normalizedRelative.split('/')[0];
    if (!ALLOWED_SERVICES.has(serviceSegment) || containsIgnoredSegment(normalizedRelative)) {
      throw new Error('File access outside allowed service directories not permitted');
    }

    // SECURITY: Block sensitive files
    if (SENSITIVE_PATTERNS.some(pattern => pattern.test(filePath))) {
      throw new Error('Access to sensitive files not permitted');
    }

    const stats = await fs.stat(absolutePath);
    if (stats.size > maxBytes) {
      // Read only the first portion of large files
      const buffer = Buffer.alloc(maxBytes);
      const fd = await fs.open(absolutePath, 'r');
      await fd.read(buffer, 0, maxBytes, 0);
      await fd.close();
      return buffer.toString(encoding);
    } else {
      return await fs.readFile(absolutePath, encoding);
    }
  } catch (error) {
    console.warn(`⚠️ [FILE SYSTEM] Could not read file ${filePath}:`, error.message);
    return null;
  }
}

module.exports = {
  getProjectStructure,
  readFileContent,
  clearProjectStructureCache: () => {
    cachedProjectFiles = null;
    lastProjectScan = 0;
  }
};

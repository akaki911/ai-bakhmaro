const fs = require('fs').promises;
const path = require('path');

async function getProjectStructure() {
  try {
    // Scan workspace with strict security controls
    const workspaceRoot = path.resolve(process.cwd(), '..');
    
    // SECURITY: Whitelist of allowed service directories only
    const allowedServices = ['ai-service', 'ai-frontend', 'backend'];
    
    // SECURITY: Sensitive file/folder patterns to exclude
    const sensitivePatterns = [
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
    
    // For Node.js 18.17.0+, use recursive readdir
    let allFiles;
    try {
      allFiles = await fs.readdir(workspaceRoot, { recursive: true });
    } catch (error) {
      // Fallback for older Node.js versions - walk directories manually
      allFiles = await walkDirectory(workspaceRoot);
    }

    // Multi-layer filtering: ignore dirs + service whitelist + sensitive exclusion
    const ignoredDirs = ['node_modules', '.git', '.replit', 'build', 'dist', '.assistant_backups', 'tmp', 'logs'];
    
    return allFiles.filter(file => {
      // Layer 1: Skip ignored directories
      if (ignoredDirs.some(folder => file.startsWith(folder))) return false;
      
      // Layer 2: Service whitelist - only allow files from approved services
      const isInAllowedService = allowedServices.some(service => 
        file.startsWith(service + '/') || file.startsWith(service + '\\')
      );
      if (!isInAllowedService) return false;
      
      // Layer 3: Sensitive pattern exclusion
      if (sensitivePatterns.some(pattern => pattern.test(file))) {
        console.warn(`🔒 [SECURITY] Excluding sensitive file from scan: ${file}`);
        return false;
      }
      
      // Layer 4: Verify it's actually a file (not directory)
      try {
        const fullPath = path.resolve(workspaceRoot, file);
        const stat = require('fs').statSync(fullPath);
        return stat.isFile();
      } catch {
        return false;
      }
    });
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

      if (entry.isDirectory()) {
        // Recursively walk subdirectories
        const subFiles = await walkDirectory(fullPath, relPath);
        files.push(...subFiles);
      } else {
        // Add file to list
        files.push(relPath);
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
    // Use workspace root for cross-service file access
    const workspaceRoot = path.resolve(process.cwd(), '..');
    const absolutePath = path.resolve(workspaceRoot, filePath);

    // SECURITY: Ensure file is within workspace and allowed services
    const allowedServices = ['ai-service', 'ai-frontend', 'backend'];
    const isWithinWorkspace = absolutePath.startsWith(workspaceRoot);
    const isInAllowedService = allowedServices.some(service =>
      absolutePath.includes(path.join(workspaceRoot, service))
    );
    
    if (!isWithinWorkspace || !isInAllowedService) {
      throw new Error('File access outside allowed service directories not permitted');
    }
    
    // SECURITY: Block sensitive files
    const sensitivePatterns = [/.env/i, /\.key$/, /firebase-service-account/, /secrets/i];
    if (sensitivePatterns.some(pattern => pattern.test(filePath))) {
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
  readFileContent
};
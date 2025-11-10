const { getProjectStructure } = require('./file_system_service');

// Enhanced regex patterns for file path detection
const filePathRegex = /([a-zA-Z0-9_\-\/]+\.[a-zA-Z]{2,})/g;
const fileNameRegex = /\b([a-zA-Z0-9_\-]+\.(js|ts|jsx|tsx|py|css|scss|html|json|md|txt|sql|php|java|go|rust|cpp|c|h))\b/gi;

async function findRelevantFiles(query) {
    const mentionedFiles = query.match(filePathRegex) || [];
    if (mentionedFiles.length === 0) {
        return []; // No files mentioned
    }

    const projectFiles = await getProjectStructure();
    const relevantFiles = [];
    
    // For each mentioned file, find matching files in the project
    for (const mentionedFile of mentionedFiles) {
        // First, try exact match
        if (projectFiles.includes(mentionedFile)) {
            relevantFiles.push(mentionedFile);
            continue;
        }
        
        // Then, try to find files that end with this filename
        const matchingFiles = projectFiles.filter(projectFile => {
            // Check if project file ends with the mentioned filename
            return projectFile.endsWith(mentionedFile) || 
                   projectFile.endsWith(`/${mentionedFile}`) ||
                   projectFile.includes(mentionedFile);
        });
        
        relevantFiles.push(...matchingFiles);
    }
    
    // Remove duplicates and return
    return [...new Set(relevantFiles)];
}

/**
 * Extract explicit file mentions from user query
 * Part 1 requirement: Direct File Context detection
 * @param {string} query - User query text
 * @returns {Array<string>} - Array of potential file paths/names
 */
function extractFileMentions(query) {
    if (!query || typeof query !== 'string') return [];
    
    const mentions = new Set();
    
    // Extract full file paths
    const pathMatches = query.match(filePathRegex) || [];
    pathMatches.forEach(match => mentions.add(match.trim()));
    
    // Extract just file names
    const nameMatches = query.match(fileNameRegex) || [];
    nameMatches.forEach(match => mentions.add(match.trim()));
    
    // Georgian language file mentions (e.g., "server.js-ში")
    const georgianFileRegex = /([a-zA-Z0-9_\-]+\.[a-zA-Z]{2,})(-ში|-ზე|-თან|-დან)/g;
    const georgianMatches = query.match(georgianFileRegex) || [];
    georgianMatches.forEach(match => {
        const fileName = match.replace(/(-ში|-ზე|-თან|-დან)$/, '');
        mentions.add(fileName);
    });
    
    return Array.from(mentions);
}

/**
 * Normalize path for cross-platform comparison
 * @param {string} filePath - File path to normalize
 * @returns {string} - Normalized path
 */
function normalizePath(filePath) {
    return filePath
        .replace(/\\/g, '/')           // Windows → Unix separators
        .replace(/^\.\//, '')          // Remove leading ./
        .toLowerCase();                // Case-insensitive
}

/**
 * Extract basename from path
 * @param {string} filePath - File path
 * @returns {string} - File basename
 */
function getBasename(filePath) {
    return filePath.split('/').pop();
}

/**
 * Resolve candidate file mentions to actual project file paths
 * ENHANCED: Cross-platform normalization + basename multimap + fuzzy matching
 * Part 1 requirement: Enhanced file resolution
 * @param {Array<string>} mentions - File mentions from extractFileMentions
 * @returns {Promise<Array<string>>} - Array of resolved file paths
 */
async function resolveCandidateFiles(mentions) {
    if (!mentions || mentions.length === 0) {
        console.log('📂 [CONTEXT RETRIEVAL] No file mentions to resolve');
        return [];
    }
    
    try {
        const projectFiles = await getProjectStructure();
        console.log(`📂 [CONTEXT RETRIEVAL] Resolving ${mentions.length} mentions against ${projectFiles.length} project files`);
        
        // Build basename → paths multimap for efficient lookup
        const basenameMap = new Map();
        projectFiles.forEach(filePath => {
            const normalized = normalizePath(filePath);
            const basename = getBasename(normalized);
            
            if (!basenameMap.has(basename)) {
                basenameMap.set(basename, []);
            }
            basenameMap.get(basename).push(filePath); // Keep original path
        });
        
        const resolved = new Set();
        
        for (const mention of mentions) {
            const normalizedMention = normalizePath(mention);
            const mentionBasename = getBasename(normalizedMention);
            
            // Strategy 1: Exact full path match (rare but fast)
            const exactMatch = projectFiles.find(p => normalizePath(p) === normalizedMention);
            if (exactMatch) {
                resolved.add(exactMatch);
                console.log(`✅ [CONTEXT RETRIEVAL] Exact match: "${mention}" → "${exactMatch}"`);
                continue;
            }
            
            // Strategy 2: Basename lookup (most common case)
            if (basenameMap.has(mentionBasename)) {
                const candidates = basenameMap.get(mentionBasename);
                candidates.forEach(file => resolved.add(file));
                console.log(`✅ [CONTEXT RETRIEVAL] Basename match: "${mention}" → ${candidates.length} file(s): ${candidates.slice(0, 2).join(', ')}${candidates.length > 2 ? '...' : ''}`);
                continue;
            }
            
            // Strategy 3: Fuzzy substring matching (fallback)
            const fuzzyMatches = projectFiles.filter(projectFile => {
                const normalizedProject = normalizePath(projectFile);
                return normalizedProject.includes(normalizedMention) ||
                       normalizedProject.endsWith(`/${normalizedMention}`);
            });
            
            if (fuzzyMatches.length > 0) {
                fuzzyMatches.forEach(file => resolved.add(file));
                console.log(`🔍 [CONTEXT RETRIEVAL] Fuzzy match: "${mention}" → ${fuzzyMatches.length} file(s)`);
            } else {
                console.warn(`⚠️ [CONTEXT RETRIEVAL] No match found for: "${mention}"`);
            }
        }
        
        const resolvedArray = Array.from(resolved);
        console.log(`📊 [CONTEXT RETRIEVAL] Resolved ${resolvedArray.length} files from ${mentions.length} mentions`);
        return resolvedArray;
        
    } catch (error) {
        console.error('❌ [CONTEXT RETRIEVAL] Error resolving candidate files:', error.message);
        return [];
    }
}

module.exports = {
    findRelevantFiles,
    extractFileMentions,
    resolveCandidateFiles
};
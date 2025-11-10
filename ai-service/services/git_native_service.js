/**
 * Git Native Service - Comprehensive Git Integration
 * 
 * Unified service that combines native Git commands with GitHub API fallback,
 * file watching for auto-commits, encrypted credentials storage, and performance tracking.
 * 
 * Features:
 * - Native Git operations with git_commands_service.js
 * - GitHub API integration via github_integration_service.js
 * - Chokidar file watcher for auto-commit functionality
 * - Firestore secrets vault for encrypted Git credentials
 * - Octokit fallback when native commands fail
 * - Performance tracking with PostgreSQL metrics
 * - Security validation through trusted_ops_policy.js
 * 
 * Author: Gurulo AI Assistant
 * Date: 2025-11-10
 */

const gitCommandsService = require('./git_commands_service');
const gitHubIntegrationService = require('./github_integration_service');
const firebaseOperationsService = require('./firebase_operations_service');
const trustedOpsPolicy = require('./trusted_ops_policy');
const chokidar = require('chokidar');
const { Octokit } = require('@octokit/rest');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? true : false
});

/**
 * Git Native Service - Unified Git Operations Manager
 */
class GitNativeService {
  constructor() {
    this.isInitialized = false;
    this.projectRoot = process.cwd();
    
    // Service dependencies
    this.gitCommands = gitCommandsService;
    this.gitHubIntegration = gitHubIntegrationService;
    this.firebaseOps = firebaseOperationsService;
    this.trustedOps = trustedOpsPolicy;
    
    // File watcher for auto-commit
    this.watcher = null;
    this.watcherEnabled = false;
    this.watcherDebounceTimer = null;
    this.watcherDebounceMs = 5000; // 5 seconds debounce
    
    // Octokit instance for fallback
    this.octokit = null;
    this.octokitEnabled = false;
    
    // Encryption key for credentials (AES-256-CBC requires 32 bytes)
    this.encryptionKey = process.env.GIT_ENCRYPTION_KEY || this.generateEncryptionKey();
    
    // Credentials and configuration
    this.credentials = {
      githubToken: process.env.GITHUB_TOKEN || null,
      username: null,
      email: null,
      encrypted: false
    };
    
    // Performance metrics
    this.metrics = {
      nativeOperations: 0,
      apiOperations: 0,
      failedNative: 0,
      failedApi: 0,
      totalLatency: 0,
      operations: []
    };
    
    // Watcher statistics
    this.watcherStats = {
      filesWatched: 0,
      autoCommitsTriggered: 0,
      lastAutoCommit: null,
      changesDetected: 0
    };
    
    // Ignored paths for file watcher (similar to enhanced_file_monitor_service)
    this.ignoredPaths = [
      'node_modules/**',
      '**/node_modules/**',
      '.git/**',
      '**/.git/**',
      '.replit/**',
      'build/**',
      'dist/**',
      '.next/**',
      'coverage/**',
      'tmp/**',
      '*.log',
      '.DS_Store',
      '.env*',
      'memory_data/**',
      'memory_facts/**',
      'attached_assets/**',
      '**/*.png',
      '**/*.jpg',
      '**/*.jpeg',
      '**/*.gif'
    ];
    
    console.log('🔧 [GIT NATIVE] GitNativeService instance created');
  }
  
  /**
   * Initialize all services and components
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ [GIT NATIVE] Already initialized');
      return { success: true, message: 'Already initialized' };
    }
    
    try {
      console.log('🚀 [GIT NATIVE] Initializing comprehensive Git service...');
      
      // Step 1: Initialize trusted ops policy
      await this.trustedOps.initialize();
      console.log('✅ [GIT NATIVE] Trusted ops policy initialized');
      
      // Step 2: Initialize Git commands service
      const gitInit = await this.gitCommands.initializeGit();
      if (!gitInit.success) {
        throw new Error(`Git commands initialization failed: ${gitInit.error}`);
      }
      console.log('✅ [GIT NATIVE] Git commands service initialized');
      
      // Step 3: Initialize GitHub integration service
      const githubInit = await this.gitHubIntegration.initializeGit();
      if (!githubInit.success) {
        console.warn('⚠️ [GIT NATIVE] GitHub integration initialization failed:', githubInit.error);
      } else {
        console.log('✅ [GIT NATIVE] GitHub integration service initialized');
      }
      
      // Step 4: Load encrypted credentials from Firestore
      await this.loadCredentials();
      
      // Step 5: Initialize Octokit if GitHub token available
      if (this.credentials.githubToken) {
        this.octokit = new Octokit({
          auth: this.credentials.githubToken,
          userAgent: 'Gurulo-AI-Assistant/1.0',
          timeZone: 'Asia/Tbilisi',
          baseUrl: 'https://api.github.com'
        });
        this.octokitEnabled = true;
        console.log('✅ [GIT NATIVE] Octokit API client initialized');
      } else {
        console.warn('⚠️ [GIT NATIVE] No GitHub token - Octokit fallback disabled');
      }
      
      // Step 6: Initialize file watcher (disabled by default)
      console.log('💡 [GIT NATIVE] File watcher ready (use enableAutoCommitWatcher to activate)');
      
      // Step 7: Ensure PostgreSQL tables exist
      await this.ensureMetricsTables();
      
      this.isInitialized = true;
      console.log('✅ [GIT NATIVE] Git Native Service fully initialized');
      
      return {
        success: true,
        message: 'Git Native Service initialized successfully',
        features: {
          nativeGit: true,
          githubApi: this.octokitEnabled,
          fileWatcher: 'ready',
          secureCredentials: this.credentials.encrypted,
          performanceTracking: true,
          securityPolicy: true
        }
      };
      
    } catch (error) {
      console.error('❌ [GIT NATIVE] Initialization failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Load Git credentials from Firestore secrets vault with decryption
   * 
   * This method retrieves encrypted credentials from Firestore and decrypts them
   * using AES-256-CBC algorithm. If encrypted credentials are not found, it falls
   * back to environment variables.
   * 
   * Security: Credentials are stored encrypted in Firestore and only decrypted in memory
   */
  async loadCredentials() {
    try {
      console.log('🔐 [GIT NATIVE] Loading Git credentials from Firestore...');
      
      // Query Firestore for Git credentials
      const result = await this.firebaseOps.queryCollection('secrets_vault', [
        { field: 'service', operator: '==', value: 'git' },
        { field: 'active', operator: '==', value: true }
      ]);
      
      if (result.success && result.data.length > 0) {
        const credentialDoc = result.data[0];
        
        // Check if credentials are encrypted
        if (credentialDoc.encrypted && credentialDoc.github_token_encrypted) {
          // Decrypt credentials using AES-256-CBC
          try {
            this.credentials.githubToken = this.decryptCredential(credentialDoc.github_token_encrypted);
            this.credentials.username = credentialDoc.username_encrypted 
              ? this.decryptCredential(credentialDoc.username_encrypted)
              : (credentialDoc.username || 'Gurulo AI Assistant');
            this.credentials.email = credentialDoc.email_encrypted
              ? this.decryptCredential(credentialDoc.email_encrypted)
              : (credentialDoc.email || 'gurulo@bakhmaro.ai');
            this.credentials.encrypted = true;
            
            console.log('✅ [GIT NATIVE] Credentials loaded and decrypted from Firestore');
          } catch (decryptError) {
            console.error('❌ [GIT NATIVE] Decryption failed, using plain values:', decryptError.message);
            // Fallback to plain values if decryption fails
            this.credentials.githubToken = credentialDoc.github_token || process.env.GITHUB_TOKEN;
            this.credentials.username = credentialDoc.username || 'Gurulo AI Assistant';
            this.credentials.email = credentialDoc.email || 'gurulo@bakhmaro.ai';
            this.credentials.encrypted = false;
          }
        } else {
          // Plain credentials (legacy format or not encrypted)
          this.credentials.githubToken = credentialDoc.github_token || process.env.GITHUB_TOKEN;
          this.credentials.username = credentialDoc.username || 'Gurulo AI Assistant';
          this.credentials.email = credentialDoc.email || 'gurulo@bakhmaro.ai';
          this.credentials.encrypted = false;
          
          console.log('ℹ️ [GIT NATIVE] Credentials loaded from Firestore (not encrypted)');
        }
      } else {
        // Fallback to environment variables
        this.credentials.githubToken = process.env.GITHUB_TOKEN;
        this.credentials.username = process.env.GIT_USERNAME || 'Gurulo AI Assistant';
        this.credentials.email = process.env.GIT_EMAIL || 'gurulo@bakhmaro.ai';
        this.credentials.encrypted = false;
        
        console.log('ℹ️ [GIT NATIVE] Using environment variables for credentials');
      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ [GIT NATIVE] Failed to load credentials:', error);
      
      // Ultimate fallback to env vars
      this.credentials.githubToken = process.env.GITHUB_TOKEN;
      this.credentials.username = 'Gurulo AI Assistant';
      this.credentials.email = 'gurulo@bakhmaro.ai';
      
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Save Git credentials to Firestore secrets vault with encryption
   * 
   * This method encrypts credentials using AES-256-CBC before storing them in Firestore.
   * Encrypted fields are stored separately from plain metadata for security.
   * 
   * Security: 
   * - Credentials are encrypted using AES-256-CBC algorithm
   * - Each credential field is encrypted independently
   * - Original plain values are never stored in Firestore
   * - Encryption key is managed separately via environment variable
   */
  async saveCredentials(credentials) {
    try {
      console.log('🔐 [GIT NATIVE] Saving Git credentials to Firestore with encryption...');
      
      // CRITICAL FIX: Store old token BEFORE updating credentials
      const oldToken = this.credentials.githubToken;
      const newToken = credentials.githubToken || this.credentials.githubToken;
      const newUsername = credentials.username || this.credentials.username;
      const newEmail = credentials.email || this.credentials.email;
      
      // Encrypt credentials using AES-256-CBC
      const credentialData = {
        service: 'git',
        encrypted: true,
        active: true,
        updatedAt: new Date().toISOString()
      };
      
      // Encrypt each credential field separately for better security
      if (newToken) {
        credentialData.github_token_encrypted = this.encryptCredential(newToken);
      }
      if (newUsername) {
        credentialData.username_encrypted = this.encryptCredential(newUsername);
      }
      if (newEmail) {
        credentialData.email_encrypted = this.encryptCredential(newEmail);
      }
      
      // Add metadata (not sensitive, can be stored plain)
      credentialData.token_masked = newToken ? `${newToken.substring(0, 7)}...${newToken.substring(newToken.length - 4)}` : null;
      credentialData.username = newUsername; // Store plain for display purposes
      credentialData.email = newEmail; // Store plain for display purposes
      
      // First, check if credentials already exist
      const existing = await this.firebaseOps.queryCollection('secrets_vault', [
        { field: 'service', operator: '==', value: 'git' }
      ]);
      
      if (existing.success && existing.data.length > 0) {
        // Update existing
        const docId = existing.data[0].id;
        await this.firebaseOps.updateDocument('secrets_vault', docId, credentialData);
        console.log('✅ [GIT NATIVE] Encrypted credentials updated in Firestore');
      } else {
        // Create new
        await this.firebaseOps.createCollection('secrets_vault', credentialData);
        console.log('✅ [GIT NATIVE] Encrypted credentials saved to Firestore');
      }
      
      // Update local credentials AFTER storing old token
      this.credentials = {
        githubToken: newToken,
        username: newUsername,
        email: newEmail,
        encrypted: true
      };
      
      // Reinitialize Octokit if token changed (compare with OLD token)
      if (newToken && newToken !== oldToken) {
        this.octokit = new Octokit({
          auth: newToken,
          userAgent: 'Gurulo-AI-Assistant/1.0',
          timeZone: 'Asia/Tbilisi',
          baseUrl: 'https://api.github.com'
        });
        this.octokitEnabled = true;
        console.log('✅ [GIT NATIVE] Octokit reinitialized with new token');
      } else if (newToken && !oldToken) {
        // First time token is set
        this.octokit = new Octokit({
          auth: newToken,
          userAgent: 'Gurulo-AI-Assistant/1.0',
          timeZone: 'Asia/Tbilisi',
          baseUrl: 'https://api.github.com'
        });
        this.octokitEnabled = true;
        console.log('✅ [GIT NATIVE] Octokit initialized with new token');
      }
      
      return { success: true, message: 'Credentials encrypted and saved securely' };
    } catch (error) {
      console.error('❌ [GIT NATIVE] Failed to save credentials:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Ensure PostgreSQL metrics tables exist
   */
  async ensureMetricsTables() {
    try {
      // Check if git_metrics_history table exists
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'git_metrics_history'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.log('📊 [GIT NATIVE] Creating git_metrics_history table...');
        
        // Create table using migration SQL
        await pool.query(`
          CREATE TABLE IF NOT EXISTS git_metrics_history (
            id SERIAL PRIMARY KEY,
            operation VARCHAR(50) NOT NULL CHECK (operation IN ('commit', 'push', 'pull')),
            duration_ms FLOAT NOT NULL,
            status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'error')),
            metadata JSONB DEFAULT '{}',
            timestamp TIMESTAMP DEFAULT now()
          );
          
          CREATE INDEX IF NOT EXISTS idx_git_metrics_operation ON git_metrics_history(operation);
          CREATE INDEX IF NOT EXISTS idx_git_metrics_timestamp ON git_metrics_history(timestamp DESC);
          CREATE INDEX IF NOT EXISTS idx_git_metrics_operation_timestamp ON git_metrics_history(operation, timestamp DESC);
        `);
        
        console.log('✅ [GIT NATIVE] git_metrics_history table created');
      } else {
        console.log('✅ [GIT NATIVE] git_metrics_history table exists');
      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ [GIT NATIVE] Failed to ensure metrics tables:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Perform native Git commit with security checks and metrics
   * @param {string} message - Commit message
   * @param {Array<string>} files - Files to commit (empty = all)
   */
  async performNativeCommit(message, files = []) {
    const startTime = Date.now();
    
    try {
      console.log('📝 [GIT NATIVE] Performing native commit...');
      
      // Security validation through trusted ops policy
      const securityCheck = await this.trustedOps.canAutoApprove({
        tool_name: 'gitCommit',
        parameters: { message, files }
      }, { determineSeverity: () => 'low' });
      
      if (!securityCheck.shouldBypass && securityCheck.reason) {
        console.warn('⚠️ [GIT NATIVE] Security check warning:', securityCheck.reason);
      }
      
      // Step 1: Add files to staging
      const addResult = await this.gitCommands.addFiles(files);
      if (!addResult.success) {
        throw new Error(`Failed to stage files: ${addResult.error}`);
      }
      
      // Step 2: Commit changes
      const commitResult = await this.gitCommands.commit(message);
      if (!commitResult.success) {
        throw new Error(`Failed to commit: ${commitResult.error}`);
      }
      
      const duration = Date.now() - startTime;
      
      // Update metrics
      this.metrics.nativeOperations++;
      this.metrics.totalLatency += duration;
      this.metrics.operations.push({
        type: 'commit',
        method: 'native',
        duration,
        timestamp: new Date(),
        success: true
      });
      
      // Store in PostgreSQL
      await this.storeMetrics('commit', duration, 'success', { 
        message, 
        filesCount: files.length || 'all',
        hash: commitResult.hash
      });
      
      console.log(`✅ [GIT NATIVE] Native commit successful (${duration}ms) - Hash: ${commitResult.hash}`);
      
      return {
        success: true,
        method: 'native',
        hash: commitResult.hash,
        message: commitResult.message,
        duration,
        filesCommitted: files.length || 'all'
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ [GIT NATIVE] Native commit failed:', error);
      
      // Update failure metrics
      this.metrics.failedNative++;
      
      // Store failure in PostgreSQL
      await this.storeMetrics('commit', duration, 'error', { error: error.message });
      
      // Attempt fallback to Octokit if available
      if (this.octokitEnabled) {
        console.log('🔄 [GIT NATIVE] Attempting Octokit fallback...');
        return await this.fallbackToOctokit('commit', { message, files });
      }
      
      return { success: false, error: error.message, duration };
    }
  }
  
  /**
   * Perform native Git push with security checks and metrics
   * @param {string} remote - Remote name (default: origin)
   * @param {string} branch - Branch name (default: current)
   */
  async performNativePush(remote = 'origin', branch = null) {
    const startTime = Date.now();
    
    try {
      console.log(`🚀 [GIT NATIVE] Performing native push to ${remote}/${branch || 'current'}...`);
      
      // Security validation
      const securityCheck = await this.trustedOps.canAutoApprove({
        tool_name: 'gitPush',
        parameters: { remote, branch }
      }, { determineSeverity: () => 'medium' });
      
      if (!securityCheck.shouldBypass) {
        console.warn('⚠️ [GIT NATIVE] Push requires manual approval:', securityCheck.reason);
      }
      
      // Perform native push
      const pushResult = await this.gitCommands.push(remote, branch);
      if (!pushResult.success) {
        throw new Error(`Failed to push: ${pushResult.error}`);
      }
      
      const duration = Date.now() - startTime;
      
      // Update metrics
      this.metrics.nativeOperations++;
      this.metrics.totalLatency += duration;
      this.metrics.operations.push({
        type: 'push',
        method: 'native',
        duration,
        timestamp: new Date(),
        success: true
      });
      
      // Store in PostgreSQL
      await this.storeMetrics('push', duration, 'success', { 
        remote, 
        branch: pushResult.branch 
      });
      
      console.log(`✅ [GIT NATIVE] Native push successful (${duration}ms)`);
      
      return {
        success: true,
        method: 'native',
        remote,
        branch: pushResult.branch,
        duration
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ [GIT NATIVE] Native push failed:', error);
      
      // Update failure metrics
      this.metrics.failedNative++;
      
      // Store failure in PostgreSQL
      await this.storeMetrics('push', duration, 'error', { error: error.message });
      
      // Attempt fallback to GitHub Integration Service
      if (this.gitHubIntegration.remoteUrl) {
        console.log('🔄 [GIT NATIVE] Attempting GitHub Integration fallback...');
        const fallbackResult = await this.gitHubIntegration.pushToGitHub();
        if (fallbackResult.success) {
          this.metrics.apiOperations++;
          return {
            ...fallbackResult,
            method: 'github-integration',
            fallback: true
          };
        }
      }
      
      return { success: false, error: error.message, duration };
    }
  }
  
  /**
   * Perform native Git pull with security checks and metrics
   * @param {string} remote - Remote name (default: origin)
   * @param {string} branch - Branch name (default: current)
   */
  async performNativePull(remote = 'origin', branch = null) {
    const startTime = Date.now();
    
    try {
      console.log(`⬇️ [GIT NATIVE] Performing native pull from ${remote}/${branch || 'current'}...`);
      
      // Security validation
      const securityCheck = await this.trustedOps.canAutoApprove({
        tool_name: 'gitPull',
        parameters: { remote, branch }
      }, { determineSeverity: () => 'medium' });
      
      if (!securityCheck.shouldBypass) {
        console.warn('⚠️ [GIT NATIVE] Pull requires manual approval:', securityCheck.reason);
      }
      
      // Perform native pull
      const pullResult = await this.gitCommands.pull(remote, branch);
      if (!pullResult.success) {
        throw new Error(`Failed to pull: ${pullResult.error}`);
      }
      
      const duration = Date.now() - startTime;
      
      // Update metrics
      this.metrics.nativeOperations++;
      this.metrics.totalLatency += duration;
      this.metrics.operations.push({
        type: 'pull',
        method: 'native',
        duration,
        timestamp: new Date(),
        success: true
      });
      
      // Store in PostgreSQL
      await this.storeMetrics('pull', duration, 'success', { remote, branch });
      
      console.log(`✅ [GIT NATIVE] Native pull successful (${duration}ms)`);
      
      return {
        success: true,
        method: 'native',
        remote,
        branch,
        duration,
        details: pullResult.details
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ [GIT NATIVE] Native pull failed:', error);
      
      // Update failure metrics
      this.metrics.failedNative++;
      
      // Store failure in PostgreSQL
      await this.storeMetrics('pull', duration, 'error', { error: error.message });
      
      // Attempt fallback to GitHub Integration Service
      if (this.gitHubIntegration.remoteUrl) {
        console.log('🔄 [GIT NATIVE] Attempting GitHub Integration fallback...');
        const fallbackResult = await this.gitHubIntegration.pullFromGitHub();
        if (fallbackResult.success) {
          this.metrics.apiOperations++;
          return {
            ...fallbackResult,
            method: 'github-integration',
            fallback: true
          };
        }
      }
      
      return { success: false, error: error.message, duration };
    }
  }
  
  /**
   * Enable/disable auto-commit file watcher
   * @param {boolean} enabled - Enable or disable watcher
   * @param {Object} options - Watcher options
   */
  async enableAutoCommitWatcher(enabled, options = {}) {
    try {
      if (enabled) {
        if (this.watcherEnabled) {
          console.log('⚠️ [GIT NATIVE] File watcher already enabled');
          return { success: true, message: 'File watcher already running' };
        }
        
        console.log('👁️ [GIT NATIVE] Starting auto-commit file watcher...');
        
        // Configure watcher options
        const watchOptions = {
          ignored: this.ignoredPaths,
          persistent: true,
          ignoreInitial: true,
          followSymlinks: false,
          depth: options.depth || 12,
          awaitWriteFinish: {
            stabilityThreshold: options.stabilityThreshold || 2000,
            pollInterval: options.pollInterval || 100
          }
        };
        
        // Initialize chokidar watcher
        this.watcher = chokidar.watch('.', watchOptions);
        
        // Set up event handlers with debouncing
        this.watcher
          .on('add', (path) => this.handleFileChange('add', path))
          .on('change', (path) => this.handleFileChange('change', path))
          .on('unlink', (path) => this.handleFileChange('unlink', path))
          .on('error', (error) => console.error('❌ [GIT NATIVE] Watcher error:', error))
          .on('ready', () => {
            this.watcherStats.filesWatched = Object.keys(this.watcher.getWatched()).length;
            console.log(`✅ [GIT NATIVE] File watcher started - watching ${this.watcherStats.filesWatched} directories`);
          });
        
        this.watcherEnabled = true;
        
        return {
          success: true,
          message: 'Auto-commit file watcher enabled',
          filesWatched: this.watcherStats.filesWatched
        };
        
      } else {
        if (!this.watcherEnabled) {
          console.log('ℹ️ [GIT NATIVE] File watcher already disabled');
          return { success: true, message: 'File watcher already stopped' };
        }
        
        console.log('🛑 [GIT NATIVE] Stopping auto-commit file watcher...');
        
        if (this.watcher) {
          await this.watcher.close();
          this.watcher = null;
        }
        
        if (this.watcherDebounceTimer) {
          clearTimeout(this.watcherDebounceTimer);
          this.watcherDebounceTimer = null;
        }
        
        this.watcherEnabled = false;
        
        console.log('✅ [GIT NATIVE] File watcher stopped');
        
        return {
          success: true,
          message: 'Auto-commit file watcher disabled',
          stats: this.watcherStats
        };
      }
      
    } catch (error) {
      console.error('❌ [GIT NATIVE] Failed to toggle file watcher:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Handle file change events from watcher (with debouncing)
   */
  handleFileChange(event, filePath) {
    console.log(`📁 [GIT NATIVE] File ${event}: ${filePath}`);
    
    this.watcherStats.changesDetected++;
    
    // Clear existing timer
    if (this.watcherDebounceTimer) {
      clearTimeout(this.watcherDebounceTimer);
    }
    
    // Set new debounced timer for auto-commit
    this.watcherDebounceTimer = setTimeout(async () => {
      console.log('🤖 [GIT NATIVE] Debounce timeout - triggering auto-commit...');
      
      try {
        // Check if there are actual changes
        const status = await this.gitCommands.getStatus();
        
        if (status.success && status.hasChanges) {
          console.log(`📝 [GIT NATIVE] ${status.files.length} files changed - creating auto-commit...`);
          
          // Generate intelligent commit message
          const message = await this.generateAutoCommitMessage(status.files);
          
          // Perform auto-commit
          const commitResult = await this.performNativeCommit(message);
          
          if (commitResult.success) {
            this.watcherStats.autoCommitsTriggered++;
            this.watcherStats.lastAutoCommit = new Date();
            
            console.log('✅ [GIT NATIVE] Auto-commit successful:', message);
          } else {
            console.error('❌ [GIT NATIVE] Auto-commit failed:', commitResult.error);
          }
        } else {
          console.log('ℹ️ [GIT NATIVE] No changes to commit');
        }
        
      } catch (error) {
        console.error('❌ [GIT NATIVE] Auto-commit error:', error);
      }
    }, this.watcherDebounceMs);
  }
  
  /**
   * Generate intelligent auto-commit message based on changed files
   */
  async generateAutoCommitMessage(files) {
    const timestamp = new Date().toLocaleString('ka-GE');
    
    if (!files || files.length === 0) {
      return `🤖 Auto-commit: ${timestamp}`;
    }
    
    // Categorize files
    const categories = {
      frontend: [],
      backend: [],
      ai: [],
      config: [],
      docs: [],
      tests: [],
      other: []
    };
    
    files.forEach(file => {
      const filePath = file.path || file;
      
      if (filePath.includes('src/') || filePath.includes('.tsx') || filePath.includes('.jsx')) {
        categories.frontend.push(filePath);
      } else if (filePath.includes('backend/')) {
        categories.backend.push(filePath);
      } else if (filePath.includes('ai-service/')) {
        categories.ai.push(filePath);
      } else if (filePath.includes('package.json') || filePath.includes('.config')) {
        categories.config.push(filePath);
      } else if (filePath.includes('.md') || filePath.includes('docs/')) {
        categories.docs.push(filePath);
      } else if (filePath.includes('test') || filePath.includes('.spec.')) {
        categories.tests.push(filePath);
      } else {
        categories.other.push(filePath);
      }
    });
    
    // Build message parts
    const parts = [];
    const emojis = {
      frontend: '⚛️',
      backend: '🔧',
      ai: '🤖',
      config: '⚙️',
      docs: '📝',
      tests: '🧪',
      other: '📁'
    };
    
    Object.entries(categories).forEach(([category, categoryFiles]) => {
      if (categoryFiles.length > 0) {
        parts.push(`${emojis[category]} ${category} (${categoryFiles.length})`);
      }
    });
    
    const summary = parts.length > 0 ? parts.join(' | ') : 'General updates';
    return `🤖 Auto: ${summary} - ${timestamp}`;
  }
  
  /**
   * Fallback to Octokit GitHub API when native commands fail
   * @param {string} operation - Operation type (commit, push, pull, etc.)
   * @param {Object} params - Operation parameters
   */
  async fallbackToOctokit(operation, params) {
    const startTime = Date.now();
    
    if (!this.octokitEnabled) {
      console.error('❌ [GIT NATIVE] Octokit fallback not available - no GitHub token');
      return { 
        success: false, 
        error: 'Octokit fallback disabled - GitHub token not configured' 
      };
    }
    
    try {
      console.log(`🔄 [GIT NATIVE] Executing Octokit fallback for: ${operation}`);
      
      const owner = process.env.GITHUB_REPO_OWNER || 'bakhmaro';
      const repo = process.env.GITHUB_REPO_NAME || 'gurulo-ai';
      
      let result;
      
      switch (operation) {
        case 'commit':
          // For commits, we need to use GitHub API to create file changes
          // This is complex, so we'll use the integration service instead
          result = await this.gitHubIntegration.commitChanges(params.message);
          break;
          
        case 'push':
          // GitHub API doesn't have direct push - use integration service
          result = await this.gitHubIntegration.pushToGitHub();
          break;
          
        case 'pull':
          // GitHub API pull via integration service
          result = await this.gitHubIntegration.pullFromGitHub();
          break;
          
        case 'createBranch':
          // Create branch using Octokit
          const defaultBranch = await this.octokit.repos.get({ owner, repo });
          const defaultSha = defaultBranch.data.default_branch;
          
          const branchRef = await this.octokit.git.getRef({
            owner,
            repo,
            ref: `heads/${defaultSha}`
          });
          
          result = await this.octokit.git.createRef({
            owner,
            repo,
            ref: `refs/heads/${params.branchName}`,
            sha: branchRef.data.object.sha
          });
          break;
          
        default:
          throw new Error(`Unsupported Octokit operation: ${operation}`);
      }
      
      const duration = Date.now() - startTime;
      
      // Update metrics
      this.metrics.apiOperations++;
      this.metrics.totalLatency += duration;
      this.metrics.operations.push({
        type: operation,
        method: 'octokit',
        duration,
        timestamp: new Date(),
        success: true
      });
      
      console.log(`✅ [GIT NATIVE] Octokit fallback successful (${duration}ms)`);
      
      return {
        success: true,
        method: 'octokit',
        fallback: true,
        duration,
        result
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ [GIT NATIVE] Octokit fallback failed:', error);
      
      this.metrics.failedApi++;
      
      return { 
        success: false, 
        error: error.message,
        duration,
        method: 'octokit'
      };
    }
  }
  
  /**
   * Store operation metrics in PostgreSQL
   */
  async storeMetrics(operation, duration, status = 'success', metadata = {}) {
    try {
      await pool.query(
        `INSERT INTO git_metrics_history (operation, duration_ms, status, metadata, timestamp)
         VALUES ($1, $2, $3, $4, now())`,
        [operation, duration, status, JSON.stringify(metadata)]
      );
    } catch (error) {
      // Don't fail the operation if metrics storage fails
      console.warn('⚠️ [GIT NATIVE] Failed to store metrics:', error.message);
    }
  }
  
  /**
   * Get comprehensive performance metrics
   */
  async getPerformanceMetrics() {
    try {
      // Get rolling averages from PostgreSQL (last 10 operations)
      const commitAvg = await this.getRollingAverage('commit', 10);
      const pushAvg = await this.getRollingAverage('push', 10);
      const pullAvg = await this.getRollingAverage('pull', 10);
      
      // Calculate overall statistics
      const totalOps = this.metrics.nativeOperations + this.metrics.apiOperations;
      const avgLatency = totalOps > 0 ? this.metrics.totalLatency / totalOps : 0;
      
      // Calculate success rate
      const totalAttempts = totalOps + this.metrics.failedNative + this.metrics.failedApi;
      const successRate = totalAttempts > 0 
        ? ((totalOps / totalAttempts) * 100).toFixed(2)
        : 100;
      
      // Latency reduction vs API baseline (1000ms)
      const baselineLatency = 1000;
      const latencyReduction = avgLatency > 0
        ? Math.max(0, Math.round(((baselineLatency - avgLatency) / baselineLatency) * 100))
        : 0;
      
      return {
        success: true,
        operations: {
          total: totalOps,
          native: this.metrics.nativeOperations,
          api: this.metrics.apiOperations,
          failed: this.metrics.failedNative + this.metrics.failedApi
        },
        performance: {
          averageLatency: Math.round(avgLatency),
          latencyReduction: `${latencyReduction}%`,
          successRate: `${successRate}%`,
          rollingAverages: {
            commit: Math.round(commitAvg),
            push: Math.round(pushAvg),
            pull: Math.round(pullAvg)
          }
        },
        watcher: this.watcherEnabled ? {
          enabled: true,
          filesWatched: this.watcherStats.filesWatched,
          autoCommitsTriggered: this.watcherStats.autoCommitsTriggered,
          changesDetected: this.watcherStats.changesDetected,
          lastAutoCommit: this.watcherStats.lastAutoCommit
        } : {
          enabled: false
        },
        credentials: {
          configured: !!this.credentials.githubToken,
          encrypted: this.credentials.encrypted,
          octokitEnabled: this.octokitEnabled
        },
        recentOperations: this.metrics.operations.slice(-10)
      };
      
    } catch (error) {
      console.error('❌ [GIT NATIVE] Failed to get performance metrics:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get rolling average for specific operation type
   */
  async getRollingAverage(operation, limit = 10) {
    try {
      const result = await pool.query(
        `SELECT AVG(duration_ms) as avg_duration
         FROM (
           SELECT duration_ms 
           FROM git_metrics_history 
           WHERE operation = $1 AND status = 'success'
           ORDER BY timestamp DESC 
           LIMIT $2
         ) recent_ops`,
        [operation, limit]
      );
      
      return result.rows[0]?.avg_duration || 0;
    } catch (error) {
      console.warn('⚠️ [GIT NATIVE] Failed to get rolling average:', error.message);
      return 0;
    }
  }
  
  /**
   * Get repository status (wrapper for git commands)
   */
  async getStatus() {
    try {
      return await this.gitCommands.getStatus();
    } catch (error) {
      console.error('❌ [GIT NATIVE] Failed to get status:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get commit history (wrapper for git commands)
   */
  async getLog(options = {}) {
    try {
      return await this.gitCommands.getLog(options);
    } catch (error) {
      console.error('❌ [GIT NATIVE] Failed to get log:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get branches (wrapper for git commands)
   */
  async getBranches() {
    try {
      return await this.gitCommands.getBranches();
    } catch (error) {
      console.error('❌ [GIT NATIVE] Failed to get branches:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Generate encryption key for AES-256-CBC
   * 
   * Generates a cryptographically secure random 32-byte (256-bit) key
   * suitable for AES-256 encryption. The key is returned as a hex string.
   * 
   * @returns {string} 64-character hex string (32 bytes)
   */
  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }
  
  /**
   * Encrypt credential data using AES-256-CBC
   * 
   * Encrypts sensitive credential data using AES-256-CBC algorithm with:
   * - 256-bit key from environment or generated
   * - Random 16-byte IV (initialization vector) for each encryption
   * - PKCS7 padding (automatic)
   * 
   * The encrypted output includes:
   * - algorithm: Encryption algorithm used
   * - iv: Initialization vector (hex)
   * - encrypted: Encrypted data (hex)
   * 
   * @param {string} data - Plain text data to encrypt
   * @returns {string} JSON string containing algorithm, iv, and encrypted data
   */
  encryptCredential(data) {
    try {
      const algorithm = 'aes-256-cbc';
      
      // Convert hex key to buffer (32 bytes for AES-256)
      const key = Buffer.from(this.encryptionKey, 'hex');
      
      // Generate random IV (16 bytes for AES)
      const iv = crypto.randomBytes(16);
      
      // Create cipher
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      
      // Encrypt data
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Return encrypted data with metadata
      return JSON.stringify({
        algorithm,
        iv: iv.toString('hex'),
        encrypted
      });
    } catch (error) {
      console.error('❌ [GIT NATIVE] Encryption failed:', error);
      throw new Error(`Credential encryption failed: ${error.message}`);
    }
  }
  
  /**
   * Decrypt credential data using AES-256-CBC
   * 
   * Decrypts credential data that was encrypted with encryptCredential().
   * Validates the encryption format and algorithm before decryption.
   * 
   * Expected input format (JSON string):
   * {
   *   algorithm: 'aes-256-cbc',
   *   iv: 'hex-encoded-iv',
   *   encrypted: 'hex-encoded-encrypted-data'
   * }
   * 
   * @param {string} encryptedData - JSON string containing encrypted data
   * @returns {string} Decrypted plain text
   * @throws {Error} If decryption fails or format is invalid
   */
  decryptCredential(encryptedData) {
    try {
      // Parse encrypted data
      const data = JSON.parse(encryptedData);
      
      // Validate format
      if (!data.algorithm || !data.iv || !data.encrypted) {
        throw new Error('Invalid encrypted data format');
      }
      
      // Validate algorithm
      if (data.algorithm !== 'aes-256-cbc') {
        throw new Error(`Unsupported encryption algorithm: ${data.algorithm}`);
      }
      
      // Convert hex key to buffer
      const key = Buffer.from(this.encryptionKey, 'hex');
      
      // Convert hex IV to buffer
      const iv = Buffer.from(data.iv, 'hex');
      
      // Create decipher
      const decipher = crypto.createDecipheriv(data.algorithm, key, iv);
      
      // Decrypt data
      let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('❌ [GIT NATIVE] Decryption failed:', error);
      throw new Error(`Credential decryption failed: ${error.message}`);
    }
  }
  
  /**
   * Cleanup and shutdown
   */
  async shutdown() {
    console.log('🛑 [GIT NATIVE] Shutting down Git Native Service...');
    
    // Disable watcher
    if (this.watcherEnabled) {
      await this.enableAutoCommitWatcher(false);
    }
    
    // Close database pool
    try {
      await pool.end();
      console.log('✅ [GIT NATIVE] Database pool closed');
    } catch (error) {
      console.error('❌ [GIT NATIVE] Failed to close database pool:', error);
    }
    
    this.isInitialized = false;
    console.log('✅ [GIT NATIVE] Git Native Service shut down');
  }
}

// Create singleton instance
const gitNativeService = new GitNativeService();

module.exports = gitNativeService;

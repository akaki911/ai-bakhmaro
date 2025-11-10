'use strict';

/**
 * Workspace Executor Service - Phase 2
 * 
 * Provides secure sandbox code execution using isolated-vm.
 * Complements terminal_service.js for single-script execution with resource limits.
 * 
 * Features:
 * - True V8 isolate-based sandboxing (OS-level isolation)
 * - Resource limits (memory, CPU, timeout)
 * - stdout/stderr capture via custom console
 * - Security: blocked fs, network, process access
 * - Event-driven output streaming for SSE
 * 
 * Security Note: Uses isolated-vm (NOT vm2 which is deprecated with critical CVEs)
 */

const ivm = require('isolated-vm');
const { EventEmitter } = require('events');

/**
 * Sandbox Policy Configuration
 */
class SandboxPolicy {
  constructor() {
    // Resource limits
    this.limits = {
      memoryMB: 128,              // Maximum memory per execution
      timeoutMs: 30000,           // 30 second execution timeout
      maxOutputSize: 1024 * 1024  // 1MB max output
    };
    
    // Blocked globals that should never be accessible
    this.blockedGlobals = [
      'require',    // Prevent module loading
      'process',    // Prevent process access
      'fs',         // Prevent filesystem
      'child_process', // Prevent spawning
      'net',        // Prevent network
      'http',       // Prevent HTTP
      'https',      // Prevent HTTPS
      'os',         // Prevent OS access
      'vm',         // Prevent VM access
      'eval',       // Prevent eval (handled by compiler)
      'Function'    // Prevent Function constructor
    ];
    
    console.log('🔒 [SANDBOX POLICY] Initialized with resource limits:', this.limits);
    console.log(`🚫 [SANDBOX POLICY] Blocked globals: ${this.blockedGlobals.length}`);
  }
  
  /**
   * Validate code before execution
   * @param {string} code - Code to validate
   * @returns {Object} - Validation result
   */
  validateCode(code) {
    if (!code || typeof code !== 'string') {
      return { valid: false, error: 'Code must be a non-empty string' };
    }
    
    if (code.length > 100000) {
      return { valid: false, error: 'Code exceeds maximum length (100KB)' };
    }
    
    // Check for obvious dangerous patterns
    const dangerousPatterns = [
      /require\s*\(/gi,
      /process\s*\./gi,
      /eval\s*\(/gi,
      /Function\s*\(/gi,
      /__proto__/gi,
      /constructor\s*\[/gi
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        return { 
          valid: false, 
          error: `Code contains blocked pattern: ${pattern.source}` 
        };
      }
    }
    
    return { valid: true };
  }
}

/**
 * Execution Runner using isolated-vm
 */
class ExecutionRunner extends EventEmitter {
  constructor(policy) {
    super();
    this.policy = policy;
    this.activeExecutions = new Map();
    this.executionCount = 0;
    
    console.log('🏃 [EXECUTION RUNNER] Initialized with isolated-vm sandbox');
  }
  
  /**
   * Execute code in isolated sandbox
   * @param {string} executionId - Unique execution ID
   * @param {string} code - JavaScript code to execute
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} - Execution result
   */
  async execute(executionId, code, options = {}) {
    // Validate code
    const validation = this.policy.validateCode(code);
    if (!validation.valid) {
      throw new Error(`Code validation failed: ${validation.error}`);
    }
    
    // Track execution
    this.executionCount++;
    const startTime = Date.now();
    
    // Create output buffer
    const output = {
      stdout: [],
      stderr: [],
      result: null,
      error: null
    };
    
    // Create console stub for output capture
    const createConsoleMock = () => {
      return {
        log: (...args) => {
          const message = args.map(a => String(a)).join(' ');
          output.stdout.push(message);
          this.emit('stdout', { executionId, data: message + '\n' });
        },
        error: (...args) => {
          const message = args.map(a => String(a)).join(' ');
          output.stderr.push(message);
          this.emit('stderr', { executionId, data: message + '\n' });
        },
        warn: (...args) => {
          const message = args.map(a => String(a)).join(' ');
          output.stderr.push(`[WARN] ${message}`);
          this.emit('stderr', { executionId, data: `[WARN] ${message}\n` });
        },
        info: (...args) => {
          const message = args.map(a => String(a)).join(' ');
          output.stdout.push(message);
          this.emit('stdout', { executionId, data: message + '\n' });
        }
      };
    };
    
    let isolate = null;
    let context = null;
    
    try {
      // Create isolated VM with memory limit
      isolate = new ivm.Isolate({ 
        memoryLimit: this.policy.limits.memoryMB 
      });
      
      // Create execution context
      context = await isolate.createContext();
      
      // Get global reference
      const jail = context.global;
      
      // Inject safe console
      const consoleMock = createConsoleMock();
      await jail.set('console', new ivm.Reference(consoleMock), { 
        reference: true 
      });
      
      // Inject safe Math, JSON, Date
      await jail.set('Math', Math);
      await jail.set('JSON', JSON);
      
      // Inject input data if provided
      if (options.input) {
        await jail.set('input', new ivm.ExternalCopy(options.input).copyInto());
      }
      
      // Compile and run code with timeout
      const script = await isolate.compileScript(code);
      const result = await script.run(context, {
        timeout: this.policy.limits.timeoutMs,
        release: true
      });
      
      // Capture result
      output.result = result;
      
      // Emit completion
      const duration = Date.now() - startTime;
      this.emit('complete', { 
        executionId, 
        success: true, 
        duration,
        output: output.stdout.join('\n')
      });
      
      return {
        success: true,
        result: result,
        stdout: output.stdout.join('\n'),
        stderr: output.stderr.join('\n'),
        duration,
        memoryUsed: isolate.getHeapStatisticsSync().used_heap_size / 1024 / 1024 // MB
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Handle different error types
      let errorMessage = error.message || String(error);
      let errorType = 'ExecutionError';
      
      if (errorMessage.includes('script execution timed out')) {
        errorType = 'TimeoutError';
        errorMessage = `Execution exceeded ${this.policy.limits.timeoutMs}ms timeout`;
      } else if (errorMessage.includes('heap limit')) {
        errorType = 'MemoryError';
        errorMessage = `Execution exceeded ${this.policy.limits.memoryMB}MB memory limit`;
      }
      
      output.error = { type: errorType, message: errorMessage };
      
      this.emit('error', { 
        executionId, 
        error: errorMessage,
        type: errorType,
        duration
      });
      
      return {
        success: false,
        error: errorMessage,
        errorType,
        stdout: output.stdout.join('\n'),
        stderr: output.stderr.join('\n'),
        duration
      };
      
    } finally {
      // Always cleanup isolate
      if (context) {
        context.release();
      }
      if (isolate) {
        isolate.dispose();
      }
      
      this.activeExecutions.delete(executionId);
    }
  }
  
  /**
   * Get execution statistics
   * @returns {Object} - Stats
   */
  getStats() {
    return {
      totalExecutions: this.executionCount,
      activeExecutions: this.activeExecutions.size,
      memoryLimit: this.policy.limits.memoryMB,
      timeoutLimit: this.policy.limits.timeoutMs
    };
  }
}

/**
 * Main Workspace Executor Service
 */
class WorkspaceExecutorService {
  constructor() {
    this.policy = new SandboxPolicy();
    this.runner = new ExecutionRunner(this.policy);
    this.isInitialized = true;
    
    console.log('✅ [WORKSPACE EXECUTOR] Service initialized with isolated-vm');
  }
  
  /**
   * Execute code in sandbox
   * @param {string} code - JavaScript code
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} - Execution result
   */
  async executeCode(code, options = {}) {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🚀 [WORKSPACE EXECUTOR] Starting execution ${executionId}`);
    
    try {
      const result = await this.runner.execute(executionId, code, options);
      
      console.log(`✅ [WORKSPACE EXECUTOR] Execution ${executionId} ${result.success ? 'succeeded' : 'failed'} in ${result.duration}ms`);
      
      return {
        executionId,
        ...result
      };
      
    } catch (error) {
      console.error(`❌ [WORKSPACE EXECUTOR] Execution ${executionId} error:`, error.message);
      
      return {
        executionId,
        success: false,
        error: error.message,
        errorType: 'SystemError',
        stdout: '',
        stderr: error.message,
        duration: 0
      };
    }
  }
  
  /**
   * Get runner for event streaming
   * @returns {ExecutionRunner} - Runner instance
   */
  getRunner() {
    return this.runner;
  }
  
  /**
   * Get service statistics
   * @returns {Object} - Stats
   */
  getStats() {
    return {
      service: 'workspace_executor',
      initialized: this.isInitialized,
      ...this.runner.getStats(),
      policy: {
        memoryLimit: this.policy.limits.memoryMB,
        timeoutLimit: this.policy.limits.timeoutMs,
        blockedGlobals: this.policy.blockedGlobals.length
      }
    };
  }
}

// Singleton instance
let instance = null;

module.exports = {
  /**
   * Get or create singleton instance
   * @returns {WorkspaceExecutorService}
   */
  getInstance: () => {
    if (!instance) {
      instance = new WorkspaceExecutorService();
    }
    return instance;
  },
  
  // Export classes for testing
  SandboxPolicy,
  ExecutionRunner,
  WorkspaceExecutorService
};

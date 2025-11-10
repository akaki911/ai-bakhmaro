'use strict';

/**
 * Code Execution API - Phase 2
 * 
 * Provides secure code execution endpoint with SSE streaming.
 * Integrates workspace_executor.js for sandboxed execution.
 * 
 * Endpoints:
 * - POST /api/ai/execute - Execute code with SSE stream
 * - GET /api/ai/execute/stats - Get execution statistics
 */

const express = require('express');
const router = express.Router();
const { requireAssistantAuth } = require('../middleware/authz');
const { getInstance: getExecutor } = require('../services/workspace_executor');

// Service authentication middleware
const authenticateService = requireAssistantAuth;

/**
 * POST /api/ai/execute
 * Execute JavaScript code in secure sandbox
 * 
 * Request body:
 * {
 *   code: string,           // JavaScript code to execute
 *   input?: any,            // Optional input data
 *   stream?: boolean        // Enable SSE streaming (default: true)
 * }
 * 
 * Response (SSE stream):
 * event: stdout - Standard output
 * event: stderr - Standard error
 * event: complete - Execution complete
 * event: error - Execution error
 */
router.post('/execute', authenticateService, async (req, res) => {
  try {
    const { code, input, stream = true } = req.body;
    
    // Validate request
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Code is required'
      });
    }
    
    // Get executor instance
    const executor = getExecutor();
    
    // If streaming requested, setup SSE
    if (stream) {
      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // Disable buffering in Nginx
      });
      
      // Get runner for event streaming
      const runner = executor.getRunner();
      
      // Generate execution ID for this request
      let currentExecutionId = null;
      
      // Setup event listeners with executionId filtering
      const stdoutHandler = ({ executionId, data }) => {
        // Only forward events for THIS execution
        if (executionId === currentExecutionId) {
          res.write(`event: stdout\n`);
          res.write(`data: ${JSON.stringify({ executionId, output: data })}\n\n`);
        }
      };
      
      const stderrHandler = ({ executionId, data }) => {
        // Only forward events for THIS execution
        if (executionId === currentExecutionId) {
          res.write(`event: stderr\n`);
          res.write(`data: ${JSON.stringify({ executionId, output: data })}\n\n`);
        }
      };
      
      const completeHandler = ({ executionId, success, duration, output }) => {
        // Only forward events for THIS execution
        if (executionId === currentExecutionId) {
          res.write(`event: complete\n`);
          res.write(`data: ${JSON.stringify({ executionId, success, duration, output })}\n\n`);
          res.end();
          
          // Cleanup listeners
          runner.removeListener('stdout', stdoutHandler);
          runner.removeListener('stderr', stderrHandler);
          runner.removeListener('complete', completeHandler);
          runner.removeListener('error', errorHandler);
        }
      };
      
      const errorHandler = ({ executionId, error, type, duration }) => {
        // Only forward events for THIS execution
        if (executionId === currentExecutionId) {
          res.write(`event: error\n`);
          res.write(`data: ${JSON.stringify({ executionId, error, type, duration })}\n\n`);
          res.end();
          
          // Cleanup listeners
          runner.removeListener('stdout', stdoutHandler);
          runner.removeListener('stderr', stderrHandler);
          runner.removeListener('complete', completeHandler);
          runner.removeListener('error', errorHandler);
        }
      };
      
      // Attach listeners
      runner.on('stdout', stdoutHandler);
      runner.on('stderr', stderrHandler);
      runner.on('complete', completeHandler);
      runner.on('error', errorHandler);
      
      // Handle client disconnect
      req.on('close', () => {
        runner.removeListener('stdout', stdoutHandler);
        runner.removeListener('stderr', stderrHandler);
        runner.removeListener('complete', completeHandler);
        runner.removeListener('error', errorHandler);
      });
      
      // Execute code and capture execution ID
      try {
        const result = await executor.executeCode(code, { input });
        currentExecutionId = result.executionId;
        
        // If execution failed before events were emitted (e.g., validation error)
        if (!result.success && result.errorType === 'SystemError') {
          res.write(`event: error\n`);
          res.write(`data: ${JSON.stringify({ 
            executionId: result.executionId, 
            error: result.error, 
            type: result.errorType 
          })}\n\n`);
          res.end();
          
          // Cleanup listeners
          runner.removeListener('stdout', stdoutHandler);
          runner.removeListener('stderr', stderrHandler);
          runner.removeListener('complete', completeHandler);
          runner.removeListener('error', errorHandler);
        }
      } catch (err) {
        // Handle execution errors
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
        
        // Cleanup listeners
        runner.removeListener('stdout', stdoutHandler);
        runner.removeListener('stderr', stderrHandler);
        runner.removeListener('complete', completeHandler);
        runner.removeListener('error', errorHandler);
      }
      
    } else {
      // Non-streaming execution
      const result = await executor.executeCode(code, { input });
      
      // Mirror the runner's success flag
      res.json({
        success: result.success,
        result: result.success ? result : undefined,
        error: result.success ? undefined : result.error,
        errorType: result.success ? undefined : result.errorType,
        executionId: result.executionId,
        duration: result.duration,
        stdout: result.stdout,
        stderr: result.stderr
      });
    }
    
  } catch (error) {
    console.error('❌ [EXECUTE API] Error:', error);
    
    // If headers not sent yet, send JSON error
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    } else {
      // If SSE already started, send error event
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

/**
 * GET /api/ai/execute/stats
 * Get execution service statistics
 */
router.get('/execute/stats', authenticateService, (req, res) => {
  try {
    const executor = getExecutor();
    const stats = executor.getStats();
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('❌ [EXECUTE API] Stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ai/execute/health
 * Health check endpoint
 */
router.get('/execute/health', (req, res) => {
  try {
    const executor = getExecutor();
    const stats = executor.getStats();
    
    res.json({
      success: true,
      healthy: stats.initialized,
      service: 'workspace_executor',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      healthy: false,
      error: error.message
    });
  }
});

console.log('✅ [EXECUTE API] Workspace execution routes loaded');

module.exports = router;

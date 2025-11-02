
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { parsePatch, applyPatch } = require('diff');
const router = express.Router();

// Import RBAC middleware
const { protectAutoImprove, requireSuperAdmin } = require('../middleware/rbac_middleware');
const { loadSimilarOutcomes } = require('../services/proposal_memory_store');
const codexAgent = require('../agents/codex_agent');
const { ToolRegistry } = require('../core/tool_registry');

const MEMORY_ENABLED = process.env.AI_MEMORY_ENABLED !== 'false';

const ensureProposalStore = () => {
  if (!global.autoImproveProposalStore) {
    global.autoImproveProposalStore = new Map();
  }
  return global.autoImproveProposalStore;
};

const rememberProposal = (proposal) => {
  if (!proposal || typeof proposal !== 'object' || !proposal.id) {
    return;
  }

  const store = ensureProposalStore();
  const storedEntry = {
    ...proposal,
    storedAt: new Date().toISOString(),
  };

  store.set(proposal.id, storedEntry);

  if (store.size > 50) {
    const oldestKey = store.keys().next().value;
    if (oldestKey) {
      store.delete(oldestKey);
    }
  }
};

const getStoredProposal = (proposalId) => {
  const store = ensureProposalStore();
  return store.get(proposalId);
};

const updateStoredProposal = (proposalId, updates) => {
  const store = ensureProposalStore();
  if (!store.has(proposalId)) {
    return;
  }

  const existing = store.get(proposalId);
  store.set(proposalId, {
    ...existing,
    ...updates,
    storedAt: existing?.storedAt || new Date().toISOString(),
  });
};

const strictPatchProvider = (() => {
  if (!global.autoImproveStrictPatchProvider) {
    const registry = new ToolRegistry();
    global.autoImproveStrictPatchProvider = {
      registry,
      strictPatch: registry.strictPatch,
    };
  }
  return global.autoImproveStrictPatchProvider;
})();

const getNormalizedPatchPath = (patchEntry) => {
  if (!patchEntry) {
    return null;
  }

  const { newFileName, oldFileName } = patchEntry;
  const candidate =
    (newFileName && newFileName !== '/dev/null' && newFileName !== 'undefined')
      ? newFileName
      : oldFileName;

  if (!candidate || candidate === '/dev/null') {
    return null;
  }

  return candidate.replace(/^a\//, '').replace(/^b\//, '');
};

/**
 * AI Service Auto-Improve Routes
 * Protected with RBAC - SUPER_ADMIN only
 */

// KPIs endpoint for AI service monitoring
router.get('/kpis', protectAutoImprove, (req, res) => {
  console.log('🔍 [AI AUTO-IMPROVE] KPIs requested');
  
  const kpis = {
    aiHealth: 'OK',
    modelStatus: 'ACTIVE',
    responseTime: Math.floor(Math.random() * 200) + 50,
    queueLength: Math.floor(Math.random() * 5),
    processingRate: Math.random() * 10 + 5,
    lastModelUpdate: new Date().toISOString()
  };

  res.json({
    success: true,
    kpis,
    service: 'AI Auto-Improve',
    timestamp: new Date().toISOString()
  });
});

// Health check for Auto-Improve system
router.get('/health', protectAutoImprove, (req, res) => {
  console.log('🔍 [AI AUTO-IMPROVE] Health check requested');
  res.json({
    ok: true,
    status: 'HEALTHY',
    service: 'AI Auto-Improve Service',
    rbac: 'SUPER_ADMIN_PROTECTED',
    timestamp: new Date().toISOString()
  });
});

router.post('/codex/auto-improve', protectAutoImprove, requireSuperAdmin, async (req, res) => {
  try {
    if (!codexAgent?.isEnabled?.()) {
      return res.status(503).json({
        success: false,
        error: 'CODEX_DISABLED',
        message: 'Codex integration is disabled. Provide OPENAI_API_KEY to enable auto-improve.',
        timestamp: new Date().toISOString(),
      });
    }

    const {
      filePath,
      content,
      instructions,
      issueSummary,
      metadata = {},
      userId,
    } = req.body || {};

    if (!filePath || !content) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'filePath and content are required.',
        timestamp: new Date().toISOString(),
      });
    }

    const codexResult = await codexAgent.autoImproveFile({
      filePath,
      originalContent: content,
      instructions,
      issueSummary,
      language: metadata.language,
      metadata: {
        ...metadata,
        origin: metadata.origin || 'auto-improve-endpoint',
      },
      userId,
    });

    return res.json({
      success: true,
      improvedContent: codexResult.improvedContent,
      reasoning: codexResult.reasoning,
      patch: codexResult.patchPreview,
      usage: codexResult.usage || null,
      prompt: codexResult.prompt,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ [AI AUTO-IMPROVE] Codex error:', error);
    return res.status(500).json({
      success: false,
      error: 'CODEX_AUTO_IMPROVE_FAILED',
      message: error?.message || 'Failed to auto-improve file with Codex.',
      timestamp: new Date().toISOString(),
    });
  }
});

// Generate improvement proposals - SUPER_ADMIN only
router.post('/generate-proposals', protectAutoImprove, async (req, res) => {
  try {
    console.log('🤖 [AI AUTO-IMPROVE] Generating real proposals for SUPER_ADMIN');
    
    // Import required services
    const { discoveryRunner } = require('../self-improvement/discoveryRunner');
    const { proposalBuilder } = require('../self-improvement/proposalBuilder');
    const { enhancedFileMonitorService } = require('../services/enhanced_file_monitor_service');
    
    // Run real discovery to find issues
    console.log('🔍 [AI AUTO-IMPROVE] Running code discovery...');
    const discoveryResult = await discoveryRunner.runDiscovery();
    
    // Get file analysis results from enhanced monitor
    const analysisResults = enhancedFileMonitorService.getAnalysisResults();
    
    // Combine evidence from both sources
    const combinedEvidence = [
      ...discoveryResult.evidence,
      ...analysisResults.map(result => ({
        file: result.file,
        line: 1,
        rule: result.improvementType.toLowerCase().replace(/\s+/g, '-'),
        note: result.suggestion
      }))
    ];
    
    // Generate proposals from evidence
    const proposals = await proposalBuilder.buildProposals(combinedEvidence);
    
    // Convert to proper format with IDs and timestamps
    const formattedProposals = proposals.map((proposal, index) => {
      const kpiKey = proposal.kpiKey || `autoimprove:proposal:${index}`;
      const memoryContext = MEMORY_ENABLED
        ? loadSimilarOutcomes({ kpiKey, limit: 5 })
        : [];

      return {
        id: `prop_${Date.now()}_${index}`,
        title: proposal.title,
        summary: proposal.summary,
        description: proposal.summary,
        severity: proposal.severity,
        risk: proposal.risk || 'medium',
        evidence: proposal.evidence,
        files: proposal.evidence.map(e => ({
          path: e.file,
          lines: e.line,
          rule: e.rule,
          note: e.note,
          action: 'modify'
        })),
        patch: proposal.patch,
        rollbackPlan: proposal.rollbackPlan,
        aiGenerated: true,
        guardValidated: false,
        status: 'pending',
        createdAt: {
          seconds: Math.floor(Date.now() / 1000),
          nanoseconds: 0
        },
        scope: ['auto-improve'],
        kpiKey,
        memoryContext
      };
    });

    formattedProposals.forEach(rememberProposal);

    console.log(`✅ [AI AUTO-IMPROVE] Generated ${formattedProposals.length} real proposals`);

    res.json({
      success: true,
      proposals: formattedProposals,
      generated: formattedProposals.length,
      evidence: discoveryResult.evidence.length,
      analysisResults: analysisResults.length,
      skippedTools: discoveryResult.skippedTools,
      message: 'Real AI proposals generated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [AI AUTO-IMPROVE] Proposal generation error:', error);
    res.status(500).json({
      success: false,
      error: 'PROPOSAL_GENERATION_ERROR',
      message: `Failed to generate AI proposals: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Validate proposals against Guard rules
router.post('/validate-proposals', protectAutoImprove, async (req, res) => {
  try {
    const { proposals } = req.body;
    console.log('🛡️ [AI AUTO-IMPROVE] Validating proposals against Guard rules');

    // Import AI Guard service
    const AIGuardService = require('../../functions/src/services/aiGuardService');
    const guardService = new AIGuardService();
    await guardService.initialize();

    const validationResults = [];

    for (const proposal of proposals) {
      const fileOperations = proposal.files?.map(file => ({
        filePath: file.path,
        operation: file.action || 'modify'
      })) || [];

      const guardResult = await guardService.validateBatch(fileOperations);
      
      validationResults.push({
        proposalId: proposal.id,
        guardResult,
        allowed: !guardResult.hasViolations
      });
    }

    res.json({
      success: true,
      validationResults,
      summary: {
        total: proposals.length,
        allowed: validationResults.filter(r => r.allowed).length,
        blocked: validationResults.filter(r => !r.allowed).length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [AI AUTO-IMPROVE] Validation error:', error);
    res.status(500).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Failed to validate proposals',
      timestamp: new Date().toISOString()
    });
  }
});

// List existing proposals - SUPER_ADMIN only
router.get('/proposals', protectAutoImprove, async (req, res) => {
  try {
    console.log('📋 [AI AUTO-IMPROVE] Fetching proposals for SUPER_ADMIN');
    
    // Get analysis results from enhanced monitor
    const enhancedFileMonitorService = require('../services/enhanced_file_monitor_service');
    const analysisResults = enhancedFileMonitorService.getAnalysisResults ? 
                          enhancedFileMonitorService.getAnalysisResults() : [];
    
    // Convert analysis results to proposals format
    const proposals = analysisResults.map((result, index) => ({
      id: `analysis_${Date.now()}_${index}`,
      title: `${result.improvementType}: ${result.file}`,
      summary: result.suggestion,
      severity: result.priority === 'high' ? 'P1' : result.priority === 'medium' ? 'P2' : 'P3',
      risk: result.priority === 'high' ? 'high' : result.priority === 'medium' ? 'medium' : 'low',
      status: 'pending',
      files: [{
        path: result.file,
        lines: 1,
        rule: result.improvementType.toLowerCase().replace(/\s+/g, '-'),
        note: result.suggestion,
        action: 'modify'
      }],
      evidence: [{
        file: result.file,
        line: 1,
        rule: result.improvementType.toLowerCase().replace(/\s+/g, '-'),
        note: result.suggestion
      }],
      aiGenerated: true,
      guardValidated: false,
      createdAt: {
        seconds: Math.floor(Date.now() / 1000),
        nanoseconds: 0
      },
      scope: ['auto-improve', 'file-analysis']
    }));

    console.log(`📊 [AI AUTO-IMPROVE] Returning ${proposals.length} proposals from analysis`);

    res.json({
      success: true,
      data: proposals,
      count: proposals.length,
      message: 'Proposals fetched successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [AI AUTO-IMPROVE] Failed to fetch proposals:', error);
    res.status(500).json({
      success: false,
      error: 'PROPOSALS_FETCH_ERROR',
      message: `Failed to fetch proposals: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Apply proposal - SUPER_ADMIN only  
router.post('/proposals/:id/apply', protectAutoImprove, async (req, res) => {
  const startedAt = Date.now();
  const requestId = req.body?.requestId || `auto_apply_${Date.now()}`;

  let actionExecutorService;

  try {
    const { id } = req.params;
    console.log(`⚡ [AI AUTO-IMPROVE] Applying proposal ${id} (request: ${requestId})`);

    if (req.body?.proposal) {
      rememberProposal(req.body.proposal);
    }

    const storedProposal = getStoredProposal(id);
    const patchCandidates = [];
    const registerPatchCandidate = (value, source) => {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          patchCandidates.push({ value, source });
        }
      }
    };

    registerPatchCandidate(req.body?.patch, 'request.patch');
    registerPatchCandidate(req.body?.diff, 'request.diff');
    registerPatchCandidate(req.body?.proposal?.patch, 'request.proposal.patch');
    registerPatchCandidate(req.body?.proposal?.diff, 'request.proposal.diff');

    if (Array.isArray(req.body?.files)) {
      req.body.files.forEach((file, index) => {
        registerPatchCandidate(file?.patch, `request.files[${index}].patch`);
        registerPatchCandidate(file?.diff, `request.files[${index}].diff`);
      });
    }

    if (storedProposal) {
      registerPatchCandidate(storedProposal.patch, 'store.patch');
      registerPatchCandidate(storedProposal.diff, 'store.diff');

      if (Array.isArray(storedProposal.files)) {
        storedProposal.files.forEach((file, index) => {
          registerPatchCandidate(file?.patch, `store.files[${index}].patch`);
          registerPatchCandidate(file?.diff, `store.files[${index}].diff`);
        });
      }
    }

    if (patchCandidates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'PATCH_NOT_FOUND',
        message: 'No patch or diff data was provided for the proposal.',
        proposalId: id,
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    const patchInfo = patchCandidates[0];
    const normalizedPatch = patchInfo.value.replace(/\r\n/g, '\n');

    let parsedPatches;
    try {
      parsedPatches = parsePatch(normalizedPatch);
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        error: 'PATCH_PARSE_ERROR',
        message: `Failed to parse patch data: ${parseError.message}`,
        proposalId: id,
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    if (!Array.isArray(parsedPatches) || parsedPatches.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'PATCH_EMPTY',
        message: 'Patch data did not contain any file changes.',
        proposalId: id,
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    const { actionExecutorService: executor } = require('../services/action_executor_service');
    actionExecutorService = executor;

    if (!actionExecutorService.isInitialized) {
      await actionExecutorService.initialize();
    }

    const strictPatch = strictPatchProvider?.strictPatch;
    if (!strictPatch || typeof strictPatch.applyStrictPatch !== 'function') {
      throw new Error('StrictPatchMode is not available');
    }

    console.log(`🧩 [AI AUTO-IMPROVE] Patch source: ${patchInfo.source}; files detected: ${parsedPatches.length}`);

    const successes = [];
    const failures = [];

    for (const patchEntry of parsedPatches) {
      const fileStart = Date.now();
      const targetPath = getNormalizedPatchPath(patchEntry);

      if (!targetPath) {
        const message = 'Patch entry did not specify a valid target file.';
        failures.push({ filePath: null, error: message });
        actionExecutorService.logExecution(
          'applyProposalPatch',
          { proposalId: id, requestId, filePath: null, reason: 'invalid_target' },
          false,
          message,
          Date.now() - fileStart
        );
        continue;
      }

      let safePath;
      try {
        safePath = actionExecutorService.validateSafePath(targetPath);
      } catch (validationError) {
        const message = `Unsafe file path rejected: ${validationError.message}`;
        failures.push({ filePath: targetPath, error: message });
        actionExecutorService.logExecution(
          'applyProposalPatch',
          { proposalId: id, requestId, filePath: targetPath, reason: 'unsafe_path' },
          false,
          message,
          Date.now() - fileStart
        );
        continue;
      }

      let originalContent = '';
      try {
        originalContent = await fs.readFile(safePath, 'utf8');
      } catch (readError) {
        if (readError.code === 'ENOENT') {
          const message = 'Target file not found for patch application.';
          failures.push({ filePath: targetPath, error: message });
          actionExecutorService.logExecution(
            'applyProposalPatch',
            { proposalId: id, requestId, filePath: targetPath, reason: 'missing_file' },
            false,
            message,
            Date.now() - fileStart
          );
          continue;
        }

        const message = `Failed to read target file: ${readError.message}`;
        failures.push({ filePath: targetPath, error: message });
        actionExecutorService.logExecution(
          'applyProposalPatch',
          { proposalId: id, requestId, filePath: targetPath, reason: 'read_error' },
          false,
          message,
          Date.now() - fileStart
        );
        continue;
      }

      const patchedContent = applyPatch(originalContent, patchEntry);
      if (patchedContent === false) {
        const message = 'Patch could not be applied to the current file content.';
        failures.push({ filePath: targetPath, error: message });
        actionExecutorService.logExecution(
          'applyProposalPatch',
          { proposalId: id, requestId, filePath: targetPath, reason: 'apply_failed' },
          false,
          message,
          Date.now() - fileStart
        );
        continue;
      }

      try {
        const patchResult = await strictPatch.applyStrictPatch(
          safePath,
          originalContent,
          patchedContent,
          {
            allowLargeChanges: true,
            requestId,
            metadata: {
              proposalId: id,
              patchSource: patchInfo.source,
            },
          }
        );

        const relativePath = path.relative(actionExecutorService.PROJECT_ROOT, safePath) || targetPath;
        const successEntry = {
          filePath: relativePath.startsWith('..') ? targetPath : relativePath,
          patchId: patchResult.patchId,
          linesChanged: patchResult.linesChanged,
          queueWaitTime: patchResult.queueWaitTime,
          executionTime: patchResult.executionTime,
          verification: patchResult.verification,
          backupId: patchResult.backupId,
        };

        successes.push(successEntry);

        actionExecutorService.logExecution(
          'applyProposalPatch',
          {
            proposalId: id,
            requestId,
            filePath: targetPath,
            patchId: patchResult.patchId,
            linesChanged: patchResult.linesChanged,
          },
          true,
          `Patch applied to ${targetPath}`,
          Date.now() - fileStart
        );
      } catch (patchError) {
        const message = patchError.message || 'Strict patch application failed.';
        failures.push({ filePath: targetPath, error: message });
        actionExecutorService.logExecution(
          'applyProposalPatch',
          { proposalId: id, requestId, filePath: targetPath, reason: 'strict_patch_failed' },
          false,
          message,
          Date.now() - fileStart
        );
      }
    }

    const applied = successes.length > 0 && failures.length === 0;
    const timestamp = new Date().toISOString();

    if (storedProposal) {
      updateStoredProposal(id, {
        status: applied ? 'applied' : storedProposal.status,
        appliedAt: applied ? timestamp : storedProposal.appliedAt,
        lastExecution: {
          success: applied,
          timestamp,
          requestId,
          appliedFiles: successes.map(entry => entry.filePath),
          failedFiles: failures.map(entry => entry.filePath),
        },
      });
    }

    console.log(`✅ [AI AUTO-IMPROVE] Proposal ${id} patch processing completed. Successes: ${successes.length}, Failures: ${failures.length}`);

    const responsePayload = {
      success: applied,
      proposalId: id,
      message: applied
        ? `Applied ${successes.length} file ${successes.length === 1 ? 'change' : 'changes'} successfully.`
        : failures.length === 0
          ? 'No changes were applied from the provided patch.'
          : `Applied with ${failures.length} issue${failures.length === 1 ? '' : 's'}.`,
      requestId,
      parsedFiles: parsedPatches.length,
      appliedFiles: successes,
      failedFiles: failures,
      patchSource: patchInfo.source,
      history: actionExecutorService.getExecutionHistory(10),
      timestamp,
      durationMs: Date.now() - startedAt,
    };

    const statusCode = applied ? 200 : 207; // 207 Multi-Status for partial failures
    return res.status(statusCode).json(responsePayload);

  } catch (error) {
    console.error(`❌ [AI AUTO-IMPROVE] Failed to apply proposal ${req.params.id}:`, error);

    if (actionExecutorService?.logExecution) {
      actionExecutorService.logExecution(
        'applyProposalPatch',
        {
          proposalId: req.params.id,
          requestId,
          reason: 'exception',
        },
        false,
        error.message,
        Date.now() - startedAt
      );
    }

    res.status(500).json({
      success: false,
      error: 'PROPOSAL_APPLY_ERROR',
      message: `Failed to apply proposal: ${error.message}`,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
});

// History endpoint for Auto-Improve runs
router.get('/history', protectAutoImprove, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    console.log(`📈 [AI AUTO-IMPROVE] Fetching history (limit: ${limit})`);
    
    // Get execution history from ActionExecutor
    const { actionExecutorService } = require('../services/action_executor_service');
    const executionHistory = actionExecutorService.getExecutionHistory(limit);
    
    // Convert to AutoUpdateRun format
    const history = executionHistory.map((entry, index) => ({
      id: `run_${entry.timestamp.replace(/[:-]/g, '').replace(/\..+/, '')}_${index}`,
      startedAt: entry.timestamp,
      completedAt: entry.timestamp,
      result: entry.success ? 'success' : 'failed',
      sources: ['action-executor'],
      proposalsGenerated: entry.action === 'writeFile' ? 1 : 0,
      proposalsApplied: entry.success && entry.action !== 'dry-run' ? 1 : 0,
      duration: entry.durationMs,
      metadata: {
        action: entry.action,
        requestId: entry.requestId,
        params: entry.params
      }
    }));

    res.json({
      success: true,
      history,
      count: history.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [AI AUTO-IMPROVE] History fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'HISTORY_FETCH_ERROR',
      message: `Failed to fetch history: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;

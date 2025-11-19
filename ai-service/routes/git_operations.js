const express = require('express');
const router = express.Router();
const gitCommandsService = require('../services/git_commands_service');
const gitWorkspaceManager = require('../services/git_workspace_manager');
const { requireAssistantAuth } = require('../middleware/authz');

const asyncHandler = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error('�?O [Git Operations] Request failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const resolveRepoParam = (req) => {
  if (typeof req.query.repo === 'string' && req.query.repo.trim()) {
    return req.query.repo.trim();
  }
  if (typeof req.body?.repo === 'string' && req.body.repo.trim()) {
    return req.body.repo.trim();
  }
  return 'local';
};

const shouldRefresh = (req) => req.query.refresh !== 'false';

const getWorkspace = async (req, { refresh = true } = {}) => {
  const repoParam = resolveRepoParam(req);
  return gitWorkspaceManager.ensureWorkspace(repoParam, { refresh });
};

const createGitService = (workspace) =>
  gitCommandsService.createScopedService(workspace.path);

const respondWithWorkspace = (res, workspace, payload) =>
  res.json({
    ...payload,
    repository: workspace.repo,
    workspace: {
      type: workspace.type,
      path: workspace.path,
    },
    timestamp: new Date().toISOString(),
  });

// Git Repository Management
router.post(
  '/init',
  requireAssistantAuth,
  asyncHandler(async (req, res) => {
    const workspace = await getWorkspace(req, { refresh: false });
    const git = createGitService(workspace);
    const result = await git.initializeGit();
    respondWithWorkspace(res, workspace, result);
  }),
);

// Repository Status
router.get(
  '/status',
  requireAssistantAuth,
  asyncHandler(async (req, res) => {
    const workspace = await getWorkspace(req, { refresh: shouldRefresh(req) });
    const git = createGitService(workspace);
    const result = await git.getStatus();
    respondWithWorkspace(res, workspace, result);
  }),
);

// File Operations
router.post(
  '/add',
  requireAssistantAuth,
  asyncHandler(async (req, res) => {
    const { files } = req.body || {};
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, error: 'files array is required' });
    }
    const workspace = await getWorkspace(req, { refresh: false });
    const git = createGitService(workspace);
    const result = await git.addFiles(files);
    respondWithWorkspace(res, workspace, result);
  }),
);

router.post(
  '/unstage',
  requireAssistantAuth,
  asyncHandler(async (req, res) => {
    const workspace = await getWorkspace(req, { refresh: false });
    const git = createGitService(workspace);
    const result = await git.unstageFiles(req.body?.files || []);
    respondWithWorkspace(res, workspace, result);
  }),
);

// Commit Operations
router.post(
  '/commit',
  requireAssistantAuth,
  asyncHandler(async (req, res) => {
    const { message, options } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Commit message is required' });
    }
    const workspace = await getWorkspace(req, { refresh: false });
    const git = createGitService(workspace);
    const result = await git.commit(message, options);
    respondWithWorkspace(res, workspace, result);
  }),
);

// History and Log
router.get(
  '/log',
  requireAssistantAuth,
  asyncHandler(async (req, res) => {
    const workspace = await getWorkspace(req, { refresh: shouldRefresh(req) });
    const git = createGitService(workspace);
    const limit = Number.parseInt(req.query.limit, 10) || 20;
    const result = await git.getLog({
      limit,
      branch: req.query.branch,
    });
    respondWithWorkspace(res, workspace, result);
  }),
);

// Branch Management
router.get(
  '/branches',
  requireAssistantAuth,
  asyncHandler(async (req, res) => {
    const workspace = await getWorkspace(req, { refresh: shouldRefresh(req) });
    const git = createGitService(workspace);
    const result = await git.getBranches();
    respondWithWorkspace(res, workspace, result);
  }),
);

router.post(
  '/branches',
  requireAssistantAuth,
  asyncHandler(async (req, res) => {
    const { name, baseBranch } = req.body || {};
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, error: 'Branch name is required' });
    }
    const workspace = await getWorkspace(req, { refresh: false });
    const git = createGitService(workspace);
    const result = await git.createBranch(name, baseBranch);
    respondWithWorkspace(res, workspace, result);
  }),
);

router.post(
  '/branches/switch',
  requireAssistantAuth,
  asyncHandler(async (req, res) => {
    const { branch } = req.body || {};
    if (!branch) {
      return res.status(400).json({ success: false, error: 'Branch is required' });
    }
    const workspace = await getWorkspace(req, { refresh: false });
    const git = createGitService(workspace);
    const result = await git.switchBranch(branch);
    respondWithWorkspace(res, workspace, result);
  }),
);

router.delete(
  '/branches/:branchName',
  requireAssistantAuth,
  asyncHandler(async (req, res) => {
    const { branchName } = req.params;
    const workspace = await getWorkspace(req, { refresh: false });
    const git = createGitService(workspace);
    const result = await git.deleteBranch(branchName, Boolean(req.body?.force));
    respondWithWorkspace(res, workspace, result);
  }),
);

// Merge Operations
router.post(
  '/merge',
  requireAssistantAuth,
  asyncHandler(async (req, res) => {
    const { branch, options } = req.body || {};
    if (!branch) {
      return res.status(400).json({ success: false, error: 'Branch is required' });
    }
    const workspace = await getWorkspace(req, { refresh: false });
    const git = createGitService(workspace);
    const result = await git.mergeBranch(branch, options);
    respondWithWorkspace(res, workspace, result);
  }),
);

// Conflict Resolution
router.get(
  '/conflicts',
  requireAssistantAuth,
  asyncHandler(async (req, res) => {
    const workspace = await getWorkspace(req, { refresh: false });
    const git = createGitService(workspace);
    const conflicts = await git.getConflictFiles();
    respondWithWorkspace(res, workspace, { success: true, conflicts });
  }),
);

router.post(
  '/resolve-conflict',
  requireAssistantAuth,
  asyncHandler(async (req, res) => {
    const { filePath, resolution } = req.body || {};
    if (!filePath || !resolution) {
      return res.status(400).json({ success: false, error: 'filePath and resolution are required' });
    }
    const workspace = await getWorkspace(req, { refresh: false });
    const git = createGitService(workspace);
    const result = await git.resolveConflict(filePath, resolution);
    respondWithWorkspace(res, workspace, result);
  }),
);

router.post(
  '/complete-merge',
  requireAssistantAuth,
  asyncHandler(async (req, res) => {
    const workspace = await getWorkspace(req, { refresh: false });
    const git = createGitService(workspace);
    const result = await git.completeMerge(req.body?.message);
    respondWithWorkspace(res, workspace, result);
  }),
);

// Remote Operations
router.post(
  '/push',
  requireAssistantAuth,
  asyncHandler(async (req, res) => {
    const workspace = await getWorkspace(req, { refresh: false });
    const git = createGitService(workspace);
    const result = await git.push(req.body?.remote, req.body?.branch);
    respondWithWorkspace(res, workspace, result);
  }),
);

router.post(
  '/pull',
  requireAssistantAuth,
  asyncHandler(async (req, res) => {
    const workspace = await getWorkspace(req, { refresh: false });
    const git = createGitService(workspace);
    const result = await git.pull(req.body?.remote, req.body?.branch);
    respondWithWorkspace(res, workspace, result);
  }),
);

router.post(
  '/fetch',
  requireAssistantAuth,
  asyncHandler(async (req, res) => {
    const workspace = await getWorkspace(req);
    const git = createGitService(workspace);
    const result = await git.fetch(req.body?.remote);
    respondWithWorkspace(res, workspace, result);
  }),
);

// Diff Operations
router.get(
  '/diff',
  requireAssistantAuth,
  asyncHandler(async (req, res) => {
    const workspace = await getWorkspace(req, { refresh: false });
    const git = createGitService(workspace);
    const { file, staged, commit1, commit2 } = req.query;
    const options = { staged: staged === 'true' };
    if (commit1 && commit2) {
      options.commits = [commit1, commit2];
    }
    const result = await git.showDiff(file, options);
    respondWithWorkspace(res, workspace, result);
  }),
);

// Stash Operations
router.post(
  '/stash',
  requireAssistantAuth,
  asyncHandler(async (req, res) => {
    const workspace = await getWorkspace(req, { refresh: false });
    const git = createGitService(workspace);
    const result = await git.stash(req.body?.message, req.body?.options);
    respondWithWorkspace(res, workspace, result);
  }),
);

router.get(
  '/stash',
  requireAssistantAuth,
  asyncHandler(async (req, res) => {
    const workspace = await getWorkspace(req, { refresh: false });
    const git = createGitService(workspace);
    const result = await git.listStashes();
    respondWithWorkspace(res, workspace, result);
  }),
);

router.post(
  '/stash/apply',
  requireAssistantAuth,
  asyncHandler(async (req, res) => {
    const workspace = await getWorkspace(req, { refresh: false });
    const git = createGitService(workspace);
    const result = await git.applyStash(req.body?.stashRef);
    respondWithWorkspace(res, workspace, result);
  }),
);

// Interactive Rebase
router.post(
  '/rebase',
  requireAssistantAuth,
  asyncHandler(async (req, res) => {
    const { targetCommit, operations } = req.body || {};
    if (!targetCommit) {
      return res.status(400).json({ success: false, error: 'targetCommit is required' });
    }
    const workspace = await getWorkspace(req, { refresh: false });
    const git = createGitService(workspace);
    const result = await git.startInteractiveRebase(targetCommit, operations || []);
    respondWithWorkspace(res, workspace, result);
  }),
);

module.exports = router;

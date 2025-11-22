/**
 * High level GitHub automation helpers for the admin AI dashboard.
 *
 * Responsibilities:
 *  - wrap Octokit calls for commits, branches, issues, pulls, and webhooks
 *  - persist dashboard preferences (auto-sync/commit toggles) via Firestore
 *  - expose analytics summaries consumed by the React tabs
 *
 * Testing:
 *   1. Configure ADMIN_SETUP_TOKEN and GitHub repo credentials.
 *   2. Open /admin/ai-developer → GitHub მენეჯმენტ ჰაბი and trigger actions.
 *   3. Verify commits, branches, and issues update with real GitHub data.
 */

const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

const admin = require('../firebase');
const gitCommands = require('./gitCommandsService');
const {
  getStatus,
  parseRepoInput,
  fetchRepositorySnapshot,
  getOctokit,
  loadState,
  updateState
} = require('./githubIntegration');

const firestore = typeof admin?.firestore === 'function' ? admin.firestore() : null;

const FEEDBACK_COLLECTION = process.env.GITHUB_FEEDBACK_COLLECTION || 'ai-feedback';
const SESSION_KEY_FALLBACK = 'global-admin';

const DEFAULT_POLLING_INTERVAL = Number.parseInt(process.env.GITHUB_SYNC_POLLING_INTERVAL_MS || '', 10) || 5 * 60 * 1000;
const MIN_POLLING_INTERVAL = 60 * 1000;
const MAX_POLLING_INTERVAL = 15 * 60 * 1000;

const pollingTimers = new Map();

const fsp = fs.promises;

const sanitizePathInput = (input) => {
  if (typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed || trimmed.includes('\0')) {
    return null;
  }

  let normalized = trimmed.replace(/\\/g, '/');
  normalized = normalized.replace(/^\.+\/+/, '');
  normalized = normalized.replace(/^\/+/, '');
  normalized = normalized.replace(/\/{2,}/g, '/');

  if (normalized.startsWith('../') || normalized.includes('/../') || normalized === '..') {
    return null;
  }

  return normalized;
};

const ensureDirectoryNotation = (entry) => {
  if (entry === '*' || entry.endsWith('/')) {
    return entry;
  }

  if (!entry.includes('.')) {
    return `${entry}/`;
  }

  return entry;
};

const normalizePolicyEntry = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const sanitized = sanitizePathInput(value);
  if (!sanitized) {
    return null;
  }

  if (sanitized === '*') {
    return '*';
  }

  return ensureDirectoryNotation(sanitized);
};

const parseListEnv = (raw) => {
  if (typeof raw !== 'string') {
    return [];
  }

  return raw
    .split(',')
    .map((entry) => normalizePolicyEntry(entry))
    .filter(Boolean);
};

const dedupeList = (list) => Array.from(new Set(list));

const sanitizePathList = (value) => {
  if (Array.isArray(value)) {
    return dedupeList(value.map((entry) => sanitizePathInput(entry)).filter(Boolean));
  }
  if (typeof value === 'string') {
    const sanitized = sanitizePathInput(value);
    return sanitized ? [sanitized] : [];
  }
  return [];
};

const buildOperationsPolicy = () => {
  const allowFromEnv = parseListEnv(process.env.GITHUB_OPERATIONS_ALLOWLIST);
  const denyFromEnv = parseListEnv(process.env.GITHUB_OPERATIONS_DENYLIST);

  const allowList = dedupeList([...DEFAULT_OPERATIONS_ALLOW.map(normalizePolicyEntry).filter(Boolean), ...allowFromEnv]);
  const denyList = dedupeList([...DEFAULT_OPERATIONS_DENY.map(normalizePolicyEntry).filter(Boolean), ...denyFromEnv]);

  const denyPatterns = [
    ...DEFAULT_OPERATIONS_DENY_PATTERNS,
    ...denyList
      .filter((entry) => typeof entry === 'string' && entry.startsWith('regexp:'))
      .map((entry) => {
        const pattern = entry.slice('regexp:'.length);
        try {
          return new RegExp(pattern);
        } catch (error) {
          console.warn('⚠️ Invalid denylist regexp entry:', entry, error.message || error);
          return null;
        }
      })
      .filter(Boolean),
  ];

  const sanitizedDenyList = denyList.filter((entry) => typeof entry === 'string' && !entry.startsWith('regexp:'));

  const baseBranch =
    (typeof process.env.GITHUB_OPERATIONS_BASE_BRANCH === 'string' &&
      process.env.GITHUB_OPERATIONS_BASE_BRANCH.trim()) ||
    'main';

  return {
    allowList,
    denyList: sanitizedDenyList,
    denyPatterns,
    baseBranch,
    guidelines: [
      'Only docs, marketing copy, and styling tweaks are eligible for fast-track PRs.',
      'Backend, gateway, or AI pipeline files require manual review and cannot be included here.',
      'Changes must be staged locally before triggering an operations PR.',
    ],
  };
};

const operationsPolicyCache = {
  value: null,
  updatedAt: 0,
};

const getOperationsPolicy = () => {
  const ttlMs = 60 * 1000;
  if (operationsPolicyCache.value && Date.now() - operationsPolicyCache.updatedAt < ttlMs) {
    return operationsPolicyCache.value;
  }

  const policy = buildOperationsPolicy();
  operationsPolicyCache.value = policy;
  operationsPolicyCache.updatedAt = Date.now();
  return policy;
};

const matchesPolicyEntry = (candidate, entry) => {
  if (entry === '*') {
    return true;
  }

  if (entry.endsWith('/')) {
    const prefix = entry;
    return candidate === prefix.slice(0, -1) || candidate.startsWith(prefix);
  }

  return candidate === entry || candidate.startsWith(`${entry}/`);
};

const evaluatePolicyForPath = (candidatePath, policy) => {
  const normalized = sanitizePathInput(candidatePath);
  if (!normalized) {
    return { allowed: false, reason: 'Invalid path' };
  }

  if (policy.denyPatterns.some((pattern) => pattern.test(normalized))) {
    return { allowed: false, reason: 'Path is blocked by deny pattern' };
  }

  if (policy.denyList.some((entry) => matchesPolicyEntry(normalized, entry))) {
    return { allowed: false, reason: 'Path is denied by policy' };
  }

  if (policy.allowList.some((entry) => matchesPolicyEntry(normalized, entry))) {
    return { allowed: true };
  }

  return { allowed: false, reason: 'Path is outside the allow-list' };
};

const resolvePolicyAnchor = (candidatePath, policy) => {
  const match = policy.allowList.find((entry) => matchesPolicyEntry(candidatePath, entry));
  if (match) {
    return match;
  }
  return candidatePath.includes('/') ? candidatePath.split('/')[0] + '/' : candidatePath;
};

const calculateDirectorySize = async (targetPath) => {
  try {
    const stat = await fsp.stat(targetPath);
    if (stat.isFile()) {
      return stat.size;
    }
    if (!stat.isDirectory()) {
      return 0;
    }

    const entries = await fsp.readdir(targetPath, { withFileTypes: true });
    let total = 0;
    for (const entry of entries) {
      const fullPath = path.join(targetPath, entry.name);
      total += await calculateDirectorySize(fullPath);
    }
    return total;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return 0;
    }
    throw error;
  }
};

const readJsonIfExists = async (filePath) => {
  try {
    const raw = await fsp.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

const getBundleMetrics = async () => {
  const baselineJson = await readJsonIfExists(OPERATIONS_BUNDLE_BASELINE_PATH);
  const baselineRaw =
    baselineJson?.aiFrontend?.baselineKb ??
    baselineJson?.ai_frontend?.baselineKb ??
    baselineJson?.baselineKb ??
    baselineJson?.baseline_kb ??
    null;

  const baselineKb = typeof baselineRaw === 'number' ? baselineRaw : Number.parseFloat(baselineRaw || '');
  const distPath = path.join(PROJECT_ROOT, 'ai-frontend', 'dist');

  try {
    const sizeBytes = await calculateDirectorySize(distPath);
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      return {
        baselineKb: Number.isFinite(baselineKb) ? baselineKb : null,
        currentKb: null,
        deltaKb: null,
        source: 'local',
        note: 'Frontend bundle not built yet — run pnpm -w run build',
      };
    }

    const currentKb = Math.round((sizeBytes / 1024) * 10) / 10;
    const deltaKb = Number.isFinite(baselineKb) ? Math.round((currentKb - baselineKb) * 10) / 10 : null;

    return {
      baselineKb: Number.isFinite(baselineKb) ? baselineKb : null,
      currentKb,
      deltaKb,
      source: 'local',
    };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {
        baselineKb: Number.isFinite(baselineKb) ? baselineKb : null,
        currentKb: null,
        deltaKb: null,
        source: 'local',
        note: 'Bundle directory missing',
      };
    }
    console.warn('⚠️ Unable to calculate bundle metrics:', error.message || error);
    return {
      baselineKb: Number.isFinite(baselineKb) ? baselineKb : null,
      currentKb: null,
      deltaKb: null,
      source: 'local',
      note: error.message || 'Unable to compute bundle size',
    };
  }
};

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OPERATIONS_BUNDLE_BASELINE_PATH = path.join(
  PROJECT_ROOT,
  'docs',
  'metrics',
  'bundle-baseline.json'
);

const DEFAULT_OPERATIONS_ALLOW = [
  'docs/',
  'README.md',
  'CHANGELOG.md',
  'REQUIRED_SECRETS.md',
  'REPLIT_SECRETS_SETUP.md',
  'docs/ai-space/',
  'docs/metrics/',
  'ai-frontend/src/styles/',
  'ai-frontend/src/index.css',
  'ai-frontend/src/components/content/',
  'ai-frontend/src/components/marketing/',
  'ai-frontend/src/pages/content/',
  'ai-frontend/src/i18n/',
  'ai-frontend/src/layout/marketing/',
];

const DEFAULT_OPERATIONS_DENY = [
  'backend/',
  'gateway/',
  'ai-service/',
  'functions/',
  'property-api/',
  'shared/security/',
  'scripts/deploy',
];

const DEFAULT_OPERATIONS_DENY_PATTERNS = [
  /^ai-frontend\/src\/services\//,
  /^ai-frontend\/src\/hooks\//,
  /^ai-frontend\/src\/contexts\//,
  /^ai-frontend\/src\/api\//,
  /^ai-frontend\/src\/lib\//,
  /^ai-frontend\/src\/state\//,
  /^ai-frontend\/src\/features\/ai\//,
  /^tests?\//,
  /^firebase\//,
  /^storage\//,
];

const resolveSessionKey = (sessionKey) =>
  typeof sessionKey === 'string' && sessionKey.trim().length > 0 ? sessionKey.trim() : SESSION_KEY_FALLBACK;

const normalizePollingInterval = (value) => {
  const numericValue =
    typeof value === 'number' && Number.isFinite(value)
      ? value
      : Number.parseInt(typeof value === 'string' ? value : `${value}`, 10);

  if (!Number.isFinite(numericValue)) {
    return DEFAULT_POLLING_INTERVAL;
  }

  return Math.min(Math.max(numericValue, MIN_POLLING_INTERVAL), MAX_POLLING_INTERVAL);
};

const maskToken = (token) => {
  if (typeof token !== 'string' || token.trim().length === 0) {
    return null;
  }

  const trimmed = token.trim();
  if (trimmed.length <= 8) {
    return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`;
  }

  return `${trimmed.slice(0, 4)}•••${trimmed.slice(-4)}`;
};

const maskSecret = (secret) => {
  if (typeof secret !== 'string' || secret.trim().length === 0) {
    return null;
  }

  const trimmed = secret.trim();
  if (trimmed.length <= 6) {
    return `${trimmed.slice(0, 1)}***${trimmed.slice(-1)}`;
  }

  return `${trimmed.slice(0, 3)}••••${trimmed.slice(-3)}`;
};

const pickFirstString = (...values) => {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return null;
};

const normalizePermission = (permission) => {
  const raw = typeof permission === 'string' ? permission.trim().toLowerCase() : '';
  if (!raw) {
    return 'push';
  }

  if (['pull', 'push', 'triage', 'maintain', 'admin'].includes(raw)) {
    return raw;
  }

  if (raw === 'read') return 'pull';
  if (raw === 'write') return 'push';

  return 'push';
};

const parseTopicsInput = (input) => {
  if (input === null) {
    return [];
  }

  if (Array.isArray(input)) {
    return input
      .map((topic) => (typeof topic === 'string' ? topic.trim().toLowerCase() : ''))
      .filter(Boolean);
  }

  if (typeof input === 'string') {
    return input
      .split(',')
      .map((topic) => topic.trim().toLowerCase())
      .filter(Boolean);
  }

  return null;
};

const safeCall = async (label, callback, { fallback = null, transform } = {}) => {
  try {
    const result = await callback();
    if (typeof transform === 'function') {
      return transform(result);
    }
    return result;
  } catch (error) {
    const status = error?.status || error?.statusCode || error?.response?.status;
    const message = error?.message || error;
    console.warn(`⚠️ [GitHubAI:${label}] ${message}`, { status });
    if (typeof transform === 'function' && fallback !== null) {
      return transform(fallback);
    }
    return fallback;
  }
};

const mapIssueForUi = (issue) => ({
  number: issue.number,
  title: issue.title,
  state: issue.state,
  labels: Array.isArray(issue.labels)
    ? issue.labels
        .map((label) => (typeof label === 'string' ? label : label?.name))
        .filter(Boolean)
    : [],
  created_at: issue.created_at,
  updated_at: issue.updated_at,
  html_url: issue.html_url,
  author: issue.user ? { login: issue.user.login, avatar_url: issue.user.avatar_url } : null,
  assignees: Array.isArray(issue.assignees)
    ? issue.assignees.map((assignee) => ({ login: assignee.login, avatar_url: assignee.avatar_url }))
    : [],
  comments: issue.comments,
});

const mapPullForUi = (pull) => ({
  number: pull.number,
  title: pull.title,
  state: pull.state,
  merged_at: pull.merged_at,
  created_at: pull.created_at,
  updated_at: pull.updated_at,
  html_url: pull.html_url,
  author: pull.user ? { login: pull.user.login, avatar_url: pull.user.avatar_url } : null,
});

const mapCollaborator = (collaborator) => ({
  login: collaborator.login,
  avatar_url: collaborator.avatar_url,
  url: collaborator.html_url,
  role: collaborator.permissions?.admin
    ? 'Admin'
    : collaborator.permissions?.push
      ? 'Maintainer'
      : 'Contributor',
  permissions: collaborator.permissions,
});

const mapWebhook = (webhook) => ({
  id: webhook.id,
  url: webhook.config?.url,
  active: webhook.active,
  events: webhook.events,
  lastResponse: webhook.last_response,
  created_at: webhook.created_at,
  updated_at: webhook.updated_at,
});

const mapWorkflow = (workflow) => ({
  id: workflow.id,
  name: workflow.name,
  path: workflow.path,
  state: workflow.state,
  created_at: workflow.created_at,
  updated_at: workflow.updated_at,
  html_url: workflow.html_url,
});

const mapWorkflowRun = (run) => ({
  id: run.id,
  name: run.name,
  event: run.event,
  status: run.status,
  conclusion: run.conclusion,
  created_at: run.created_at,
  updated_at: run.updated_at,
  html_url: run.html_url,
  actor: run.actor ? { login: run.actor.login, avatar_url: run.actor.avatar_url } : null,
});

const getEffectiveSettings = (state) => {
  const settings = { ...(state?.settings || {}) };
  if (typeof state?.status?.autoSync === 'boolean') {
    settings.autoSync = state.status.autoSync;
  }
  if (typeof state?.status?.autoCommit === 'boolean' && typeof settings.autoCommit !== 'boolean') {
    settings.autoCommit = state.status.autoCommit;
  }
  if (typeof state?.status?.autoMerge === 'boolean' && typeof settings.autoMerge !== 'boolean') {
    settings.autoMerge = state.status.autoMerge;
  }
  if (typeof state?.status?.branch === 'string' && !settings.branch) {
    settings.branch = state.status.branch;
  }
  if (!settings.repoUrl && typeof state?.repoUrl === 'string') {
    settings.repoUrl = state.repoUrl;
  }
  if (!settings.owner && typeof state?.owner === 'string') {
    settings.owner = state.owner;
  }
  if (!settings.repo && typeof state?.repo === 'string') {
    settings.repo = state.repo;
  }
  if (!settings.pollingIntervalMs && typeof settings.pollingInterval === 'number') {
    settings.pollingIntervalMs = settings.pollingInterval;
  }
  if (!settings.webhookUrl && typeof state?.settings?.webhookUrl === 'string') {
    settings.webhookUrl = state.settings.webhookUrl;
  }
  if (!settings.branchProtection && state?.settings?.branchProtection) {
    settings.branchProtection = state.settings.branchProtection;
  }
  return settings;
};

function stopAutoRefresh(sessionKey) {
  const key = resolveSessionKey(sessionKey);
  const existing = pollingTimers.get(key);
  if (existing?.timer) {
    clearInterval(existing.timer);
  }
  pollingTimers.delete(key);
}

function scheduleAutoRefreshIfNeeded(sessionKey, state) {
  const key = resolveSessionKey(sessionKey);
  const settings = getEffectiveSettings(state);
  const autoSync = typeof settings.autoSync === 'boolean' ? settings.autoSync : false;

  if (!autoSync) {
    stopAutoRefresh(key);
    return;
  }

  const intervalRaw = settings.pollingIntervalMs ?? settings.pollingInterval ?? DEFAULT_POLLING_INTERVAL;
  const interval = normalizePollingInterval(intervalRaw);
  const existing = pollingTimers.get(key);

  if (existing && existing.interval === interval) {
    return;
  }

  if (existing?.timer) {
    clearInterval(existing.timer);
  }

  const timer = setInterval(() => {
    refreshSnapshot(key).catch((error) => {
      console.error('❌ Automatic GitHub refresh failed:', error?.message || error);
    });
  }, interval);

  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  pollingTimers.set(key, { timer, interval });
}

const resolveRepoConfig = async (sessionKey) => {
  const resolvedKey = resolveSessionKey(sessionKey);
  const state = await getStatus(resolvedKey);
  if (!state?.connected) {
    throw Object.assign(new Error('GitHub integration is not connected yet'), { status: 412 });
  }

  const settings = getEffectiveSettings(state);

  const repoUrl = settings.repoUrl || state.status?.remoteUrl || process.env.GITHUB_REPO_URL;
  const owner = settings.owner || state.owner || process.env.GITHUB_REPO_OWNER || process.env.GITHUB_OWNER;
  const repo = settings.repo || state.repo || process.env.GITHUB_REPO_NAME || process.env.GITHUB_REPO;

  if (repoUrl) {
    const parsed = parseRepoInput(repoUrl);
    return { ...parsed, sessionKey: resolvedKey, state, settings, token: settings.githubToken || process.env.GITHUB_TOKEN };
  }

  if (owner && repo) {
    return {
      owner,
      repo,
      repoUrl: `https://github.com/${owner}/${repo}.git`,
      sessionKey: resolvedKey,
      state,
      settings,
      token: settings.githubToken || process.env.GITHUB_TOKEN
    };
  }

  throw Object.assign(new Error('GitHub repository details missing. Configure repo connection first.'), { status: 500 });
};

const computeStats = (snapshot) => {
  if (!snapshot) return null;
  return {
    total: snapshot.commits?.length || 0,
    today: snapshot.commits?.filter((commit) => {
      if (!commit?.date) return false;
      const ts = new Date(commit.date).getTime();
      return Number.isFinite(ts) && Date.now() - ts < 24 * 60 * 60 * 1000;
    }).length || 0,
    prs: snapshot.pulls?.length || 0,
    issues: snapshot.issues?.length || 0,
    stars: snapshot.stats?.stars || snapshot.repository?.stargazers_count || 0,
    forks: snapshot.stats?.forks || snapshot.repository?.forks_count || 0
  };
};

const fetchRepositoryAnalytics = async ({ owner, repo, token }) => {
  const octokit = getOctokit(token);

  const repository = await safeCall(
    'repos.get',
    () => octokit.repos.get({ owner, repo }),
    { fallback: null, transform: (res) => res?.data || null }
  );

  const collaboratorsRaw = await safeCall(
    'repos.listCollaborators',
    () => octokit.repos.listCollaborators({ owner, repo, per_page: 100 }),
    { fallback: [], transform: (res) => res?.data || [] }
  );

  const webhooksRaw = await safeCall(
    'repos.listWebhooks',
    () => octokit.repos.listWebhooks({ owner, repo, per_page: 100 }),
    { fallback: [], transform: (res) => res?.data || [] }
  );

  const workflowsRaw = await safeCall(
    'actions.listRepoWorkflows',
    () => octokit.actions.listRepoWorkflows({ owner, repo, per_page: 100 }),
    { fallback: [], transform: (res) => res?.data?.workflows || [] }
  );

  const workflowRunsRaw = await safeCall(
    'actions.listWorkflowRunsForRepo',
    () => octokit.actions.listWorkflowRunsForRepo({ owner, repo, per_page: 50 }),
    { fallback: [], transform: (res) => res?.data?.workflow_runs || [] }
  );

  const branchesRaw = await safeCall(
    'repos.listBranches',
    () => octokit.repos.listBranches({ owner, repo, per_page: 100 }),
    { fallback: [], transform: (res) => res?.data || [] }
  );

  const contributorsRaw = await safeCall(
    'repos.listContributors',
    () => octokit.repos.listContributors({ owner, repo, per_page: 100 }),
    { fallback: [], transform: (res) => res?.data || [] }
  );

  const commitActivity = await safeCall(
    'repos.getCommitActivityStats',
    () => octokit.repos.getCommitActivityStats({ owner, repo }),
    { fallback: [], transform: (res) => res?.data || [] }
  );

  const participation = await safeCall(
    'repos.getParticipationStats',
    () => octokit.repos.getParticipationStats({ owner, repo }),
    {
      fallback: { all: [], owner: [] },
      transform: (res) => res?.data || { all: [], owner: [] }
    }
  );

  const openIssuesRaw = await safeCall(
    'issues.listForRepo(open)',
    () => octokit.issues.listForRepo({ owner, repo, state: 'open', per_page: 50, sort: 'created', direction: 'desc' }),
    { fallback: [], transform: (res) => res?.data || [] }
  );

  const closedIssuesRaw = await safeCall(
    'issues.listForRepo(closed)',
    () => octokit.issues.listForRepo({ owner, repo, state: 'closed', per_page: 50, sort: 'updated', direction: 'desc' }),
    { fallback: [], transform: (res) => res?.data || [] }
  );

  const openPullsRaw = await safeCall(
    'pulls.list(open)',
    () => octokit.pulls.list({ owner, repo, state: 'open', per_page: 50 }),
    { fallback: [], transform: (res) => res?.data || [] }
  );

  const branchProtection = [];
  await Promise.all(
    branchesRaw
      .filter((branch) => branch?.protected)
      .map(async (branch) => {
        const protection = await safeCall(
          `repos.getBranchProtection(${branch.name})`,
          () => octokit.repos.getBranchProtection({ owner, repo, branch: branch.name }),
          { fallback: null, transform: (res) => res?.data || null }
        );
        if (protection) {
          branchProtection.push({ branch: branch.name, rules: protection });
        }
      })
  );

  const collaborators = collaboratorsRaw.map(mapCollaborator);
  const webhooks = webhooksRaw.map(mapWebhook);
  const workflows = workflowsRaw.map(mapWorkflow);
  const workflowRuns = workflowRunsRaw.map(mapWorkflowRun);
  const issuesOpen = openIssuesRaw.map(mapIssueForUi);
  const issuesClosed = closedIssuesRaw.map(mapIssueForUi);
  const pulls = openPullsRaw.map(mapPullForUi);

  const totalCommits = commitActivity.reduce((sum, week) => sum + (week?.total || 0), 0);
  const recentActivity = commitActivity.slice(-4).map((week) => ({
    week: week.week,
    total: week.total,
    days: week.days,
  }));

  const topContributors = contributorsRaw
    .slice(0, 8)
    .map((contributor) => ({
      login: contributor.login,
      contributions: contributor.contributions,
      avatar_url: contributor.avatar_url,
    }));

  const workflowSuccessRate = workflowRuns.length
    ? Math.round(
        (workflowRuns.filter((run) => run.conclusion === 'success').length / workflowRuns.length) * 100
      )
    : 0;

  return {
    repository,
    collaborators,
    webhooks,
    workflows,
    workflowRuns,
    branches: branchesRaw,
    branchProtection,
    commitActivity,
    participation,
    contributors: topContributors,
    issues: {
      open: issuesOpen,
      closed: issuesClosed,
    },
    pulls,
    analyticsSummary: {
      totalCommits,
      workflowSuccessRate,
      openIssues: issuesOpen.length,
      closedIssues: issuesClosed.length,
      openPullRequests: pulls.length,
      recentActivity,
      participation,
    },
    updatedAt: new Date().toISOString(),
  };
};

const refreshSnapshot = async (sessionKey) => {
  const config = await resolveRepoConfig(sessionKey);
  const octokit = getOctokit(config.token);
  const snapshot = await fetchRepositorySnapshot(octokit, config.owner, config.repo);
  const updatedState = await updateState(config.sessionKey, (previous) => {
    const previousSettings = getEffectiveSettings(previous);
    const mergedSettings = {
      ...previousSettings,
      ...(config.settings || {}),
      repoUrl: snapshot.repoUrl || config.repoUrl || previousSettings.repoUrl,
      owner: config.owner || previousSettings.owner,
      repo: config.repo || previousSettings.repo,
      updatedAt: new Date().toISOString(),
    };

    const status = {
      ...(previous.status || {}),
      ...(snapshot.status || {}),
      branch:
        snapshot.status?.branch ||
        snapshot.branches?.current ||
        mergedSettings.branch ||
        previous.status?.branch,
      remoteUrl: snapshot.repoUrl || previous.status?.remoteUrl,
      autoSync:
        typeof mergedSettings.autoSync === 'boolean'
          ? Boolean(mergedSettings.autoSync)
          : previous.status?.autoSync,
    };

    return {
      ...previous,
      ...snapshot,
      repoUrl: snapshot.repoUrl || config.repoUrl || previous.repoUrl,
      owner: config.owner,
      repo: config.repo,
      status,
      stats: computeStats(snapshot),
      settings: mergedSettings,
      lastSynced: new Date().toISOString(),
      connected: true,
    };
  });

  scheduleAutoRefreshIfNeeded(config.sessionKey, updatedState);
  return updatedState;
};

const getCommits = async (sessionKey, { limit = 20 } = {}) => {
  const { owner, repo, token } = await resolveRepoConfig(sessionKey);
  const octokit = getOctokit(token);
  const response = await octokit.repos.listCommits({ owner, repo, per_page: Math.min(limit, 100) });
  return response.data.map((commit) => ({
    hash: commit.sha?.slice(0, 7),
    fullHash: commit.sha,
    message: commit.commit?.message,
    date: commit.commit?.author?.date || commit.commit?.committer?.date,
    author: commit.commit?.author?.name || commit.author?.login || 'Unknown',
    url: commit.html_url
  }));
};

const getBranches = async (sessionKey) => {
  const { owner, repo, token } = await resolveRepoConfig(sessionKey);
  const octokit = getOctokit(token);
  const response = await octokit.repos.listBranches({ owner, repo, per_page: 100 });
  return response.data.map((branch) => ({
    name: branch.name,
    hash: branch.commit?.sha,
    protected: branch.protected,
    type: 'remote'
  }));
};

const getIssuesStats = async (sessionKey) => {
  const { owner, repo, token } = await resolveRepoConfig(sessionKey);
  const octokit = getOctokit(token);
  const [openIssues, closedIssues] = await Promise.all([
    octokit.issues.listForRepo({ owner, repo, state: 'open', per_page: 100, sort: 'created', direction: 'desc' }),
    octokit.issues.listForRepo({ owner, repo, state: 'closed', per_page: 100, sort: 'updated', direction: 'desc' })
  ]);

  const open = (openIssues.data || []).map(mapIssueForUi);
  const closed = (closedIssues.data || []).map(mapIssueForUi);

  const labelMatches = (issue, keyword) =>
    Array.isArray(issue.labels) && issue.labels.some((label) => new RegExp(keyword, 'i').test(label));

  // Test by updating settings and verifying data refresh in sections.
  return {
    success: true,
    updatedAt: new Date().toISOString(),
    totals: {
      open: open.length,
      closed: closed.length,
      inProgress: open.filter((issue) => labelMatches(issue, 'progress')).length,
      backlog: open.filter((issue) => labelMatches(issue, 'backlog')).length
    },
    issues: {
      open,
      closed,
    }
  };
};

const createIssue = async (sessionKey, payload) => {
  const { owner, repo, token } = await resolveRepoConfig(sessionKey);
  const octokit = getOctokit(token);
  const result = await octokit.issues.create({ owner, repo, ...payload });
  return { success: true, issue: result.data };
};

const closeIssue = async (sessionKey, issueNumber) => {
  const { owner, repo, token } = await resolveRepoConfig(sessionKey);
  const octokit = getOctokit(token);
  const result = await octokit.issues.update({ owner, repo, issue_number: issueNumber, state: 'closed' });
  return { success: true, issue: result.data };
};

const listWebhooks = async (sessionKey) => {
  const { owner, repo, token } = await resolveRepoConfig(sessionKey);
  const octokit = getOctokit(token);
  const response = await octokit.repos.listWebhooks({ owner, repo, per_page: 100 });
  return response.data;
};

const deleteWebhook = async (sessionKey, webhookId) => {
  const { owner, repo, token } = await resolveRepoConfig(sessionKey);
  const octokit = getOctokit(token);
  await octokit.repos.deleteWebhook({ owner, repo, hook_id: webhookId });
  return { success: true };
};

const updateWebhook = async (sessionKey, webhookId, updates) => {
  const { owner, repo, token } = await resolveRepoConfig(sessionKey);
  const octokit = getOctokit(token);
  const result = await octokit.repos.updateWebhook({ owner, repo, hook_id: webhookId, ...updates });
  return { success: true, webhook: result.data };
};

const rotateWebhookSecret = async (sessionKey, webhookId) => {
  const secret = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 40);
  const result = await updateWebhook(sessionKey, webhookId, { config: { secret } });
  return { ...result, secret };
};

const ensureCollaboratorAccess = async (sessionKey, input = {}) => {
  const config = await resolveRepoConfig(sessionKey);
  const { owner, repo, token } = config;
  const octokit = getOctokit(token);

  const collaboratorLogin = pickFirstString(
    input.username,
    input.login,
    config.settings?.defaultCollaborator,
    process.env.GITHUB_AUTOMATION_COLLABORATOR
  );

  if (!collaboratorLogin) {
    throw Object.assign(new Error('Collaborator username is required for automation'), { status: 400 });
  }

  const desiredPermission = normalizePermission(
    input.permission || config.settings?.defaultCollaboratorPermission || process.env.GITHUB_AUTOMATION_COLLABORATOR_PERMISSION
  );

  const { data: collaborators } = await octokit.repos.listCollaborators({ owner, repo, per_page: 100 });
  const existing = collaborators.find((collaborator) => collaborator.login.toLowerCase() === collaboratorLogin.toLowerCase());

  const permissionRank = { pull: 1, triage: 2, push: 3, maintain: 4, admin: 5 };
  const rankFromPermissions = (permissions = {}) => {
    if (!permissions) return 0;
    if (permissions.admin) return permissionRank.admin;
    if (permissions.maintain) return permissionRank.maintain;
    if (permissions.push) return permissionRank.push;
    if (permissions.triage) return permissionRank.triage;
    if (permissions.pull) return permissionRank.pull;
    return 0;
  };

  const currentRank = existing ? rankFromPermissions(existing.permissions) : 0;
  const desiredRank = permissionRank[desiredPermission] || permissionRank.push;

  let action = 'unchanged';

  if (!existing) {
    await octokit.repos.addCollaborator({ owner, repo, username: collaboratorLogin, permission: desiredPermission });
    action = 'invited';
  } else if (currentRank < desiredRank) {
    await octokit.repos.addCollaborator({ owner, repo, username: collaboratorLogin, permission: desiredPermission });
    action = 'permission-updated';
  }

  return {
    success: true,
    collaborator: {
      login: collaboratorLogin,
      permission: desiredPermission,
      action,
    },
  };
};

const ensureWebhookConfigured = async (sessionKey, input = {}) => {
  const config = await resolveRepoConfig(sessionKey);
  const { owner, repo, token } = config;
  const octokit = getOctokit(token);
  const settings = await getSettings(sessionKey, config.state);

  const url = pickFirstString(
    input.url,
    settings.webhookUrl,
    process.env.GITHUB_AUTOMATION_WEBHOOK_URL,
    process.env.REPLIT_URL ? `${process.env.REPLIT_URL.replace(/\/$/, '')}/api/github/webhook` : null
  );

  if (!url) {
    throw Object.assign(new Error('Webhook URL is required before automation can run'), { status: 400 });
  }

  const eventsRaw = Array.isArray(input.events) && input.events.length > 0
    ? input.events
    : Array.isArray(settings.webhookEvents) && settings.webhookEvents.length > 0
      ? settings.webhookEvents
      : ['push', 'pull_request'];

  const events = Array.from(new Set(eventsRaw.map((event) => String(event).trim()).filter(Boolean)));

  const secret = pickFirstString(input.secret, settings.webhookSecret, process.env.GITHUB_WEBHOOK_SECRET);
  const contentType = pickFirstString(input.contentType, 'json');

  const configPayload = {
    url,
    content_type: contentType,
    insecure_ssl: input.insecureSsl ? '1' : '0',
    ...(secret ? { secret } : {}),
  };

  const { data: webhooks } = await octokit.repos.listWebhooks({ owner, repo, per_page: 100 });
  const existing = webhooks.find((hook) => hook.config?.url === url);

  const sortEvents = (list = []) => [...list].map(String).map((value) => value.trim()).filter(Boolean).sort();

  let action = 'unchanged';
  let webhookId = existing?.id || null;

  if (existing) {
    const existingEvents = sortEvents(existing.events);
    const desiredEvents = sortEvents(events);
    const eventsChanged = JSON.stringify(existingEvents) !== JSON.stringify(desiredEvents);
    const contentChanged = (existing.config?.content_type || 'json') !== contentType;
    const secretChanged = secret ? existing.config?.secret !== secret : false;
    const activeChanged = existing.active === false;

    if (eventsChanged || contentChanged || secretChanged || activeChanged) {
      const result = await octokit.repos.updateWebhook({
        owner,
        repo,
        hook_id: existing.id,
        config: configPayload,
        events: desiredEvents,
        active: true,
      });
      webhookId = result.data.id;
      action = 'updated';
    }
  } else {
    const result = await octokit.repos.createWebhook({
      owner,
      repo,
      config: configPayload,
      events,
      active: true,
    });
    webhookId = result.data.id;
    action = 'created';
  }

  return {
    success: true,
    webhook: {
      id: webhookId,
      url,
      events,
      action,
      active: true,
      hasSecret: Boolean(secret),
    },
  };
};

const ensureRepositoryMetadata = async (sessionKey, input = {}) => {
  try {
    const config = await resolveRepoConfig(sessionKey);
    const { owner, repo, token } = config;
    const octokit = getOctokit(token);

    const desiredDescription = pickFirstString(
      input.description,
      process.env.GITHUB_AUTOMATION_DESCRIPTION
    );

    const desiredHomepage = pickFirstString(
      input.homepage,
      process.env.GITHUB_AUTOMATION_HOMEPAGE
    );

    const topicsInput = Object.prototype.hasOwnProperty.call(input, 'topics')
      ? parseTopicsInput(input.topics)
      : parseTopicsInput(process.env.GITHUB_AUTOMATION_TOPICS);

    const repoResponse = await octokit.repos.get({ owner, repo });
    let repository = repoResponse.data;

    const updates = {};
    if (typeof desiredDescription === 'string' && desiredDescription !== repository.description) {
      updates.description = desiredDescription;
    }
    if (typeof desiredHomepage === 'string' && desiredHomepage !== repository.homepage) {
      updates.homepage = desiredHomepage;
    }

    let descriptionUpdated = false;
    if (Object.keys(updates).length > 0) {
      const result = await octokit.repos.update({ owner, repo, ...updates });
      repository = result.data;
      descriptionUpdated = true;
    }

    let topicsUpdated = false;
    let appliedTopics = repository.topics || [];

    if (topicsInput !== null) {
      const normalizedTopics = Array.from(new Set(topicsInput));
      const existingTopics = Array.from(new Set((repository.topics || []).map((topic) => topic.toLowerCase())));
      const normalizedSorted = [...normalizedTopics].sort();
      const existingSorted = [...existingTopics].sort();

      if (JSON.stringify(normalizedSorted) !== JSON.stringify(existingSorted)) {
        await octokit.repos.replaceAllTopics({ owner, repo, names: normalizedTopics });
        topicsUpdated = true;
        appliedTopics = normalizedTopics;
      } else {
        appliedTopics = existingTopics;
      }
    }

    return {
      success: true,
      metadata: {
        description: repository.description,
        homepage: repository.homepage,
        topics: appliedTopics,
      },
      updated: {
        description: descriptionUpdated,
        topics: topicsUpdated,
      },
    };
  } catch (error) {
    if (error?.status === 403 || error?.statusCode === 403) {
      console.warn('⚠️ [Metadata] GitHub denied metadata update (403)');
      return {
        success: false,
        metadata: {},
        updated: {
          description: false,
          topics: false,
        },
        error: 'FORBIDDEN',
      };
    }
    throw error;
  }
};

const ensureBranchProtectionRules = async (sessionKey, input = {}) => {
  const config = await resolveRepoConfig(sessionKey);
  const { owner, repo, token } = config;
  const octokit = getOctokit(token);

  const branchName = pickFirstString(
    input.branch,
    config.settings?.branch,
    config.state?.status?.branch,
    config.state?.repository?.default_branch,
    'main'
  );

  const requiredStatusChecks = Object.prototype.hasOwnProperty.call(input, 'requiredStatusChecks')
    ? input.requiredStatusChecks
    : {
        strict: true,
        contexts: Array.isArray(input.statusCheckContexts) ? input.statusCheckContexts : [],
      };

  const enforceAdmins = Object.prototype.hasOwnProperty.call(input, 'enforceAdmins')
    ? Boolean(input.enforceAdmins)
    : true;

  const requiredPullRequestReviews = Object.prototype.hasOwnProperty.call(input, 'requiredPullRequestReviews')
    ? input.requiredPullRequestReviews
    : {
        required_approving_review_count: 1,
      };

  const restrictions = Object.prototype.hasOwnProperty.call(input, 'restrictions')
    ? input.restrictions
    : null;

  const allowForcePushes = Boolean(input.allowForcePushes);
  const allowDeletions = Boolean(input.allowDeletions);

  await octokit.repos.updateBranchProtection({
    owner,
    repo,
    branch: branchName,
    required_status_checks: requiredStatusChecks,
    enforce_admins: enforceAdmins,
    required_pull_request_reviews: requiredPullRequestReviews,
    restrictions,
    allow_force_pushes: allowForcePushes,
    allow_deletions: allowDeletions,
  });

  const protection = await octokit.repos.getBranchProtection({ owner, repo, branch: branchName });

  return {
    success: true,
    branch: branchName,
    protection: protection.data,
  };
};

const buildDashboardPayload = ({ snapshot, analytics, settings }) => {
  const repository = analytics?.repository || snapshot.repository || null;
  const branches = snapshot.branches || { remote: [], local: [] };
  const pulls = Array.isArray(analytics?.pulls) && analytics.pulls.length > 0 ? analytics.pulls : snapshot.pulls || [];
  const issuesOpen = analytics?.issues?.open || snapshot.issues || [];
  const issuesClosed = analytics?.issues?.closed || [];
  const analyticsSummary = analytics?.analyticsSummary || null;

  return {
    success: true,
    status: snapshot.status,
    stats: snapshot.stats || computeStats(snapshot),
    commits: snapshot.commits || [],
    branches,
    pulls,
    issues: {
      open: issuesOpen,
      closed: issuesClosed,
    },
    repository,
    collaborators: analytics?.collaborators || [],
    webhooks: analytics?.webhooks || [],
    workflows: analytics?.workflows || [],
    workflowRuns: analytics?.workflowRuns || [],
    branchProtection: analytics?.branchProtection || [],
    analytics: analyticsSummary,
    commitActivity: analytics?.commitActivity || [],
    participation: analytics?.participation || { all: [], owner: [] },
    settings,
    lastSynced: snapshot.lastSynced,
    updatedAt: analytics?.updatedAt || snapshot.lastSynced,
    dashboard: {
      repository,
      collaborators: analytics?.collaborators || [],
      branches: Array.isArray(branches?.remote) ? branches.remote : branches,
      workflowRuns: analytics?.workflowRuns || [],
      workflows: analytics?.workflows || [],
      webhooks: analytics?.webhooks || [],
      topics: repository?.topics || [],
      analytics: analyticsSummary,
      issues: {
        open: issuesOpen,
        closed: issuesClosed,
      },
      pulls,
      branchProtection: analytics?.branchProtection || [],
    },
    analyticsRaw: analytics,
  };
};

const getDetailedStatus = async (sessionKey, options = {}) => {
  const snapshot = await ensureSnapshotFresh(sessionKey, options);
  if (!snapshot) {
    const refreshed = await refreshSnapshot(sessionKey);
    const refreshedSettings = await getSettings(sessionKey, refreshed);
    return buildDashboardPayload({ snapshot: refreshed, analytics: null, settings: refreshedSettings });
  }

  const settings = await getSettings(sessionKey, snapshot);
  let analytics = null;
  try {
    const config = await resolveRepoConfig(sessionKey);
    analytics = await fetchRepositoryAnalytics(config);
  } catch (error) {
    console.warn('⚠️ [GitHubAI:detailedStatus] analytics load failed:', error?.message || error);
  }

  return buildDashboardPayload({ snapshot, analytics, settings });
};

const getDashboard = async (sessionKey, options = {}) => {
  const detailed = await getDetailedStatus(sessionKey, options);
  return {
    success: detailed.success,
    dashboard: detailed.dashboard,
    status: detailed.status,
    stats: detailed.stats,
    commits: detailed.commits,
    branches: detailed.branches,
    pulls: detailed.pulls,
    issues: detailed.issues,
    repository: detailed.repository,
    collaborators: detailed.collaborators,
    webhooks: detailed.webhooks,
    workflows: detailed.workflows,
    workflowRuns: detailed.workflowRuns,
    branchProtection: detailed.branchProtection,
    analytics: detailed.analytics,
    settings: detailed.settings,
    lastSynced: detailed.lastSynced,
    updatedAt: detailed.updatedAt,
  };
};

const ensureSnapshotFresh = async (sessionKey, { maxAgeMs, force } = {}) => {
  const resolvedKey = resolveSessionKey(sessionKey);
  const ttl = Number.isFinite(maxAgeMs) ? Math.max(maxAgeMs, MIN_POLLING_INTERVAL) : DEFAULT_POLLING_INTERVAL;

  if (force) {
    return refreshSnapshot(resolvedKey);
  }

  const currentState = await loadState(resolvedKey);
  const lastSyncedAt = currentState?.lastSynced ? Date.parse(currentState.lastSynced) : 0;
  const shouldRefresh = !currentState?.connected || !lastSyncedAt || Date.now() - lastSyncedAt > ttl;

  if (shouldRefresh) {
    try {
      return await refreshSnapshot(resolvedKey);
    } catch (error) {
      console.error('❌ GitHub snapshot refresh failed:', error?.message || error);
    }
  }

  if (currentState) {
    scheduleAutoRefreshIfNeeded(resolvedKey, currentState);
    return currentState;
  }

  return loadState(resolvedKey);
};

const getRealtimeState = async (sessionKey, options = {}) => {
  const state = await ensureSnapshotFresh(sessionKey, options);
  if (state) {
    return state;
  }
  return getStatus(sessionKey);
};

const formatSettingsForClient = (state) => {
  if (!state) {
    return {
      repoUrl: '',
      owner: undefined,
      repo: undefined,
      branch: 'main',
      autoSync: false,
      pollingIntervalMs: DEFAULT_POLLING_INTERVAL,
      tokenMasked: null,
      hasToken: false,
      lastSynced: null,
      updatedAt: null,
      autoCommit: false,
      autoMerge: false,
      webhookUrl: '',
      webhookSecretMasked: null,
      webhookConfigured: false,
      branchProtection: null,
    };
  }

  const settings = getEffectiveSettings(state);
  const pollingIntervalMs = normalizePollingInterval(settings.pollingIntervalMs ?? settings.pollingInterval ?? DEFAULT_POLLING_INTERVAL);

  return {
    repoUrl: settings.repoUrl || '',
    owner: settings.owner || state.owner,
    repo: settings.repo || state.repo,
    branch: settings.branch || state.status?.branch || 'main',
    autoSync: Boolean(settings.autoSync),
    pollingIntervalMs,
    tokenMasked: maskToken(settings.githubToken),
    hasToken: Boolean(settings.githubToken),
    lastSynced: state.lastSynced || null,
    updatedAt: settings.updatedAt || state.updatedAt || null,
    autoCommit: typeof settings.autoCommit === 'boolean' ? settings.autoCommit : Boolean(state.status?.autoCommit),
    autoMerge: typeof settings.autoMerge === 'boolean' ? settings.autoMerge : Boolean(state.status?.autoMerge),
    webhookUrl: settings.webhookUrl || '',
    webhookSecretMasked: maskSecret(settings.webhookSecret),
    webhookConfigured: Boolean(settings.webhookSecret),
    branchProtection: settings.branchProtection || null,
  };
};

const getSettings = async (sessionKey, preloadedState) => {
  const state = preloadedState || await getRealtimeState(sessionKey);
  return formatSettingsForClient(state);
};

const toggleSetting = async (sessionKey, key, value) => {
  const state = await updateState(sessionKey, (previous) => {
    const settings = {
      ...(previous.settings || {}),
      [key]: value,
      updatedAt: new Date().toISOString(),
    };

    return {
      ...previous,
      status: {
        ...(previous.status || {}),
        [key]: value,
      },
      settings,
    };
  });
  return { success: true, status: state.status };
};

const getFeedbackCollection = () => (firestore ? firestore.collection(FEEDBACK_COLLECTION) : null);

const recordFeedback = async ({ sessionKey, payload }) => {
  const collection = getFeedbackCollection();
  if (!collection) {
    return { success: false, error: 'Feedback storage unavailable' };
  }
  const doc = await collection.add({
    ...payload,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    sessionKey: resolveSessionKey(sessionKey)
  });
  return { success: true, id: doc.id };
};

const feedbackStats = async () => {
  const collection = getFeedbackCollection();
  if (!collection) {
    return { success: false, totals: { feedback: 0, bugs: 0, featureRequests: 0 } };
  }
  const snapshot = await collection.get();
  const totals = { feedback: 0, bugs: 0, featureRequests: 0 };
  snapshot.forEach((doc) => {
    const data = doc.data();
    totals.feedback += 1;
    if (data.type === 'bug') totals.bugs += 1;
    if (data.type === 'feature') totals.featureRequests += 1;
  });
  return { success: true, totals };
};

const saveSettings = async (sessionKey, payload = {}) => {
  const resolvedKey = resolveSessionKey(sessionKey);
  const input = typeof payload === 'object' && payload !== null ? payload : {};
  const updates = {};

  if (typeof input.repoUrl === 'string' && input.repoUrl.trim()) {
    updates.repoUrl = input.repoUrl.trim();
  }
  if (typeof input.owner === 'string' && input.owner.trim()) {
    updates.owner = input.owner.trim();
  }
  if (typeof input.repo === 'string' && input.repo.trim()) {
    updates.repo = input.repo.trim();
  }
  if (typeof input.branch === 'string' && input.branch.trim()) {
    updates.branch = input.branch.trim();
  }
  if (typeof input.autoSync === 'boolean') {
    updates.autoSync = input.autoSync;
  }
  if (typeof input.autoCommit === 'boolean') {
    updates.autoCommit = input.autoCommit;
  }
  if (typeof input.autoMerge === 'boolean') {
    updates.autoMerge = input.autoMerge;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'pollingIntervalMs')) {
    updates.pollingIntervalMs = normalizePollingInterval(input.pollingIntervalMs);
  } else if (Object.prototype.hasOwnProperty.call(input, 'pollingInterval')) {
    updates.pollingIntervalMs = normalizePollingInterval(input.pollingInterval);
  }
  if (typeof input.githubToken === 'string' && input.githubToken.trim()) {
    updates.githubToken = input.githubToken.trim();
  }
  if (typeof input.webhookUrl === 'string') {
    updates.webhookUrl = input.webhookUrl.trim();
  }
  if (Object.prototype.hasOwnProperty.call(input, 'webhookSecret')) {
    const secretRaw = typeof input.webhookSecret === 'string' ? input.webhookSecret.trim() : '';
    updates.webhookSecret = secretRaw.length > 0 ? secretRaw : null;
  }
  if (typeof input.branchProtection === 'object' && input.branchProtection !== null) {
    updates.branchProtection = input.branchProtection;
  } else if (Object.prototype.hasOwnProperty.call(input, 'branchProtectionRules')) {
    const rulesRaw = typeof input.branchProtectionRules === 'string' ? input.branchProtectionRules.trim() : '';
    if (!rulesRaw) {
      updates.branchProtection = null;
    } else {
      try {
        updates.branchProtection = JSON.parse(rulesRaw);
      } catch (error) {
        throw Object.assign(new Error('Branch protection rules must be valid JSON'), { status: 400, cause: error });
      }
    }
  }

  let parsedFromUrl = null;
  if (updates.repoUrl) {
    parsedFromUrl = parseRepoInput(updates.repoUrl);
  }

  const updatedState = await updateState(resolvedKey, (previous) => {
    const previousSettings = getEffectiveSettings(previous);
    const mergedSettings = {
      ...previousSettings,
      ...(parsedFromUrl
        ? { repoUrl: parsedFromUrl.repoUrl, owner: parsedFromUrl.owner, repo: parsedFromUrl.repo }
        : {}),
      ...(updates.owner ? { owner: updates.owner } : {}),
      ...(updates.repo ? { repo: updates.repo } : {}),
      ...(updates.branch ? { branch: updates.branch } : {}),
      ...(updates.pollingIntervalMs ? { pollingIntervalMs: updates.pollingIntervalMs } : {}),
      ...(typeof updates.autoSync === 'boolean' ? { autoSync: updates.autoSync } : {}),
      ...(typeof updates.autoCommit === 'boolean' ? { autoCommit: updates.autoCommit } : {}),
      ...(typeof updates.autoMerge === 'boolean' ? { autoMerge: updates.autoMerge } : {}),
      ...(updates.githubToken ? { githubToken: updates.githubToken } : {}),
      ...(typeof updates.webhookUrl !== 'undefined' ? { webhookUrl: updates.webhookUrl } : {}),
      ...(Object.prototype.hasOwnProperty.call(updates, 'webhookSecret')
        ? { webhookSecret: updates.webhookSecret }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(updates, 'branchProtection')
        ? { branchProtection: updates.branchProtection }
        : {}),
      updatedAt: new Date().toISOString(),
    };

    const status = {
      ...(previous.status || {}),
      remoteUrl: parsedFromUrl?.repoUrl || updates.repoUrl || previous.status?.remoteUrl,
    };

    if (updates.branch) {
      status.branch = updates.branch;
    }
    if (typeof updates.autoSync === 'boolean') {
      status.autoSync = updates.autoSync;
    }
    if (typeof updates.autoCommit === 'boolean') {
      status.autoCommit = updates.autoCommit;
    }
    if (typeof updates.autoMerge === 'boolean') {
      status.autoMerge = updates.autoMerge;
    }

    return {
      ...previous,
      repoUrl: parsedFromUrl?.repoUrl || updates.repoUrl || previous.repoUrl,
      owner: parsedFromUrl?.owner || updates.owner || previous.owner,
      repo: parsedFromUrl?.repo || updates.repo || previous.repo,
      status,
      settings: mergedSettings,
    };
  });

  if (updates.githubToken) {
    process.env.GITHUB_TOKEN = updates.githubToken;
  }

  let latestState = updatedState;
  if (updates.repoUrl || updates.owner || updates.repo || updates.branch) {
    try {
      latestState = await refreshSnapshot(resolvedKey);
    } catch (error) {
      console.warn('⚠️ [GitHubAI:saveSettings] refresh after save failed:', error?.message || error);
    }
  }

  scheduleAutoRefreshIfNeeded(resolvedKey, latestState);

  // Test by updating settings and verifying data refresh.
  return formatSettingsForClient(latestState);
};

const listOperationsChanges = async () => {
  const policy = getOperationsPolicy();
  const status = await gitCommands.getStatus();

  if (!status?.success) {
    throw Object.assign(new Error(status?.error || 'Unable to read git status'), { status: 500 });
  }

  const filesRaw = Array.isArray(status.files) ? status.files : [];
  const files = filesRaw.map((file) => {
    const pathValue = sanitizePathInput(file.path || '');
    const evaluation = evaluatePolicyForPath(pathValue, policy);
    return {
      path: pathValue,
      status: file.status,
      staged: Boolean(file.staged),
      modified: Boolean(file.modified),
      untracked: Boolean(file.untracked),
      allowed: evaluation.allowed,
      reason: evaluation.allowed ? null : evaluation.reason,
      anchor: resolvePolicyAnchor(pathValue, policy),
    };
  });

  const directoriesMap = new Map();
  for (const file of files) {
    const key = file.anchor;
    if (!directoriesMap.has(key)) {
      directoriesMap.set(key, { allowed: 0, blocked: 0, total: 0 });
    }
    const bucket = directoriesMap.get(key);
    bucket.total += 1;
    if (file.allowed) {
      bucket.allowed += 1;
    } else {
      bucket.blocked += 1;
    }
  }

  const directories = Array.from(directoriesMap.entries())
    .map(([pathValue, summary]) => ({ path: pathValue, ...summary }))
    .sort((a, b) => a.path.localeCompare(b.path));

  return {
    policy: {
      allowList: policy.allowList,
      denyList: policy.denyList,
      guidelines: policy.guidelines,
      baseBranch: policy.baseBranch,
    },
    branch: status.branch,
    aheadBehind: status.aheadBehind,
    summary: {
      total: files.length,
      allowed: files.filter((file) => file.allowed).length,
      blocked: files.filter((file) => !file.allowed).length,
    },
    files,
    directories,
  };
};

const ensureBranchFresh = async (branchName, baseBranch) => {
  const branches = await gitCommands.getBranches();
  if (branches?.success && Array.isArray(branches.local)) {
    const exists = branches.local.some((entry) => entry.name === branchName);
    if (exists) {
      await gitCommands.deleteBranch(branchName, { force: true });
    }
  }

  const createResult = await gitCommands.createBranch(branchName, baseBranch);
  if (!createResult?.success) {
    throw Object.assign(new Error(createResult?.error || 'Unable to create branch'), { status: 500 });
  }

  return createResult;
};

const normalizeBranchName = (input) => {
  if (typeof input !== 'string') {
    return '';
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return '';
  }
  const sanitized = trimmed
    .replace(/[^A-Za-z0-9._\-/]/g, '-')
    .replace(/-+/g, '-')
    .replace(/\/+\/+/g, '/')
    .replace(/^-+|-+$/g, '');
  return sanitized.slice(0, 120);
};

const createOperationsPullRequest = async (sessionKey, payload = {}) => {
  const policy = getOperationsPolicy();
  const config = await resolveRepoConfig(sessionKey);
  const token = payload.token || config.token;

  if (!token) {
    throw Object.assign(new Error('GitHub token missing for operations PR'), { status: 401 });
  }

  const baseBranchRaw = typeof payload.baseBranch === 'string' && payload.baseBranch.trim().length > 0
    ? payload.baseBranch.trim()
    : policy.baseBranch;
  const baseBranch = normalizeBranchName(baseBranchRaw) || policy.baseBranch;

  const branchName = normalizeBranchName(payload.branchName || `ops/${Date.now()}`);
  if (!branchName) {
    throw Object.assign(new Error('Branch name is required'), { status: 400 });
  }

  const commitMessage = typeof payload.commitMessage === 'string' && payload.commitMessage.trim().length > 0
    ? payload.commitMessage.trim()
    : null;
  if (!commitMessage) {
    throw Object.assign(new Error('Commit message is required'), { status: 400 });
  }

  const requestedPaths = sanitizePathList(payload.files || payload.paths);
  if (requestedPaths.length === 0) {
    throw Object.assign(new Error('Select at least one file or directory to include in the PR'), { status: 400 });
  }

  const violations = requestedPaths
    .map((pathValue) => ({ path: pathValue, evaluation: evaluatePolicyForPath(pathValue, policy) }))
    .filter((entry) => !entry.evaluation.allowed);

  if (violations.length > 0) {
    const details = violations.map((entry) => `${entry.path}: ${entry.evaluation.reason}`).join('\n');
    throw Object.assign(new Error(`Some paths are not allowed:\n${details}`), { status: 403, details: violations });
  }

  await gitCommands.switchBranch(baseBranch);
  await gitCommands.pull({ branch: baseBranch, token });
  await ensureBranchFresh(branchName, baseBranch);

  let commitHash = null;

  try {
    const addResult = await gitCommands.addFiles(requestedPaths);
    if (!addResult?.success) {
      throw Object.assign(new Error(addResult?.error || 'Unable to stage files'), { status: 500 });
    }

    const commitResult = await gitCommands.commit(commitMessage);
    if (!commitResult?.success) {
      const message = commitResult?.error || 'Unable to create commit';
      const statusCode = /nothing to commit/i.test(message) ? 409 : 500;
      throw Object.assign(new Error(message), { status: statusCode });
    }
    commitHash = commitResult.hash || null;

    const pushResult = await gitCommands.push({ branch: branchName, token });
    if (!pushResult?.success) {
      throw Object.assign(new Error(pushResult?.error || 'Unable to push branch'), { status: 502 });
    }

    const octokit = getOctokit(token);
    const prTitle = typeof payload.prTitle === 'string' && payload.prTitle.trim().length > 0
      ? payload.prTitle.trim()
      : commitMessage;
    const prBody = typeof payload.prBody === 'string' ? payload.prBody : '';

    const prResponse = await octokit.pulls.create({
      owner: config.owner,
      repo: config.repo,
      title: prTitle,
      head: branchName,
      base: baseBranch,
      body: prBody,
    });

    const headSha = prResponse.data.head.sha;
    const [combinedStatus, checkRuns] = await Promise.all([
      octokit.repos.getCombinedStatusForRef({ owner: config.owner, repo: config.repo, ref: headSha }),
      octokit.checks.listForRef({ owner: config.owner, repo: config.repo, ref: headSha, per_page: 20 }),
    ]);

    const warnings = [];
    const status = await gitCommands.getStatus();
    if (status?.success && Array.isArray(status.files)) {
      const unstaged = status.files.filter((file) => !file.staged);
      if (unstaged.length > 0) {
        warnings.push({
          type: 'unstaged',
          message: `${unstaged.length} files remain unstaged after commit`,
          files: unstaged.map((file) => file.path),
        });
      }
    }

    return {
      branch: branchName,
      baseBranch,
      commit: { hash: commitHash },
      pr: {
        number: prResponse.data.number,
        url: prResponse.data.html_url,
        title: prResponse.data.title,
        state: prResponse.data.state,
      },
      ci: {
        state: combinedStatus?.data?.state,
        statuses: Array.isArray(combinedStatus?.data?.statuses)
          ? combinedStatus.data.statuses.map((statusEntry) => ({
              context: statusEntry.context,
              state: statusEntry.state,
              targetUrl: statusEntry.target_url,
              description: statusEntry.description,
              updatedAt: statusEntry.updated_at,
            }))
          : [],
        checks: Array.isArray(checkRuns?.data?.check_runs)
          ? checkRuns.data.check_runs.map((run) => ({
              id: run.id,
              name: run.name,
              status: run.status,
              conclusion: run.conclusion,
              startedAt: run.started_at,
              completedAt: run.completed_at,
              url: run.html_url,
            }))
          : [],
      },
      warnings,
    };
  } finally {
    await gitCommands.switchBranch(baseBranch).catch((error) => {
      console.warn('⚠️ Failed to switch back to base branch after operations PR:', error?.message || error);
    });
  }
};

const listOperationsPullRequests = async (sessionKey, { token, limit = 5 } = {}) => {
  const config = await resolveRepoConfig(sessionKey);
  const resolvedToken = token || config.token;
  if (!resolvedToken) {
    throw Object.assign(new Error('GitHub token missing for PR status fetch'), { status: 401 });
  }

  const octokit = getOctokit(resolvedToken);
  const { data: pulls } = await octokit.pulls.list({
    owner: config.owner,
    repo: config.repo,
    state: 'open',
    per_page: Math.min(Math.max(limit, 1), 20),
  });

  const enriched = await Promise.all(
    pulls.map(async (pull) => {
      try {
        const status = await octokit.repos.getCombinedStatusForRef({
          owner: config.owner,
          repo: config.repo,
          ref: pull.head.sha,
        });
        return {
          number: pull.number,
          title: pull.title,
          url: pull.html_url,
          headRef: pull.head.ref,
          headSha: pull.head.sha,
          state: pull.state,
          ciState: status.data.state,
          statuses: status.data.statuses?.map((entry) => ({
            context: entry.context,
            state: entry.state,
            targetUrl: entry.target_url,
            description: entry.description,
          })) || [],
        };
      } catch (error) {
        console.warn('⚠️ Failed to load status for PR', pull.number, error?.message || error);
        return {
          number: pull.number,
          title: pull.title,
          url: pull.html_url,
          headRef: pull.head.ref,
          headSha: pull.head.sha,
          state: pull.state,
          ciState: 'unknown',
          statuses: [],
        };
      }
    })
  );

  return {
    pulls: enriched,
    count: enriched.length,
  };
};

const getOperationsMetrics = async (sessionKey, { token } = {}) => {
  const config = await resolveRepoConfig(sessionKey);
  const resolvedToken = token || config.token;
  if (!resolvedToken) {
    throw Object.assign(new Error('GitHub token missing for metrics fetch'), { status: 401 });
  }

  const octokit = getOctokit(resolvedToken);
  const [pullsResponse, workflowsResponse, bundle] = await Promise.all([
    octokit.pulls.list({ owner: config.owner, repo: config.repo, state: 'all', per_page: 30 }),
    octokit.actions.listWorkflowRunsForRepo({ owner: config.owner, repo: config.repo, per_page: 50 }),
    getBundleMetrics(),
  ]);

  const pulls = pullsResponse?.data || [];
  const totalPrs = pulls.length;
  const mergedCount = pulls.filter((pr) => pr.merged_at).length;
  const prMergeRate = totalPrs > 0 ? mergedCount / totalPrs : null;

  const workflowRuns = workflowsResponse?.data?.workflow_runs || [];
  const ciRuns = workflowRuns.filter((run) => /(ci|build|test)/i.test(run.name || ''));
  const ciSuccess = ciRuns.filter((run) => run.conclusion === 'success').length;
  const ciPassRatio = ciRuns.length > 0 ? ciSuccess / ciRuns.length : null;

  const lintRuns = workflowRuns
    .filter((run) => /(lint|eslint)/i.test(run.name || run.display_title || ''))
    .slice(0, 10)
    .map((run) => ({
      id: run.id,
      name: run.name,
      conclusion: run.conclusion || run.status,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
      headSha: run.head_sha,
    }));

  return {
    prMergeRate,
    ciPassRatio,
    bundle,
    eslintTrend: {
      recent: lintRuns,
      failing: lintRuns.filter((run) => run.conclusion && run.conclusion !== 'success').length,
    },
    fetchedAt: new Date().toISOString(),
  };
};

const runSandboxSmokeTest = async (sessionKey, { token, note } = {}) => {
  const resolvedToken = token || (await resolveRepoConfig(sessionKey)).token;
  if (!resolvedToken) {
    throw Object.assign(new Error('GitHub token missing for sandbox smoke test'), { status: 401 });
  }

  const owner = process.env.GITHUB_SANDBOX_OWNER || process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_SANDBOX_REPO || process.env.GITHUB_REPO_NAME;

  if (!owner || !repo) {
    throw Object.assign(new Error('Sandbox repository is not configured'), { status: 412 });
  }

  const octokit = getOctokit(resolvedToken);
  const repoDetails = await octokit.repos.get({ owner, repo });
  const baseBranch = process.env.GITHUB_SANDBOX_BASE_BRANCH || repoDetails.data.default_branch || 'main';
  const baseRef = await octokit.git.getRef({ owner, repo, ref: `heads/${baseBranch}` });
  const branchName = `ai-smoke-${new Date().toISOString().replace(/[:.]/g, '').replace('T', '-').slice(0, 20)}-${randomUUID().slice(0, 6)}`;

  await octokit.git.createRef({ owner, repo, ref: `refs/heads/${branchName}`, sha: baseRef.data.object.sha });

  const filePath = `sandbox/smoke-${new Date().toISOString().split('T')[0]}-${randomUUID().slice(0, 4)}.md`;
  const contentLines = [
    '# Sandbox smoke test',
    `- Timestamp: ${new Date().toISOString()}`,
    '- Trigger: AI Operations panel',
    note ? `- Note: ${note}` : null,
  ].filter(Boolean);

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: `chore(smoke): verify sandbox pipeline for ${filePath}`,
    content: Buffer.from(`${contentLines.join('\n')}\n`).toString('base64'),
    branch: branchName,
  });

  const prTitle = `chore(smoke): sandbox verification ${new Date().toISOString()}`;
  const prBody = [
    'Automated smoke test triggered from the AI operations panel.',
    '',
    `- Branch: \`${branchName}\``,
    `- File: \`${filePath}\``,
  ].join('\n');

  const prResponse = await octokit.pulls.create({
    owner,
    repo,
    title: prTitle,
    head: branchName,
    base: baseBranch,
    body: prBody,
  });

  return {
    branch: branchName,
    file: filePath,
    pr: {
      number: prResponse.data.number,
      url: prResponse.data.html_url,
      state: prResponse.data.state,
    },
  };
};

module.exports = {
  resolveRepoConfig,
  refreshSnapshot,
  ensureSnapshotFresh,
  getRealtimeState,
  getCommits,
  getBranches,
  getIssuesStats,
  createIssue,
  closeIssue,
  listWebhooks,
  deleteWebhook,
  updateWebhook,
  rotateWebhookSecret,
  ensureCollaboratorAccess,
  ensureWebhookConfigured,
  ensureRepositoryMetadata,
  ensureBranchProtectionRules,
  getDashboard,
  getDetailedStatus,
  toggleSetting,
  recordFeedback,
  feedbackStats,
  loadState,
  getSettings,
  saveSettings,
  getOperationsPolicy,
  listOperationsChanges,
  createOperationsPullRequest,
  listOperationsPullRequests,
  getOperationsMetrics,
  runSandboxSmokeTest,
};

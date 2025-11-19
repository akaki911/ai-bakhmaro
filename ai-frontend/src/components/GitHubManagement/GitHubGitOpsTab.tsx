// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
  GitBranch,
  GitCommit,
  Plus,
  Minus,
  RefreshCw,
  Upload,
  Eye,
  Edit,
  AlertTriangle,
  Clock,
  User,
  FileText,
  Zap,
  History,
  Code,
  RotateCcw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { EmptyState } from '../EmptyState';
import type { GitHubStatus } from './GitHubManagementHub';
import type {
  GitHubDataState,
  GitHubStats,
  GitHubCommitSummary
} from './hooks/useGitHubData';
import { buildAdminHeaders } from '../../utils/adminToken';

type MessageType = 'success' | 'error';
type SubTabKey = 'workspace' | 'history' | 'branches' | 'files';

interface GitHubGitOpsTabProps {
  status: GitHubStatus | null;
  loading: boolean;
  showMessage: (type: MessageType, text: string) => void;
  refetch: () => void;
  data?: GitHubDataState | null;
  error?: string | null;
  isLoading?: boolean;
  repo: string;
}

interface FileStatus {
  path: string;
  status: string;
  staged: boolean;
  modified: boolean;
  untracked: boolean;
}

interface GitStatus {
  branch: string;
  files: FileStatus[];
  hasChanges: boolean;
  clean: boolean;
}

interface Commit {
  hash: string;
  fullHash: string;
  author: string;
  email: string;
  date: Date;
  message: string;
  parents: string[];
  isMerge: boolean;
}

interface Branch {
  name: string;
  hash?: string;
  current: boolean;
  type: 'local' | 'remote';
  ahead?: number;
  behind?: number;
}

interface FileVersion {
  hash: string;
  author: string;
  timestamp: string;
  message: string;
  changes: {
    added: number;
    deleted: number;
    modified: number;
  };
  size: number;
}

interface DiffLine {
  type: 'added' | 'removed' | 'context';
  content: string;
  lineNumber: number;
}

const DEFAULT_BRANCH = 'main';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

interface JsonOnceResult<T = unknown> {
  status: number;
  ok: boolean;
  ct: string;
  data: T | null;
}

const normalizeHeadersInit = (headers?: HeadersInit): Record<string, string> => {
  if (headers == null) {
    return {};
  }

  if (headers instanceof Headers) {
    return Array.from(headers.entries()).reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  }

  if (Array.isArray(headers)) {
    return headers.reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  }

  return { ...headers };
};

const hasHeader = (headers: Record<string, string>, name: string): boolean =>
  Object.keys(headers).some((key) => key.toLowerCase() === name.toLowerCase());

const withAdminHeaders = (options: RequestInit = {}): RequestInit => {
  const normalized = normalizeHeadersInit(options.headers);

  if (hasHeader(normalized, 'Accept') === false) {
    normalized.Accept = 'application/json';
  }

  const headers = buildAdminHeaders(normalized);

  return {
    ...options,
    headers,
    credentials: options.credentials ?? 'include'
  };
};

const isAbortError = (error: unknown): boolean =>
  Boolean(
    error &&
      typeof error === 'object' &&
      'name' in error &&
      (error as { name?: string }).name === 'AbortError'
  );

async function getJsonOnce<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<JsonOnceResult<T>> {
  const res = await fetch(input, withAdminHeaders(init));
  const status = res.status;
  const ok = res.ok;
  const ct = res.headers.get('content-type') || '';

  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch (error) {
    const contentType = ct.toLowerCase();
    if (status !== 204 && contentType.includes('json')) {
      throw error;
    }
  }

  return { status, ok, ct, data };
}

const toStringOrUndefined = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

const toNumberOrUndefined = (value: unknown): number | undefined =>
  typeof value === 'number' && !Number.isNaN(value) ? value : undefined;

const normalizeFileStatus = (input: unknown): FileStatus | null => {
  if (!isRecord(input)) {
    return null;
  }

  const path = toStringOrUndefined(input.path);
  const status = toStringOrUndefined(input.status) ?? 'modified';

  if (!path) {
    return null;
  }

  return {
    path,
    status,
    staged: Boolean(input.staged),
    modified: Boolean(input.modified),
    untracked: Boolean(input.untracked)
  };
};

const normalizeGitStatusResponse = (input: unknown): GitStatus | null => {
  if (!isRecord(input)) {
    return null;
  }

  const filesRaw = Array.isArray(input.files) ? input.files : [];
  const files = filesRaw.map(normalizeFileStatus).filter(Boolean) as FileStatus[];

  const branch = toStringOrUndefined(input.branch) ?? toStringOrUndefined(input.current) ?? DEFAULT_BRANCH;
  const hasChanges = typeof input.hasChanges === 'boolean' ? input.hasChanges : files.length > 0;
  const clean = typeof input.clean === 'boolean' ? input.clean : !hasChanges;

  return {
    branch,
    files,
    hasChanges,
    clean
  };
};

const parseAuthor = (value: unknown): { name: string; email?: string } => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return { name: value };
  }

  if (isRecord(value)) {
    const name = toStringOrUndefined(value.name) ?? toStringOrUndefined(value.login) ?? 'Unknown Author';
    const email = toStringOrUndefined(value.email);
    return email ? { name, email } : { name };
  }

  return { name: 'Unknown Author' };
};

const parseCommitDate = (value: unknown): Date => {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
};

const normalizeCommitResponse = (input: unknown): Commit | null => {
  if (!isRecord(input)) {
    return null;
  }

  const authorDetails = parseAuthor(input.author);
  const email = toStringOrUndefined(input.email) ?? authorDetails.email ?? 'unknown@example.com';
  const rawFullHash = toStringOrUndefined(input.fullHash) ?? toStringOrUndefined(input.sha);
  const rawHash = toStringOrUndefined(input.hash);
  const fullHash = rawFullHash ?? rawHash ?? 'unknown';
  const hash = rawHash ?? (fullHash.length >= 7 ? fullHash.slice(0, 7) : fullHash);
  const date = parseCommitDate(input.date);
  const message = toStringOrUndefined(input.message) ?? 'No commit message';
  const parents = Array.isArray(input.parents) ? input.parents.map(String) : [];
  const isMerge = typeof input.isMerge === 'boolean' ? input.isMerge : parents.length > 1;

  return {
    hash,
    fullHash,
    author: authorDetails.name,
    email,
    date,
    message,
    parents,
    isMerge
  };
};

const normalizeBranch = (input: unknown, type: Branch['type']): Branch | null => {
  if (!isRecord(input)) {
    return null;
  }

  const name = toStringOrUndefined(input.name);
  if (!name) {
    return null;
  }

  const branch: Branch = {
    name,
    current: type === 'local' ? Boolean(input.current) : false,
    type
  };

  const hash = toStringOrUndefined(input.hash);
  if (hash) {
    branch.hash = hash;
  }

  const ahead = toNumberOrUndefined(input.ahead);
  if (ahead !== undefined) {
    branch.ahead = ahead;
  }

  const behind = toNumberOrUndefined(input.behind);
  if (behind !== undefined) {
    branch.behind = behind;
  }

  return branch;
};

const createEmptyBranchState = (): { local: Branch[]; remote: Branch[]; current: string } => ({
  local: [],
  remote: [],
  current: DEFAULT_BRANCH
});

const normalizeBranchCollectionFromHook = (collection: unknown): { local: Branch[]; remote: Branch[]; current: string } => {
  if (!collection) {
    return createEmptyBranchState();
  }

  if (Array.isArray(collection)) {
    const local = collection.map(item => normalizeBranch(item, 'local')).filter(Boolean) as Branch[];
    const current = local.find(branch => branch.current)?.name ?? DEFAULT_BRANCH;
    return {
      local,
      remote: [],
      current
    };
  }

  if (!isRecord(collection)) {
    return createEmptyBranchState();
  }

  const localRaw = collection.local;
  const remoteRaw = collection.remote;

  const local = Array.isArray(localRaw)
    ? localRaw.map(item => normalizeBranch(item, 'local')).filter(Boolean) as Branch[]
    : [];

  const remote = Array.isArray(remoteRaw)
    ? remoteRaw.map(item => normalizeBranch(item, 'remote')).filter(Boolean) as Branch[]
    : [];

  const current =
    toStringOrUndefined(collection.current) ??
    toStringOrUndefined(collection.branch) ??
    local.find(branch => branch.current)?.name ??
    DEFAULT_BRANCH;

  return { local, remote, current };
};

const extractRecentFiles = (input: unknown): string[] => {
  if (!isRecord(input) || !Array.isArray(input.files)) {
    return [];
  }

  return input.files
    .map(file => (typeof file === 'string' ? file : String(file)))
    .filter((file): file is string => Boolean(file));
};

const normalizeFileVersionResponse = (input: unknown): FileVersion | null => {
  if (!isRecord(input)) {
    return null;
  }

  const hash = toStringOrUndefined(input.hash) ?? 'unknown';
  const author = toStringOrUndefined(input.author) ?? 'Unknown Author';

  const timestampValue = input.timestamp;
  let timestamp: string;
  if (timestampValue instanceof Date) {
    timestamp = timestampValue.toISOString();
  } else if (typeof timestampValue === 'string') {
    timestamp = timestampValue;
  } else if (typeof timestampValue === 'number') {
    const parsed = new Date(timestampValue);
    timestamp = Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  } else {
    timestamp = new Date().toISOString();
  }

  const message = toStringOrUndefined(input.message) ?? 'No message';

  const changesRecord = isRecord(input.changes) ? input.changes : {};
  const added = toNumberOrUndefined(changesRecord.added) ?? 0;
  const deleted = toNumberOrUndefined(changesRecord.deleted) ?? 0;
  const modified = toNumberOrUndefined(changesRecord.modified) ?? 0;

  const size = toNumberOrUndefined(input.size) ?? 0;

  return {
    hash,
    author,
    timestamp,
    message,
    changes: {
      added,
      deleted,
      modified
    },
    size
  };
};

const normalizeDiffLineResponse = (input: unknown): DiffLine | null => {
  if (!isRecord(input)) {
    return null;
  }

  const content = toStringOrUndefined(input.content);
  if (!content) {
    return null;
  }

  const typeValue = toStringOrUndefined(input.type);
  const type: DiffLine['type'] = typeValue === 'added' || typeValue === 'removed' ? typeValue : 'context';
  const lineNumber = toNumberOrUndefined(input.lineNumber) ?? 0;

  return {
    type,
    content,
    lineNumber
  };
};

const GitHubGitOpsTab: React.FC<GitHubGitOpsTabProps> = ({
  status: hubStatus,
  loading: hubLoading,
  showMessage,
  refetch,
  data,
  error,
  isLoading,
  repo,
}) => {
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [branchCollections, setBranchCollections] = useState(createEmptyBranchState);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<SubTabKey>('workspace');
  const [commitMessage, setCommitMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [fileVersions, setFileVersions] = useState<FileVersion[]>([]);
  const [showDiffViewer, setShowDiffViewer] = useState(false);
  const [diffData, setDiffData] = useState<DiffLine[]>([]);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [pushState, setPushState] = useState<{
    status: 'idle' | 'running' | 'success' | 'error';
    logs: string[];
    metadata?: { branch?: string; remote?: string; commit?: string | null };
  }>({ status: 'idle', logs: [] });
  const [zipUploadState, setZipUploadState] = useState<{
    status: 'idle' | 'running' | 'success' | 'error';
    message?: string;
  }>({ status: 'idle' });
  const [workspaceMeta, setWorkspaceMeta] = useState<{ path?: string; type?: string } | null>(null);

  const resolveRepoValue = useCallback(() => (typeof repo === 'string' && repo.trim() ? repo.trim() : 'local'), [repo]);

  const buildRepoQuery = useCallback(
    (extra: Record<string, string | number | boolean | undefined> = {}) => {
      const params = new URLSearchParams();
      params.set('repo', resolveRepoValue());
      Object.entries(extra).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, String(value));
        }
      });
      return params.toString();
    },
    [resolveRepoValue],
  );

  const withRepo = useCallback(
    (payload: Record<string, unknown> = {}) => ({
      repo: resolveRepoValue(),
      ...payload,
    }),
    [resolveRepoValue],
  );

  const withRepoQuery = useCallback(
    (url: string, extra: Record<string, string | number | boolean | undefined> = {}) => {
      const query = buildRepoQuery(extra);
      return url.includes('?') ? `${url}&${query}` : `${url}?${query}`;
    },
    [buildRepoQuery],
  );

  const repoValue = resolveRepoValue();
  const isLocalRepo = repoValue === 'local';

  const broadcastWorkspaceContext = useCallback(
    (meta: { path?: string; type?: string } | null) => {
      if (typeof window === 'undefined') {
        return;
      }
      try {
        window.dispatchEvent(
          new CustomEvent('workspace:repo-changed', {
            detail: {
              repo: resolveRepoValue(),
              workspace: meta,
              updatedAt: Date.now(),
            },
          }),
        );
      } catch (error) {
        console.warn('workspace:repo-changed event failed:', error);
      }
    },
    [resolveRepoValue],
  );

  const updateWorkspaceContext = useCallback(
    (input: unknown) => {
      if (isRecord(input)) {
        const normalizedMeta = {
          path: toStringOrUndefined(input.path),
          type: toStringOrUndefined(input.type),
        };
        setWorkspaceMeta(normalizedMeta);
        broadcastWorkspaceContext(normalizedMeta);
        return;
      }
      setWorkspaceMeta(null);
      broadcastWorkspaceContext(null);
    },
    [broadcastWorkspaceContext],
  );

  const logPushEvent = useCallback((message: string) => {
    setPushState((prev) => ({
      ...prev,
      logs: [...prev.logs, message],
    }));
  }, []);
  const [rollbackLoading, setRollbackLoading] = useState<string | null>(null);
  const [newBranchName, setNewBranchName] = useState('');
  const [showCreateBranch, setShowCreateBranch] = useState(false);

  const branchesFromHook = Array.isArray(data?.branches) ? data?.branches ?? [] : [];
  const commitsFromHook = Array.isArray(data?.commits) ? data?.commits ?? [] : [];
  const workflowsFromHook = Array.isArray(data?.workflows) ? data?.workflows ?? [] : [];
  const reposFromHook = Array.isArray(data?.repos) ? data?.repos ?? [] : [];
  const pullsFromHook = Array.isArray(data?.pulls) ? data?.pulls ?? [] : [];
  const statsFromHook =
    data?.stats && typeof data.stats === 'object'
      ? data.stats
      : { prs: 0, issues: 0, stars: 0, forks: 0 };

  const [selectedFromVersion, setSelectedFromVersion] = useState<string>('');
  const [selectedToVersion, setSelectedToVersion] = useState<string>('');

  const isDataLoaded = data?.isLoaded ?? (
    reposFromHook.length > 0 ||
    branchesFromHook.length > 0 ||
    workflowsFromHook.length > 0 ||
    pullsFromHook.length > 0 ||
    commitsFromHook.length > 0
  );

  const gitStatusFiles = Array.isArray(gitStatus?.files) ? gitStatus.files : [];
  const localBranches = Array.isArray(branchCollections?.local) ? branchCollections.local : [];
  const normalizedStats = {
    prs: Number(statsFromHook?.prs ?? 0),
    issues: Number(statsFromHook?.issues ?? 0),
    stars: Number(statsFromHook?.stars ?? 0),
    forks: Number(statsFromHook?.forks ?? 0)
  };
  const hookCounts = {

    branches: branchesFromHook.length,
    commits: commitsFromHook.length,
    workflows: workflowsFromHook.length,
    repos: reposFromHook.length
  };
  const commitCount = commits.length > 0 ? commits.length : hookCounts.commits;

  const loadGitStatus = useCallback(async () => {
    try {
      const { ok, data } = await getJsonOnce(withRepoQuery('/api/ai/git/status'));
      if (!ok) {
        const errorMessage =
          (isRecord(data) && typeof data.error === 'string' && data.error) ||
          'Unable to load git status.';
        setWorkspaceError(errorMessage);
        updateWorkspaceContext(isRecord(data) ? data.workspace : null);
        return;
      }

      if (isRecord(data)) {
        updateWorkspaceContext(data.workspace ?? null);
      } else {
        updateWorkspaceContext(null);
      }
      setWorkspaceError(null);

      const normalizedStatus = normalizeGitStatusResponse(data);
      if (normalizedStatus) {
        setGitStatus(normalizedStatus);
      }
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      console.error('Failed to load git status:', error);
      const fallback = 'Unable to load git status.';
      setWorkspaceError(fallback);
      showMessage('error', fallback);
    }
  }, [showMessage, updateWorkspaceContext, withRepoQuery]);

  const loadCommitHistory = useCallback(async () => {
    try {
      const { ok, data } = await getJsonOnce(withRepoQuery('/api/ai/git/log', { limit: 20 }));
      if (!ok || !isRecord(data)) {
        return [];
      }

      const commits = Array.isArray(data.commits) ? data.commits : [];
      const normalizedCommits = commits
        .map(normalizeCommitResponse)
        .filter(Boolean) as Commit[];
      setCommits(normalizedCommits);
      return normalizedCommits;
    } catch (error) {
      if (isAbortError(error)) {
        return [];
      }
      console.error('Failed to load commit history:', error);
      return [];
    }
  }, [withRepoQuery]);

  const loadBranches = useCallback(async () => {
    try {
      const { ok, data } = await getJsonOnce(withRepoQuery('/api/ai/git/branches'));
      if (!ok) {
        return;
      }

      setBranchCollections(normalizeBranchCollectionFromHook(data));
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      console.error('Failed to load branches:', error);
    }
  }, [withRepoQuery]);

  const loadRecentFiles = useCallback(async () => {
    try {
      const { ok, data } = await getJsonOnce('/api/ai/version-control/recent-files');
      if (!ok) {
        return;
      }

      setRecentFiles(extractRecentFiles(data));
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      console.error('Recent files loading error:', error);
    }
  }, []);

  useEffect(() => {
    setGitStatus(null);
    setCommits([]);
    setBranchCollections(createEmptyBranchState());
    setWorkspaceMeta(null);
    setWorkspaceError(null);
    setPushState({ status: 'idle', logs: [] });
    setZipUploadState({ status: 'idle' });
  }, [repoValue]);

  useEffect(() => {
    loadGitStatus();
    loadCommitHistory();
    loadBranches();
    loadRecentFiles();
  }, [loadGitStatus, loadCommitHistory, loadBranches, loadRecentFiles]);

  const loadFileHistory = async (filePath: string) => {
    try {
      const { ok, data } = await getJsonOnce(
        `/api/ai/version-control/history/${encodeURIComponent(filePath)}`
      );
      if (!ok || !isRecord(data)) {
        showMessage('error', 'áƒ¤áƒáƒ˜áƒšáƒ˜áƒ¡ áƒ˜áƒ¡áƒ¢áƒáƒ áƒ˜áƒ˜áƒ¡ áƒ©áƒáƒ¢áƒ•áƒ˜áƒ áƒ—áƒ•áƒ˜áƒ¡ áƒ¨áƒ”áƒªáƒ“áƒáƒ›áƒ');
        return;
      }

      const versions = Array.isArray(data.versions) ? data.versions : [];
      const normalizedVersions = versions
        .map(normalizeFileVersionResponse)
        .filter(Boolean) as FileVersion[];
      setFileVersions(normalizedVersions);
      setSelectedFile(filePath);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      console.error('Failed to load file history:', error);
      showMessage('error', 'áƒ¤áƒáƒ˜áƒšáƒ˜áƒ¡ áƒ˜áƒ¡áƒ¢áƒáƒ áƒ˜áƒ˜áƒ¡ áƒ©áƒáƒ¢áƒ•áƒ˜áƒ áƒ—áƒ•áƒ˜áƒ¡ áƒ¨áƒ”áƒªáƒ“áƒáƒ›áƒ');
    }
  };

  const loadDiff = async (fromVersion: string, toVersion: string, filePath: string) => {
    setSelectedFromVersion(fromVersion);
    setSelectedToVersion(toVersion);
    try {
      const { ok, data } = await getJsonOnce('/api/ai/version-control/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath,
          fromVersion,
          toVersion
        })
      });

      if (!ok || !isRecord(data)) {
        showMessage('error', 'Diff-áƒ˜áƒ¡ áƒ’áƒ”áƒœáƒ”áƒ áƒáƒªáƒ˜áƒ˜áƒ¡ áƒ¨áƒ”áƒªáƒ“áƒáƒ›áƒ');
        return;
      }

      const diffLines = Array.isArray(data.diff)
        ? data.diff.map(normalizeDiffLineResponse).filter(Boolean) as DiffLine[]
        : [];
      setDiffData(diffLines);
      setShowDiffViewer(true);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      console.error('Failed to generate diff:', error);
      showMessage('error', 'Diff-áƒ˜áƒ¡ áƒ’áƒ”áƒœáƒ”áƒ áƒáƒªáƒ˜áƒ˜áƒ¡ áƒ¨áƒ”áƒªáƒ“áƒáƒ›áƒ');
    }
  };

  const rollbackToVersion = async (filePath: string, version: string) => {
    setRollbackLoading(version);
    try {
      const { ok, data } = await getJsonOnce('/api/ai/version-control/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath,
          version
        })
      });

      if (ok) {
        const message = isRecord(data) && typeof data?.message === 'string'
          ? data.message
          : 'Rollback áƒ¬áƒáƒ áƒ›áƒáƒ¢áƒ”áƒ‘áƒ˜áƒ— áƒ¨áƒ”áƒ¡áƒ áƒ£áƒšáƒ“áƒ';
        showMessage('success', message);
        loadFileHistory(filePath);
        refetch();
      } else {
        const errorMessage =
          (isRecord(data) && typeof data?.error === 'string' && data.error) ||
          'Rollback áƒ¨áƒ”áƒªáƒ“áƒáƒ›áƒ';
        showMessage('error', errorMessage);
      }
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      console.error('Failed to rollback file version:', error);
      showMessage('error', 'Rollback áƒ¨áƒ”áƒªáƒ“áƒáƒ›áƒ');
    } finally {
      setRollbackLoading(null);
    }
  };

  const stageFiles = async (files: string[], action: 'stage' | 'unstage' = 'stage') => {
    if (!Array.isArray(files) || files.length === 0) {
      return;
    }
    setActionLoading(true);
    setWorkspaceError(null);
    try {
      const response = await fetch(
        action === 'stage' ? '/api/ai/git/add' : '/api/ai/git/unstage',
        withAdminHeaders({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(withRepo({ files }))
        })
      );

      if (response.ok) {
        await loadGitStatus();
        showMessage('success', action === 'stage'
          ? 'Files added to staging.'
          : 'Files moved back to unstaged.');
      } else {
        const payload = await response.json().catch(() => null);
        const errorMessage =
          (payload && typeof payload.error === 'string' && payload.error) ||
          'Unable to update file status.';
        setWorkspaceError(errorMessage);
        showMessage('error', errorMessage);
      }
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      console.error('Failed to stage files:', error);
      const fallback =
        action === 'stage'
          ? 'Staging operation failed.'
          : 'Unstage operation failed.';
      setWorkspaceError(fallback);
      showMessage('error', fallback);
    } finally {
      setActionLoading(false);
    }
  };

  const commitChanges = async () => {
    if (!commitMessage.trim()) {
      setWorkspaceError('Please enter a commit message.');
      return;
    }

    setActionLoading(true);
    setWorkspaceError(null);
    try {
      const response = await fetch(
        '/api/ai/git/commit',
        withAdminHeaders({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(withRepo({ message: commitMessage.trim() }))
        })
      );

      const payload = await response.json().catch(() => null);

      if (response.ok) {
        setCommitMessage('');
        await loadGitStatus();
        await loadCommitHistory();
        showMessage('success', 'Commit completed successfully.');
      } else {
        const errorMessage =
          (payload && typeof payload.error === 'string' && payload.error) ||
          'Commit failed.';
        setWorkspaceError(errorMessage);
        showMessage('error', errorMessage);
      }
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      console.error('Failed to commit changes:', error);
      const fallback = 'Commit could not be completed.';
      setWorkspaceError(fallback);
      showMessage('error', fallback);
    } finally {
      setActionLoading(false);
    }
  };

  const pushChanges = async () => {
    if (pushState.status === 'running') {
      return;
    }

    const branch = gitStatus?.branch || DEFAULT_BRANCH;
    setActionLoading(true);
    setWorkspaceError(null);
    setPushState({
      status: 'running',
      logs: [`${branch} branch push started...`],
      metadata: { branch, remote: 'origin', commit: null }
    });
    logPushEvent('Preparing local changes...');

    try {
      const response = await fetch(
        '/api/ai/git/push',
        withAdminHeaders({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(withRepo({ remote: 'origin', branch }))
        })
      );

      let payload: Record<string, any> | null = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok || (payload && payload.success === false)) {
        const errorMessage =
          (payload && typeof payload.error === 'string' && payload.error) ||
          'Push failed.';
        logPushEvent(errorMessage);
        setPushState((prev) => ({ ...prev, status: 'error' }));
        setWorkspaceError(errorMessage);
        showMessage('error', errorMessage);
        return;
      }

      const metadata = {
        branch: (payload && payload.branch) || branch,
        remote: (payload && payload.remote) || 'origin',
        commit: payload && typeof payload.commit === 'string' ? payload.commit : null
      };
      const remoteMessage = (payload && payload.message) || 'Push finished.';
      logPushEvent(remoteMessage);
      setPushState((prev) => ({ ...prev, status: 'success', metadata }));
      showMessage('success', remoteMessage);

      await loadGitStatus();
      const latestCommits = await loadCommitHistory();
      const latestCommit = Array.isArray(latestCommits) && latestCommits.length > 0
        ? latestCommits[0]
        : undefined;
      if (latestCommit && !metadata.commit) {
        setPushState((prev) => ({
          ...prev,
          metadata: {
            ...prev.metadata,
            commit: latestCommit.hash,
          }
        }));
      }
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      console.error('Failed to push changes:', error);
      const fallback = 'Push to GitHub failed.';
      logPushEvent(fallback);
      setPushState((prev) => ({ ...prev, status: 'error' }));
      setWorkspaceError(fallback);
      showMessage('error', fallback);
    } finally {
      setActionLoading(false);
    }
  };

const uploadWorkspaceArchive = useCallback(
    async (file: File) => {
      if (!isLocalRepo) {
        const message = 'ZIP upload is available only for the local workspace.';
        setZipUploadState({ status: 'error', message });
        setWorkspaceError(message);
        return;
      }

      setZipUploadState({ status: 'running', message: `${file.name} is uploading...` });
      setWorkspaceError(null);

      try {
        const formData = new FormData();
        formData.append('archive', file);
        formData.append('repo', resolveRepoValue());

        const response = await fetch(
          '/api/ai/workspace/upload',
          withAdminHeaders({
            method: 'POST',
            body: formData
          })
        );

        let payload: Record<string, any> | null = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        if (!response.ok || (payload && payload.success === false)) {
          const errorMessage =
            (payload && typeof payload.error === 'string' && payload.error) ||
            'ZIP upload failed.';
          setZipUploadState({ status: 'error', message: errorMessage });
          setWorkspaceError(errorMessage);
          showMessage('error', errorMessage);
          return;
        }

        setZipUploadState({ status: 'success', message: `${file.name} uploaded and workspace refreshed.` });
        showMessage('success', 'Workspace files refreshed successfully.');
        await loadGitStatus();
        refetch();
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        console.error('Failed to upload workspace ZIP:', error);
        const fallback = 'ZIP upload failed.';
        setZipUploadState({ status: 'error', message: fallback });
        setWorkspaceError(fallback);
        showMessage('error', fallback);
      }
    },
    [isLocalRepo, loadGitStatus, refetch, resolveRepoValue, showMessage],
  );

  const handleZipInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      if (event.target) {
        event.target.value = '';
      }
      if (!file) {
        return;
      }
      uploadWorkspaceArchive(file);
    },
    [uploadWorkspaceArchive],
  );
  const createFeatureBranch = async () => {
    if (!newBranchName.trim()) {
      showMessage('error', 'Branch name áƒáƒ£áƒªáƒ˜áƒšáƒ”áƒ‘áƒ”áƒšáƒ˜áƒ');
      return;
    }

    try {
      const response = await fetch(
        '/api/ai/github/branches/feature',
        withAdminHeaders({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(withRepo({ featureName: newBranchName }))
        })
      );

      if (response.ok) {
        showMessage('success', 'Feature branch áƒ¨áƒ”áƒ¥áƒ›áƒœáƒ˜áƒšáƒ˜ áƒ¬áƒáƒ áƒ›áƒáƒ¢áƒ”áƒ‘áƒ˜áƒ—');
        setNewBranchName('');
        setShowCreateBranch(false);
        loadBranches();
      } else {
        showMessage('error', 'Branch áƒ¨áƒ”áƒ¥áƒ›áƒœáƒ˜áƒ¡ áƒ¨áƒ”áƒªáƒ“áƒáƒ›áƒ');
      }
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      console.error('Failed to create feature branch:', error);
      showMessage('error', 'Branch áƒ¨áƒ”áƒ¥áƒ›áƒœáƒ˜áƒ¡ áƒ¨áƒ”áƒªáƒ“áƒáƒ›áƒ');
    }
  };

  const switchBranch = async (branchName: string) => {
    try {
      const response = await fetch(
        '/api/ai/github/branches/switch',
        withAdminHeaders({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(withRepo({ targetBranch: branchName }))
        })
      );

      if (response.ok) {
        showMessage('success', `${branchName}-áƒ–áƒ” áƒ’áƒáƒ“áƒáƒ áƒ—áƒ£áƒšáƒ˜áƒ`);
        loadBranches();
        loadGitStatus();
        refetch();
      } else {
        showMessage('error', 'Branch switching áƒ¨áƒ”áƒªáƒ“áƒáƒ›áƒ');
      }
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      console.error('Failed to switch branch:', error);
      showMessage('error', 'Branch switching áƒ¨áƒ”áƒªáƒ“áƒáƒ›áƒ');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'added': return <Plus className="text-green-500" size={16} />;
      case 'modified': return <Edit className="text-blue-500" size={16} />;
      case 'deleted': return <Minus className="text-red-500" size={16} />;
      case 'untracked': return <FileText className="text-gray-500" size={16} />;
      case 'conflict': return <AlertTriangle className="text-orange-500" size={16} />;
      default: return <FileText className="text-gray-500" size={16} />;
    }
  };

  const getDiffLineClass = (type: string) => {
    switch (type) {
      case 'added': return 'bg-green-100 dark:bg-green-900 dark:bg-opacity-20 text-green-800 dark:text-green-200';
      case 'removed': return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200';
      default: return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ka-GE');
  };

  const renderWorkspaceView = () => {
    const pushProgress = pushState.status === 'success'
      ? 100
      : pushState.status === 'error'
        ? 100
        : pushState.status === 'running'
          ? 65
          : 0;
    const pushBarColor = pushState.status === 'success'
      ? 'bg-green-500'
      : pushState.status === 'error'
        ? 'bg-red-500'
        : 'bg-blue-500';
    const disableGitActions = Boolean(
      actionLoading || zipUploadState.status === 'running' || pushState.status === 'running'
    );

    return (
      <div className="space-y-6">
        {workspaceError && (
          <div className="rounded border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {workspaceError}
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <GitBranch size={20} />
              Git Workspace
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 border border-gray-700 rounded-full px-3 py-1">
                {repoValue === 'local' ? 'Local workspace' : repoValue}
              </span>
              <button
                onClick={loadGitStatus}
                disabled={actionLoading}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-50"
              >
                <RefreshCw size={16} className={actionLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {workspaceMeta?.path && (
            <div className="text-xs text-gray-400 mb-4">
              Active path:
              <span className="font-mono text-gray-200 ml-2">{workspaceMeta.path}</span>
              {workspaceMeta?.type && (
                <span className="ml-2 text-gray-500">{workspaceMeta.type}</span>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-sm text-gray-400">Current branch</div>
              <div className="text-lg font-medium">{gitStatus?.branch || 'main'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Working tree</div>
              <div className={`text-lg font-medium ${gitStatus?.clean ? 'text-green-400' : 'text-orange-400'}`}>
                {gitStatus?.clean ? 'Clean' : `${gitStatusFiles.length} changes`}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={pushChanges}
              disabled={Boolean(gitStatus?.clean) || disableGitActions}
              className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 disabled:cursor-not-allowed"
            >
              <Upload size={16} />
              Push to GitHub
            </button>
          </div>

          {pushState.status !== 'idle' && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>
                  {pushState.status === 'running'
                    ? 'Pushing changes to remote...'
                    : pushState.status === 'success'
                      ? 'Push completed'
                      : 'Push failed'}
                </span>
                <div className="text-right text-gray-300 space-x-3">
                  {pushState.metadata?.branch && <span>Branch: {pushState.metadata.branch}</span>}
                  {pushState.metadata?.commit && <span>Commit: {pushState.metadata.commit}</span>}
                </div>
              </div>
              <div className="h-2 rounded bg-gray-700 overflow-hidden">
                <div className={`h-full ${pushBarColor}`} style={{ width: `${pushProgress}%` }} />
              </div>
              <div className="max-h-32 overflow-auto rounded bg-gray-900/70 p-2 text-xs font-mono text-gray-100 space-y-1">
                {pushState.logs.map((line, index) => (
                  <div key={index}>{line}</div>
                ))}
              </div>
            </div>
          )}

          {isLocalRepo && (
            <div className="mt-6 border-t border-gray-700 pt-4">
              <h4 className="text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
                <Upload size={14} />
                Upload ZIP to local workspace
              </h4>
              <p className="text-xs text-gray-400 mb-3">
                Replace the local workspace by uploading a zipped snapshot of your project.
              </p>
              <label className="inline-flex items-center gap-2 rounded border border-dashed border-gray-600 px-4 py-2 text-sm text-gray-200 hover:border-gray-400 cursor-pointer">
                <input
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={handleZipInputChange}
                  disabled={zipUploadState.status === 'running'}
                />
                <Upload size={14} />
                {zipUploadState.status === 'running' ? 'Uploading...' : 'Select ZIP archive'}
              </label>
              {zipUploadState.message && (
                <p className={`mt-2 text-xs ${zipUploadState.status === 'error' ? 'text-red-300' : zipUploadState.status === 'success' ? 'text-green-300' : 'text-gray-400'}`}>
                  {zipUploadState.message}
                </p>
              )}
            </div>
          )}
        </div>

        {gitStatus && gitStatusFiles.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Changed files</h3>

            <div className="space-y-2 mb-4">
              {gitStatusFiles.map((file) => (
                <div
                  key={file.path}
                  className="flex items-center justify-between p-2 bg-gray-700 rounded"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(file.status)}
                    <span className="font-mono text-sm">{file.path}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      file.staged ? 'bg-green-900 text-green-300' : 'bg-gray-600 text-gray-300'
                    }`}>
                      {file.staged ? 'Staged' : 'Modified'}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {!file.staged ? (
                      <button
                        onClick={() => stageFiles([file.path])}
                        disabled={disableGitActions}
                        className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                      >
                        Stage
                      </button>
                    ) : (
                      <button
                        onClick={() => stageFiles([file.path], 'unstage')}
                        disabled={disableGitActions}
                        className="px-2 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 disabled:opacity-50"
                      >
                        Unstage
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-600 pt-4">
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Describe the commit..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 mb-2"
                rows={3}
                disabled={disableGitActions}
              />
              <button
                onClick={commitChanges}
                disabled={!commitMessage.trim() || disableGitActions}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <GitCommit size={16} />
                Commit changes
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };
const renderHistoryView = () => (
    <div className="space-y-6">
      {/* Commit History */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock size={20} />
          Commit áƒ˜áƒ¡áƒ¢áƒáƒ áƒ˜áƒ
        </h3>

        <div className="space-y-3">
          {commits.map((commit) => (
            <div key={commit.hash} className="border-l-4 border-blue-500 pl-4 py-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-blue-400">{commit.hash}</span>
                  {commit.isMerge && (
                    <span className="px-2 py-1 bg-purple-900 text-purple-300 text-xs rounded">
                      MERGE
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setExpandedCommit(
                    expandedCommit === commit.hash ? null : commit.hash
                  )}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  {expandedCommit === commit.hash ?
                    <ChevronUp size={16} /> : <ChevronDown size={16} />
                  }
                </button>
              </div>

              <div className="text-white font-medium mb-1">{commit.message}</div>

              <div className="flex items-center gap-2 text-xs text-gray-400">
                <User size={12} />
                <span>{commit.author}</span>
                <span>â€¢</span>
                <span>{commit.date.toLocaleDateString()}</span>
                <span>â€¢</span>
                <span>{commit.date.toLocaleTimeString()}</span>
              </div>

              {expandedCommit === commit.hash && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <div className="text-sm text-gray-300">
                    Full Hash: <span className="font-mono">{commit.fullHash}</span>
                  </div>
                  <div className="text-sm text-gray-300">
                    Email: {commit.email}
                  </div>
                  {Array.isArray(commit.parents) && commit.parents.length > 0 && (
                    <div className="text-sm text-gray-300">
                      Parents: {(commit.parents ?? []).map(p => p.substring(0, 8)).join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderBranchesView = () => (
    <div className="space-y-6">
      {/* Branch Management */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold flex items-center gap-2">
            <GitBranch size={18} />
            Branches
          </h4>
          <button
            onClick={() => setShowCreateBranch(!showCreateBranch)}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
          >
            <Plus size={14} />
            áƒáƒ®áƒáƒšáƒ˜ Feature
          </button>
        </div>

        {/* Create Branch Form */}
        {showCreateBranch && (
          <div className="mb-4 p-4 bg-gray-700 rounded-lg">
            <div className="flex gap-3">
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="feature name (e.g., user-authentication)"
                className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400"
              />
              <button
                onClick={createFeatureBranch}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                áƒ¨áƒ”áƒ¥áƒ›áƒœáƒ
              </button>
              <button
                onClick={() => setShowCreateBranch(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                áƒ’áƒáƒ£áƒ¥áƒ›áƒ”áƒ‘áƒ
              </button>
            </div>
          </div>
        )}

        {/* Branches List */}
        <div className="space-y-3">
          {localBranches.map((branch) => (
            <div
              key={branch.name}
              className={`flex items-center justify-between p-3 rounded-lg ${
                branch.current ? 'bg-blue-900/30 border border-blue-600' : 'bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">ðŸŒ¿</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${branch.current ? 'text-blue-400' : 'text-white'}`}>
                      {branch.name}
                    </span>
                    {branch.current && (
                      <span className="px-2 py-1 bg-blue-600 text-blue-100 text-xs rounded">
                        CURRENT
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400">
                    local
                    {(branch.ahead || branch.behind) && (
                      <span className="ml-2">
                        {branch.ahead ? `â†‘${branch.ahead}` : ''}
                        {branch.behind ? `â†“${branch.behind}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!branch.current && (
                <button
                  onClick={() => switchBranch(branch.name)}
                  className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-500 text-sm"
                >
                  Switch
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFilesTab = () => (
    <div className="space-y-6">
      {/* File History Section */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText size={18} />
          File History & Version Control
        </h4>

        {/* Recent Files Quick Access */}
        <div className="mb-4">
          <div className="text-sm text-gray-400 mb-2">áƒáƒ®áƒšáƒáƒ®áƒáƒœ áƒ¨áƒ”áƒªáƒ•áƒšáƒ˜áƒšáƒ˜ áƒ¤áƒáƒ˜áƒšáƒ”áƒ‘áƒ˜:</div>
          <div className="flex flex-wrap gap-2">
            {recentFiles.slice(0, 8).map((file) => (
              <button
                key={file}
                onClick={() => loadFileHistory(file)}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                {file.split('/').pop()}
              </button>
            ))}
          </div>
        </div>

        {/* File Path Input */}
        <div className="mb-4">
          <input
            type="text"
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
            placeholder="áƒ¤áƒáƒ˜áƒšáƒ˜áƒ¡ path (áƒ›áƒáƒ’: src/components/Header.tsx)"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
          />
          <button
            onClick={() => selectedFile && loadFileHistory(selectedFile)}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            áƒ˜áƒ¡áƒ¢áƒáƒ áƒ˜áƒ˜áƒ¡ áƒ©áƒáƒ¢áƒ•áƒ˜áƒ áƒ—áƒ•áƒ
          </button>
        </div>

        {/* File Versions */}
        {fileVersions.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-300">
              áƒ¤áƒáƒ˜áƒšáƒ˜: {selectedFile} - {fileVersions.length} áƒ•áƒ”áƒ áƒ¡áƒ˜áƒ
            </div>

            {fileVersions.map((version, index) => (
              <div
                key={version.hash}
                className="bg-gray-700 rounded-lg p-4 border border-gray-600"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                      #{index + 1}
                    </span>
                    <span className="font-mono text-sm text-gray-300">
                      {version.hash.substring(0, 8)}
                    </span>
                    <span className="text-sm text-gray-400">
                      {version.author}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {index < fileVersions.length - 1 && (
                      <button
                        onClick={() => loadDiff(version.hash, fileVersions[index + 1].hash, selectedFile)}
                        className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 flex items-center gap-1"
                      >
                        <Eye size={14} />
                        Diff
                      </button>
                    )}

                    <button
                      onClick={() => rollbackToVersion(selectedFile, version.hash)}
                      disabled={rollbackLoading === version.hash}
                      className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      <RotateCcw size={14} className={rollbackLoading === version.hash ? 'animate-spin' : ''} />
                      Rollback
                    </button>
                  </div>
                </div>

                <div className="text-sm text-gray-300 mb-2">{version.message}</div>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{formatTimestamp(version.timestamp)}</span>
                  <span>{version.size} bytes</span>
                  {version.changes.added > 0 && (
                    <span className="text-green-400">+{version.changes.added}</span>
                  )}
                  {version.changes.deleted > 0 && (
                    <span className="text-red-400">-{version.changes.deleted}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (!isDataLoaded) {
    return (
      <EmptyState
        icon={Clock}
        title="Loading GitOpsâ€¦"
        description="Fetching the latest GitHub automation data."
      />
    );
  }

  if (reposFromHook.length === 0) {
    return (
      <EmptyState
        icon={GitBranch}
        title="No repositories"
        description="Connect GitHub or add a repository to continue."
      />
    );
  }

  const isFetching = Boolean(isLoading || hubLoading);

  if (isFetching) {
    return (
      <div className="h-full bg-gray-900 text-white p-6">
        <div className="space-y-4 animate-pulse">
          <div className="h-9 bg-gray-800 rounded" />
          <div className="h-32 bg-gray-800 rounded" />
          <div className="h-32 bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 text-white p-6">
      {error && (
        <div className="mb-4 rounded border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Zap size={24} className="text-yellow-500" />
          Git Operations & Version Control
        </h2>

        <div className="flex items-center gap-2">
          {gitStatus && (
            <div className={`px-3 py-1 rounded text-sm ${
              gitStatus.clean ? 'bg-green-900 text-green-300' : 'bg-orange-900 text-orange-300'
            }`}>
              {gitStatus.clean ? 'Repository áƒ¡áƒ£áƒ¤áƒ—áƒáƒ' : `${gitStatusFiles.length} áƒªáƒ•áƒšáƒ˜áƒšáƒ”áƒ‘áƒ`}
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3 text-xs text-gray-400">
        <span>PRs: {normalizedStats.prs}</span>
        <span>Issues: {normalizedStats.issues}</span>
        <span>Stars: {normalizedStats.stars}</span>
        <span>Forks: {normalizedStats.forks}</span>
        <span>Repos: {hookCounts.repos}</span>
        <span>Workflows: {hookCounts.workflows}</span>
        <span>Branches: {hookCounts.branches}</span>
        <span>Commits: {commitCount}</span>
        {hubLoading && <span className="text-blue-300">Refreshingâ€¦</span>}
        {hubStatus?.branch && <span>Active Hub Branch: {hubStatus.branch}</span>}
      </div>

      {/* Sub Navigation */}
      <div className="bg-gray-800 border-b border-gray-700 mb-6 rounded-t-lg">
        <div className="flex">
          {tabDefinitions.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key)}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                activeSubTab === tab.key
                  ? 'border-blue-500 bg-blue-900/20 text-blue-400'
                  : 'border-transparent hover:bg-gray-700 text-gray-300 hover:text-white'
              }`}
              title={tab.desc}
            >
              <tab.icon size={16} />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {activeSubTab === 'workspace' && renderWorkspaceView()}
        {activeSubTab === 'history' && renderHistoryView()}
        {activeSubTab === 'branches' && renderBranchesView()}
        {activeSubTab === 'files' && renderFilesTab()}
      </div>

      {/* Visual Diff Viewer Modal */}
      {showDiffViewer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold flex items-center gap-2">
                <Code size={18} />
                Visual Diff: {selectedFile}
              </h4>
              <button
                onClick={() => setShowDiffViewer(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                áƒ“áƒáƒ®áƒ£áƒ áƒ•áƒ
              </button>
            </div>

            <div className="mb-4 text-sm text-gray-400">
              Comparing {selectedFromVersion.substring(0, 8)} â†’ {selectedToVersion.substring(0, 8)}
            </div>

            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm max-h-96 overflow-auto">
              {diffData.map((line, index) => (
                <div
                  key={index}
                  className={`px-2 py-1 ${getDiffLineClass(line.type)} border-l-4 ${
                    line.type === 'added' ? 'border-green-500' :
                    line.type === 'removed' ? 'border-red-500' : 'border-gray-500'
                  }`}
                >
                  <span className="text-gray-500 w-12 inline-block">
                    {line.lineNumber}
                  </span>
                  <span className="ml-2">
                    {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                    {line.content}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GitHubGitOpsTab;












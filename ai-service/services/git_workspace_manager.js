const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const axios = require('axios');
const AdmZip = require('adm-zip');

const DEFAULT_LOCAL_PATH =
  process.env.LOCAL_REPO_ROOT ||
  (process.platform === 'win32'
    ? 'D:\\GitHub\\ai-bakhmaro'
    : path.resolve(__dirname, '..'));

const CACHE_ROOT =
  process.env.GITHUB_WORKSPACES_ROOT ||
  path.join(os.tmpdir(), 'github-workspaces');

const GITHUB_API_URL = process.env.GITHUB_API_URL || 'https://api.github.com';

const ensureDir = async (target) => {
  await fsp.mkdir(target, { recursive: true });
};

const pathExists = async (target) => {
  try {
    await fsp.access(target, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const sanitizeRepoParam = (input) => {
  if (!input || input === 'local') {
    return { type: 'local', repo: 'local', path: DEFAULT_LOCAL_PATH };
  }

  const trimmed = String(input).trim();
  const match = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (!match) {
    throw new Error('Invalid repo format. Use "owner/name" or "local".');
  }

  return {
    type: 'remote',
    repo: `${match[1]}/${match[2]}`,
    owner: match[1],
    name: match[2],
  };
};

const runGit = (args, cwd) =>
  new Promise((resolve, reject) => {
    const child = spawn('git', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
      },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Git command failed (code ${code}): ${stderr || stdout}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });

const buildAuthArgs = () => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN is not configured for remote repository access');
  }
  return ['-c', `http.extraheader=Authorization: Bearer ${token}`];
};

const fetchRepositoryMetadata = async (owner, name) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN is required to query GitHub repositories');
  }

  const response = await axios.get(`${GITHUB_API_URL}/repos/${owner}/${name}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'Gurulo-AI-Workspace',
      Accept: 'application/vnd.github+json',
    },
  });

  return response.data;
};

const cloneRepository = async (owner, name, targetPath) => {
  await ensureDir(CACHE_ROOT);
  await ensureDir(path.dirname(targetPath));

  const repoUrl = `https://github.com/${owner}/${name}.git`;
  const args = [...buildAuthArgs(), 'clone', repoUrl, targetPath];
  await runGit(args, CACHE_ROOT);
};

const refreshRepository = async (repoPath, owner, name) => {
  const authArgs = buildAuthArgs();
  await runGit([...authArgs, 'fetch', 'origin', '--prune'], repoPath);

  try {
    const metadata = await fetchRepositoryMetadata(owner, name);
    if (metadata?.default_branch) {
      await runGit(['checkout', metadata.default_branch], repoPath);
      await runGit(['reset', '--hard', `origin/${metadata.default_branch}`], repoPath);
    }
  } catch (error) {
    console.warn('�s��,? Failed to synchronize default branch metadata:', error.message);
  }
};

const ensureWorkspace = async (repoParam = 'local', options = {}) => {
  const descriptor = sanitizeRepoParam(repoParam);

  if (descriptor.type === 'local') {
    await ensureDir(DEFAULT_LOCAL_PATH);
    return { ...descriptor, path: DEFAULT_LOCAL_PATH };
  }

  const repoPath = path.join(CACHE_ROOT, descriptor.owner, descriptor.name);
  const gitDir = path.join(repoPath, '.git');
  const exists = await pathExists(gitDir);

  if (!exists) {
    await cloneRepository(descriptor.owner, descriptor.name, repoPath);
  } else if (options.refresh !== false) {
    await refreshRepository(repoPath, descriptor.owner, descriptor.name);
  }

  return { ...descriptor, path: repoPath };
};

const listCachedRepositories = async () => {
  if (!(await pathExists(CACHE_ROOT))) {
    return [];
  }

  const owners = await fsp.readdir(CACHE_ROOT);
  const repositories = [];

  for (const owner of owners) {
    const ownerDir = path.join(CACHE_ROOT, owner);
    const stats = await fsp.lstat(ownerDir);
    if (!stats.isDirectory()) continue;

    const repos = await fsp.readdir(ownerDir);
    for (const name of repos) {
      const repoDir = path.join(ownerDir, name);
      const gitDir = path.join(repoDir, '.git');
      if (await pathExists(gitDir)) {
        repositories.push({
          owner,
          name,
          path: repoDir,
        });
      }
    }
  }

  return repositories;
};

const cleanDirectory = async (targetPath, options = {}) => {
  const entries = await fsp.readdir(targetPath).catch(() => []);
  for (const entry of entries) {
    if (options.preserveGit && entry === '.git') {
      continue;
    }
    await fsp.rm(path.join(targetPath, entry), { recursive: true, force: true });
  }
};

const replaceLocalWorkspaceFromZip = async (buffer, options = {}) => {
  await ensureDir(DEFAULT_LOCAL_PATH);
  await cleanDirectory(DEFAULT_LOCAL_PATH, { preserveGit: options.preserveGit !== false });

  const zip = new AdmZip(buffer);
  zip.extractAllTo(DEFAULT_LOCAL_PATH, true);

  return {
    path: DEFAULT_LOCAL_PATH,
    bytes: buffer.length,
    extractedAt: new Date().toISOString(),
  };
};

module.exports = {
  ensureWorkspace,
  listCachedRepositories,
  replaceLocalWorkspaceFromZip,
  getLocalRoot: () => DEFAULT_LOCAL_PATH,
  getCacheRoot: () => CACHE_ROOT,
};

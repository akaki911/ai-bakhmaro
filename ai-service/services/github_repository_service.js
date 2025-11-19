const axios = require('axios');

const API_BASE = process.env.GITHUB_API_URL || 'https://api.github.com';

const requireToken = () => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN is not configured');
  }
  return token;
};

const listRepositories = async ({ perPage = 50, page = 1 } = {}) => {
  const token = requireToken();
  const safePerPage = Math.min(Math.max(perPage, 1), 100);
  const safePage = Math.max(page, 1);

  const response = await axios.get(`${API_BASE}/user/repos`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'Gurulo-AI-GitHub',
      Accept: 'application/vnd.github+json',
    },
    params: {
      per_page: safePerPage,
      page: safePage,
      affiliation: 'owner,collaborator,organization_member',
      sort: 'updated',
      direction: 'desc',
    },
  });

  return response.data.map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    private: repo.private,
    owner: repo.owner?.login,
    description: repo.description,
    defaultBranch: repo.default_branch,
    updatedAt: repo.updated_at,
    cloneUrl: repo.clone_url,
    sshUrl: repo.ssh_url,
  }));
};

module.exports = {
  listRepositories,
};
